"use server";

import { revalidatePath } from "next/cache";
import { AdminActionResult, adminDb, authorize, writeAudit } from "./core";
import { sendTelegramMessage } from "@/lib/services/telegram-bot";

export async function approvePaymentOrderAction(orderId: string): Promise<AdminActionResult> {
  const auth = await authorize("requests.manage");
  if ("error" in auth) return { ok: false, error: auth.error };

  const db = adminDb();
  const { data: order, error: fetchErr } = await db
    .from("payment_orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (fetchErr || !order) {
    // Fallback: Check deposit_requests
    const { data: dep } = await db
      .from("deposit_requests")
      .select("*")
      .eq("id", orderId)
      .single();

    if (!dep) return { ok: false, error: "Payment order not found" };

    await db.from("deposit_requests").update({ status: "completed" }).eq("id", orderId);

    if (dep.user_id && Number(dep.amount ?? 0) > 0) {
      await db.rpc("admin_adjust_user_wallet", {
        p_user_id: dep.user_id,
        p_wallet_balance: Number(dep.amount),
      });

      await db.from("wallet_transactions").insert({
        user_id: dep.user_id,
        amount: Number(dep.amount),
        wallet_type: "cash",
        transaction_type: "credit",
        source: "admin_verification_approval",
        description: `Deposit approved via AI Payment Verification: $${Number(dep.amount).toFixed(2)}`,
      });
    }

    revalidatePath("/admin/payment-verification");
    revalidatePath("/admin/deposits");
    revalidatePath("/admin/transactions");
    return { ok: true, message: `✅ Order #${orderId.slice(0, 8)} approved & player credited!` };
  }

  await db.from("payment_orders").update({ status: "paid", updated_at: new Date().toISOString() }).eq("id", orderId);

  if (order.user_id && Number(order.amount ?? 0) > 0) {
    await db.rpc("admin_adjust_user_wallet", {
      p_user_id: order.user_id,
      p_wallet_balance: Number(order.amount),
    });

    await db.from("wallet_transactions").insert({
      user_id: order.user_id,
      amount: Number(order.amount),
      wallet_type: "cash",
      transaction_type: "credit",
      source: "admin_verification_approval",
      description: `Payment approved via AI Verification Panel: $${Number(order.amount).toFixed(2)}`,
    });
  }

  await writeAudit({
    actorId: auth.staff.userId,
    action: "payment_order.approve",
    entityType: "payment_order",
    entityId: orderId,
    after: { status: "paid", amount: order.amount },
  });

  revalidatePath("/admin/payment-verification");
  revalidatePath("/admin/deposits");
  revalidatePath("/admin/transactions");
  return { ok: true, message: `✅ Payment Order #${orderId.slice(0, 8)} approved & player wallet credited!` };
}

export async function rejectPaymentOrderAction(orderId: string): Promise<AdminActionResult> {
  const auth = await authorize("requests.manage");
  if ("error" in auth) return { ok: false, error: auth.error };

  const db = adminDb();
  await db.from("payment_orders").update({ status: "rejected", updated_at: new Date().toISOString() }).eq("id", orderId);
  await db.from("deposit_requests").update({ status: "rejected" }).eq("id", orderId);

  await writeAudit({
    actorId: auth.staff.userId,
    action: "payment_order.reject",
    entityType: "payment_order",
    entityId: orderId,
  });

  revalidatePath("/admin/payment-verification");
  return { ok: true, message: `❌ Payment Order #${orderId.slice(0, 8)} rejected.` };
}

export async function sendTelegramBroadcastAction(input: {
  message: string;
  targetSegment?: string;
}): Promise<AdminActionResult> {
  const auth = await authorize("cms.manage");
  if ("error" in auth) return { ok: false, error: auth.error };

  if (!input.message || !input.message.trim()) {
    return { ok: false, error: "Broadcast message cannot be empty" };
  }

  const db = adminDb();
  const { data: subs } = await db.from("telegram_broadcast_subscribers").select("telegram_chat_id").eq("is_active", true);

  const chatIds = (subs ?? []).map((s) => s.telegram_chat_id);
  if (chatIds.length === 0 && process.env.TELEGRAM_ADMIN_CHAT_ID) {
    chatIds.push(process.env.TELEGRAM_ADMIN_CHAT_ID);
  }

  let sent = 0;
  for (const cid of chatIds) {
    const res = await sendTelegramMessage(cid, input.message);
    if (res?.ok || res?.mock) sent++;
  }

  revalidatePath("/admin/payment-verification");
  return { ok: true, message: `🚀 Telegram broadcast sent to ${sent} subscriber(s)!` };
}
