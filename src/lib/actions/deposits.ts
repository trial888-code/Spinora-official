"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDepositMethod, type DepositPaymentMethodId } from "@/lib/payments/methods";
import { notifyAdminOfDeposit } from "@/lib/telegram/notify-admin-deposit";
import { createNotification } from "@/lib/actions/notifications";
import type { RequestStatus } from "@/types/database";

export interface DepositRequestRow {
  id: string;
  user_id: string;
  game_slug: string | null;
  game_name: string;
  payment_method: DepositPaymentMethodId;
  amount: number | null;
  proof_url: string;
  status: RequestStatus;
  admin_notes: string | null;
  wallet_credited?: boolean;
  created_at: string;
  user?: { full_name: string | null; email: string } | null;
}

export async function submitDepositRequest(input: {
  gameSlug: string;
  gameName: string;
  paymentMethod: DepositPaymentMethodId;
  amount?: number;
  proofPath: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in to submit a deposit." };

  if (!getDepositMethod(input.paymentMethod)) {
    return { error: "Invalid payment method." };
  }

  if (!input.proofPath?.trim()) {
    return { error: "Payment screenshot is required." };
  }

  const amount =
    input.amount != null && !Number.isNaN(input.amount) && input.amount > 0
      ? Math.round(input.amount * 100) / 100
      : null;

  const db = createAdminClient() ?? supabase;

  const { data: row, error } = await db
    .from("deposit_requests")
    .insert({
      user_id: user.id,
      game_slug: input.gameSlug,
      game_name: input.gameName,
      payment_method: input.paymentMethod,
      amount,
      proof_url: input.proofPath.trim(),
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[submitDepositRequest] Insert error:", error);
    return { error: error.message };
  }

  void notifyAdminOfDeposit({
    userId: user.id,
    gameName: input.gameName,
    paymentMethod: input.paymentMethod,
    amount,
    proofPath: input.proofPath.trim(),
    depositId: row.id,
  });

  revalidatePath("/admin/deposits");
  revalidatePath("/dashboard/deposits");
  return { success: true, id: row.id };
}

export async function getAdminDepositRequests(): Promise<DepositRequestRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const db = createAdminClient() ?? supabase;
  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return [];

  const { data } = await db
    .from("deposit_requests")
    .select("*, user:profiles!deposit_requests_user_id_fkey(full_name, email)")
    .order("created_at", { ascending: false });

  return (data ?? []) as DepositRequestRow[];
}

export async function updateDepositStatus(
  depositId: string,
  status: RequestStatus,
  adminNotes?: string,
  creditAmount?: number
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const db = createAdminClient() ?? supabase;
  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Unauthorized" };

  const { data: existing, error: selectError } = await db
    .from("deposit_requests")
    .select("user_id, game_name, payment_method, amount, status, wallet_credited")
    .eq("id", depositId)
    .single();

  if (selectError) {
    console.error("Select deposit request error:", selectError);
    return { error: `Query error: ${selectError.message}` };
  }
  if (!existing) return { error: "Deposit request not found" };

  if (status === "completed") {
    if (existing.status === "completed" || existing.wallet_credited) {
      return { error: "Deposit already completed" };
    }

    const amount =
      creditAmount != null && !Number.isNaN(creditAmount) && creditAmount > 0
        ? Math.round(creditAmount * 100) / 100
        : existing.amount != null && existing.amount > 0
          ? Number(existing.amount)
          : null;

    if (amount == null || amount <= 0) {
      return { error: "Enter the deposit amount before confirming." };
    }

    const method = getDepositMethod(existing.payment_method as DepositPaymentMethodId);
    const methodLabel = method?.label ?? existing.payment_method;

    const { error: rpcError } = await db.rpc("complete_deposit_request", {
      p_deposit_id: depositId,
      p_amount: amount,
      p_admin_notes: adminNotes?.trim() ?? null,
    });

    if (rpcError) {
      console.warn("[updateDepositStatus] RPC failed, applying direct wallet credit fallback:", rpcError.message);

      const { data: userProfile } = await db
        .from("profiles")
        .select("wallet_balance")
        .eq("id", existing.user_id)
        .single();

      const currentBal = Number(userProfile?.wallet_balance ?? 0);
      const newBalance = Math.round((currentBal + amount) * 100) / 100;

      const { error: updateBalErr } = await db
        .from("profiles")
        .update({ wallet_balance: newBalance })
        .eq("id", existing.user_id);

      if (updateBalErr) {
        return { error: `Failed to update user wallet: ${updateBalErr.message}` };
      }

      await db
        .from("deposit_requests")
        .update({
          status: "completed",
          amount: amount,
          wallet_credited: true,
          admin_notes: adminNotes?.trim() ?? null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", depositId);
    }

    await createNotification(
      existing.user_id,
      "Deposit confirmed! 💰",
      `$${amount.toFixed(2)} has been added to your Total Deposit wallet (${existing.game_name} · ${methodLabel}).`,
      "success"
    );
  } else {
    const update: Record<string, string | null> = { status };
    if (adminNotes?.trim()) update.admin_notes = adminNotes.trim();

    const { error } = await db
      .from("deposit_requests")
      .update({
        ...update,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", depositId);

    if (error) return { error: error.message };

    if (status === "rejected") {
      await createNotification(
        existing.user_id,
        "Deposit issue",
        `We could not confirm your ${existing.game_name} deposit. Contact support if you need help.`,
        "warning"
      );
    }
  }

  revalidatePath("/admin/deposits");
  revalidatePath("/dashboard/deposits");
  revalidatePath("/dashboard");
  revalidatePath("/admin/transactions");
  return { success: true };
}
