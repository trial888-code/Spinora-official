"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  AdminActionResult,
  adminDb,
  authorize,
  writeAudit,
} from "@/lib/actions/admin/core";
import { adminLink, tgEsc, tgNotify } from "@/lib/telegram";

export async function setBanAction(input: {
  userId: string;
  banned: boolean;
  reason?: string;
}): Promise<AdminActionResult> {
  const auth = await authorize("users.manage");
  if ("error" in auth) return { ok: false, error: auth.error };

  const db = adminDb();
  const { data: before } = await db
    .from("profiles")
    .select("*")
    .eq("id", input.userId)
    .maybeSingle();

  let { error } = await db
    .from("profiles")
    .update({
      is_suspended: input.banned,
      is_banned: input.banned,
      status: input.banned ? "banned" : "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.userId);

  if (error && /column.*schema cache|does not exist/i.test(error.message)) {
    const res = await db
      .from("profiles")
      .update({ is_suspended: input.banned })
      .eq("id", input.userId);
    error = res.error;
  }

  if (error) {
    console.error("setBanAction error:", error);
    return { ok: false, error: `Could not ban/unban member: ${error.message}` };
  }

  await writeAudit({
    actorId: auth.staff.userId,
    action: input.banned ? "user.ban" : "user.unban",
    entityType: "profile",
    entityId: input.userId,
    before,
    after: { is_suspended: input.banned, reason: input.reason ?? null },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${input.userId}`);
  return { ok: true, message: input.banned ? "Member banned successfully." : "Member reinstated successfully." };
}

export async function deleteUserAccountAction(userId: string): Promise<AdminActionResult> {
  const auth = await authorize("users.delete");
  if ("error" in auth) return { ok: false, error: auth.error };
  if (userId === auth.staff.userId) {
    return { ok: false, error: "You can't delete your own account." };
  }

  const db = adminDb();
  const { data: before } = await db.from("profiles").select("*").eq("id", userId).maybeSingle();

  // Delete foreign keys first
  try { await db.from("wallet_transactions").delete().eq("user_id", userId); } catch {}
  try { await db.from("deposit_requests").delete().eq("user_id", userId); } catch {}
  try { await db.from("activity_log").delete().eq("user_id", userId); } catch {}
  try { await db.from("support_tickets").delete().eq("user_id", userId); } catch {}
  try { await db.from("user_roles").delete().eq("user_id", userId); } catch {}
  try {
    await db.from("referrals").delete().eq("referrer_id", userId);
    await db.from("referrals").delete().eq("referred_id", userId);
  } catch {}

  const { error: profileErr } = await db.from("profiles").delete().eq("id", userId);

  try {
    await db.auth.admin.deleteUser(userId);
  } catch (e) {
    console.warn("Auth user deletion notice:", (e as Error).message);
  }

  if (profileErr) {
    return { ok: false, error: `Could not delete account profile: ${profileErr.message}` };
  }

  await writeAudit({
    actorId: auth.staff.userId,
    action: "user.delete",
    entityType: "profile",
    entityId: userId,
    before,
  });

  revalidatePath("/admin/users");
  return { ok: true, message: "Account permanently deleted from system." };
}

const adjustSchema = z.object({
  userId: z.string().uuid(),
  currency: z.enum(["coins", "xp"]),
  amount: z.number().int().refine((n) => n !== 0, "Amount can't be zero"),
  note: z.string().trim().optional().default("Admin manual adjustment"),
});

export async function adjustBalanceAction(input: {
  userId: string;
  currency: "coins" | "xp";
  amount: number;
  note?: string;
}): Promise<AdminActionResult> {
  const auth = await authorize("users.manage");
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = adjustSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const db = adminDb();
  const isCoins = parsed.data.currency === "coins";
  const primaryField = isCoins ? "bonus_wallet" : "vip_points";

  const { data: profile } = await db
    .from("profiles")
    .select("*")
    .eq("id", parsed.data.userId)
    .single();

  const pData = (profile as Record<string, unknown>) ?? {};
  const currentVal = Number(pData[primaryField] ?? pData["coins_balance"] ?? 0);
  const newVal = Math.max(0, currentVal + parsed.data.amount);

  const updatePayload: Record<string, unknown> = { [primaryField]: newVal };
  if (isCoins && "coins_balance" in pData) {
    updatePayload["coins_balance"] = newVal;
  }

  const { error } = await db
    .from("profiles")
    .update(updatePayload)
    .eq("id", parsed.data.userId);

  if (error) {
    return {
      ok: false,
      error: `Adjustment failed: ${error.message}`,
    };
  }

  try {
    await db.from("wallet_transactions").insert({
      user_id: parsed.data.userId,
      amount: Math.abs(parsed.data.amount),
      wallet_type: isCoins ? "bonus" : "xp",
      transaction_type: parsed.data.amount > 0 ? "credit" : "debit",
      source: "admin_adjustment",
      description: `Admin adjustment (${parsed.data.amount > 0 ? "+" : ""}${parsed.data.amount} ${isCoins ? "Coins" : "XP"}): ${parsed.data.note}`,
    });

    await db.from("activity_log").insert({
      user_id: parsed.data.userId,
      action: isCoins ? "reward_claimed" : "level_up",
      description: `Admin adjustment: ${parsed.data.amount > 0 ? "+" : ""}${parsed.data.amount} ${isCoins ? "Coins" : "XP"}`,
      metadata: { coins: isCoins ? parsed.data.amount : 0, xp: !isCoins ? parsed.data.amount : 0, note: parsed.data.note },
    });
  } catch {}

  await writeAudit({
    actorId: auth.staff.userId,
    action: "user.balance_adjust",
    entityType: "profile",
    entityId: parsed.data.userId,
    after: {
      currency: parsed.data.currency,
      amount: parsed.data.amount,
      note: parsed.data.note,
    },
  });

  revalidatePath(`/admin/users/${parsed.data.userId}`);
  revalidatePath("/admin/users");
  revalidatePath("/admin/transactions");
  revalidatePath("/dashboard/activity");
  return { ok: true, message: "Balance adjusted." };
}

const walletSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().refine((n) => n !== 0, "Amount can't be zero"),
  note: z.string().trim().optional().default("Admin manual adjustment"),
});

export async function adjustWalletAction(input: {
  userId: string;
  amount: number;
  note?: string;
}): Promise<AdminActionResult> {
  const auth = await authorize("users.manage");
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = walletSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const db = adminDb();
  const credit = parsed.data.amount > 0;

  const { data: profile, error: fetchErr } = await db
    .from("profiles")
    .select("wallet_balance")
    .eq("id", parsed.data.userId)
    .single();

  if (fetchErr) return { ok: false, error: `Could not find member profile: ${fetchErr.message}` };

  const currentBal = Number(profile?.wallet_balance ?? 0);
  const newBal = Math.max(0, currentBal + parsed.data.amount);

  let { error: updateErr } = await db.rpc("admin_adjust_user_wallet", {
    p_user_id: parsed.data.userId,
    p_wallet_balance: newBal,
  });

  if (updateErr) {
    const fallback = await db.from("profiles").update({ wallet_balance: newBal }).eq("id", parsed.data.userId);
    updateErr = fallback.error;
  }

  if (updateErr) return { ok: false, error: `Wallet update failed: ${updateErr.message}` };

  try {
    await db.from("wallet_transactions").insert({
      user_id: parsed.data.userId,
      amount: Math.abs(parsed.data.amount),
      wallet_type: "cash",
      transaction_type: credit ? "credit" : "debit",
      source: "admin_adjustment",
      description: `Admin wallet ${credit ? "credit" : "debit"} ($${Math.abs(parsed.data.amount).toFixed(2)}): ${parsed.data.note}`,
    });
  } catch {}

  await writeAudit({
    actorId: auth.staff.userId,
    action: "user.wallet_adjust",
    entityType: "profile",
    entityId: parsed.data.userId,
    after: { amount: parsed.data.amount, newBalance: newBal, note: parsed.data.note },
  });

  revalidatePath(`/admin/users/${parsed.data.userId}`);
  revalidatePath("/admin/users");
  revalidatePath("/admin/transactions");
  revalidatePath("/dashboard/activity");
  return { ok: true, message: credit ? `✅ Credited $${Math.abs(parsed.data.amount).toFixed(2)} to wallet.` : `✅ Debited $${Math.abs(parsed.data.amount).toFixed(2)} from wallet.` };
}

const payoutSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().refine((n) => n !== 0, "Amount can't be zero"),
  note: z.string().trim().optional().default("Admin cashout payout"),
});

export async function recordCashoutPayoutAction(input: {
  userId: string;
  amount: number;
  note?: string;
}): Promise<AdminActionResult> {
  const auth = await authorize("users.manage");
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = payoutSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const db = adminDb();
  const payoutAmt = Math.abs(parsed.data.amount);

  const { data: profile, error: fetchErr } = await db
    .from("profiles")
    .select("wallet_balance, cashout_wallet")
    .eq("id", parsed.data.userId)
    .single();

  if (fetchErr) return { ok: false, error: `Could not find member profile: ${fetchErr.message}` };

  const currentBal = Number(profile?.wallet_balance ?? 0);
  const currentCashout = Number(profile?.cashout_wallet ?? 0);

  const newBal = Math.max(0, currentBal - payoutAmt);
  const newCashout = currentCashout + payoutAmt;

  let { error: updateErr } = await db.rpc("admin_adjust_user_wallet", {
    p_user_id: parsed.data.userId,
    p_wallet_balance: newBal,
    p_cashout_wallet: newCashout,
  });

  if (updateErr) {
    const fallback = await db
      .from("profiles")
      .update({ wallet_balance: newBal, cashout_wallet: newCashout })
      .eq("id", parsed.data.userId);
    updateErr = fallback.error;
  }

  if (updateErr) return { ok: false, error: `Redeem payout failed: ${updateErr.message}` };

  try {
    await db.from("wallet_transactions").insert({
      user_id: parsed.data.userId,
      amount: payoutAmt,
      wallet_type: "cashout",
      transaction_type: "debit",
      source: "admin_cashout_payout",
      description: `Redeem Payout processed (-$${payoutAmt.toFixed(2)}): ${parsed.data.note}`,
    });

    await db.from("activity_log").insert({
      user_id: parsed.data.userId,
      action: "cashout_payout",
      description: `Redeem Payout processed: -$${payoutAmt.toFixed(2)}`,
      metadata: { amount: payoutAmt, note: parsed.data.note },
    });
  } catch {}

  await writeAudit({
    actorId: auth.staff.userId,
    action: "user.cashout_payout",
    entityType: "profile",
    entityId: parsed.data.userId,
    after: { amount: payoutAmt, newWalletBalance: newBal, newCashoutTotal: newCashout, note: parsed.data.note ?? null },
  });

  revalidatePath(`/admin/users/${parsed.data.userId}`);
  revalidatePath("/admin/users");
  revalidatePath("/admin/transactions");
  revalidatePath("/dashboard/activity");
  return { ok: true, message: `✅ Redeemed $${payoutAmt.toFixed(2)} — Wallet balance is now $${newBal.toFixed(2)}.` };
}

export async function setUserRolesAction(input: {
  userId: string;
  roleKeys: string[];
}): Promise<AdminActionResult> {
  const auth = await authorize("users.manage");
  if ("error" in auth) return { ok: false, error: auth.error };

  const db = adminDb();
  const primaryRole = input.roleKeys.includes("admin") || input.roleKeys.includes("super_admin") ? "admin" : "customer";

  const { error: profileRoleErr } = await db.from("profiles").update({ role: primaryRole }).eq("id", input.userId);

  try {
    const { data: roles } = await db.from("roles").select("id, key");
    if (roles && roles.length > 0) {
      const roleMap = new Map((roles ?? []).map((r) => [r.key, r.id]));

      const targetRoleIds = input.roleKeys
        .map((k) => roleMap.get(k as never))
        .filter((id): id is string => Boolean(id));

      await db.from("user_roles").delete().eq("user_id", input.userId);

      if (targetRoleIds.length > 0) {
        await db.from("user_roles").insert(
          targetRoleIds.map((role_id) => ({
            user_id: input.userId,
            role_id,
            granted_by: auth.staff.userId,
          }))
        );
      }
    }
  } catch {}

  if (profileRoleErr) return { ok: false, error: `Could not update role: ${profileRoleErr.message}` };

  await writeAudit({
    actorId: auth.staff.userId,
    action: "user.roles_set",
    entityType: "profile",
    entityId: input.userId,
    after: { roleKeys: input.roleKeys, primaryRole },
  });

  revalidatePath(`/admin/users/${input.userId}`);
  revalidatePath("/admin/users");
  return { ok: true, message: `✅ Role updated to ${primaryRole.toUpperCase()}!` };
}
