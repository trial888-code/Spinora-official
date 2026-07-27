import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const secret = req.headers.get("x-webhook-secret") || body.secret;
    const expectedSecret = process.env.EMAIL_WEBHOOK_SECRET;

    if (!expectedSecret) {
      console.error("❌ EMAIL_WEBHOOK_SECRET missing in environment config.");
      return NextResponse.json({ ok: false, error: "Webhook secret unconfigured" }, { status: 500 });
    }

    if (secret !== expectedSecret) {
      return NextResponse.json({ ok: false, error: "Unauthorized webhook secret" }, { status: 401 });
    }

    const { platform, amount, sender, note, transactionId } = body;
    const numAmount = Number(amount ?? 20.0);

    const db = getDb();
    const platformName = (platform || "cashapp").toLowerCase();

    // 1. Search pending deposit_requests
    let { data: matchedDep } = await db
      .from("deposit_requests")
      .select("id, user_id, amount")
      .eq("status", "pending")
      .eq("amount", numAmount)
      .limit(1)
      .maybeSingle();

    if (matchedDep) {
      await db.from("deposit_requests").update({ status: "completed" }).eq("id", matchedDep.id);

      if (matchedDep.user_id) {
        try {
          await db.rpc("admin_adjust_user_wallet", {
            p_user_id: matchedDep.user_id,
            p_wallet_balance: numAmount,
          });
        } catch {}
      }
    }

    const targetUserId = matchedDep?.user_id || body.userId || null;

    if (!targetUserId) {
      // Record unassigned payment in payment_orders for admin review
      const { data: order } = await db
        .from("payment_orders")
        .insert({
          amount: numAmount,
          platform: platformName,
          status: "pending_admin_review",
          memo: `Unassigned email deposit from ${sender || "Bank"}: $${numAmount.toFixed(2)} (Tx: ${transactionId || "N/A"})`,
        })
        .select("id")
        .single();

      return NextResponse.json({
        ok: true,
        message: "Email payment received but no matching user found. Queued for admin review.",
        amount: numAmount,
        orderId: order?.id,
        status: "UNASSIGNED_EMAIL_DEPOSIT",
      });
    }

    // 2. Record in wallet_transactions for matched user
    const { data: tx } = await db
      .from("wallet_transactions")
      .insert({
        user_id: targetUserId,
        amount: numAmount,
        wallet_type: "cash",
        transaction_type: "credit",
        source: `email_webhook_${platformName}`,
        description: `Verified email deposit from ${sender || "Bank"}: $${numAmount.toFixed(2)}`,
      })
      .select("id")
      .single();

    return NextResponse.json({
      ok: true,
      message: "Bank email payment verified & recorded successfully!",
      amount: numAmount,
      transactionId: tx?.id,
      status: "CONFIRMED_IN_EMAIL",
    });
  } catch (err: any) {
    console.error("❌ Email payment webhook error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
