import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Validate NOWPayments HMAC-SHA512 IPN Signature
 */
function verifyNowPaymentsSignature(
  rawBody: string,
  receivedSig: string | null,
  ipnSecret: string
): boolean {
  if (!receivedSig || !ipnSecret) return false;

  try {
    const json = JSON.parse(rawBody);
    const sortedKeys = Object.keys(json).sort();
    const sortedObj: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      sortedObj[key] = json[key];
    }

    const sortedJsonStr = JSON.stringify(sortedObj);
    const hmac = createHmac("sha512", ipnSecret);
    hmac.update(sortedJsonStr);
    const calculatedSig = hmac.digest("hex");

    return calculatedSig.toLowerCase() === receivedSig.toLowerCase();
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const sigHeader = req.headers.get("x-nowpayments-sig");
    const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;

    if (!ipnSecret) {
      console.error("❌ NOWPAYMENTS_IPN_SECRET missing in environment config.");
      return NextResponse.json({ ok: false, error: "Webhook secret unconfigured" }, { status: 500 });
    }

    const isValid = verifyNowPaymentsSignature(rawBody, sigHeader, ipnSecret);
    if (!isValid) {
      console.warn("⚠️ Invalid NOWPayments IPN Signature rejected.");
      return NextResponse.json({ ok: false, error: "Invalid HMAC signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const { payment_id, payment_status, pay_amount, order_id, price_amount } = payload;

    console.log(`💳 NOWPayments IPN received: Payment #${payment_id} Status: ${payment_status}`);

    const db = getDb();
    const finalAmount = Number(price_amount || pay_amount || 0);

    if (payment_status === "finished" || payment_status === "confirmed") {
      let matchedOrderId = order_id;

      if (matchedOrderId) {
        await db
          .from("payment_orders")
          .update({ status: "paid", updated_at: new Date().toISOString() })
          .eq("id", matchedOrderId);
      } else {
        const { data: created } = await db
          .from("payment_orders")
          .insert({
            amount: finalAmount,
            platform: "crypto",
            status: "paid",
            memo: `NOWPayments Tx #${payment_id}`,
          })
          .select("id")
          .single();
        matchedOrderId = created?.id;
      }

      return NextResponse.json({
        ok: true,
        message: "NOWPayments crypto payment verified and completed!",
        orderId: matchedOrderId,
        status: "PAID",
      });
    }

    return NextResponse.json({
      ok: true,
      message: `NOWPayments IPN processed (Status: ${payment_status})`,
    });
  } catch (err: any) {
    console.error("❌ NOWPayments webhook error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
