import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      const m = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {}
}

loadEnv();

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const userId = "c1931a25-745b-42aa-a3d4-857d267cdf31";

async function testCashoutLogging() {
  console.log("=== Testing Redeem Cashout Logging in Supabase ===");

  const payoutAmt = 10;
  
  // Log into wallet_transactions
  const { error: txErr } = await db.from("wallet_transactions").insert({
    user_id: userId,
    amount: payoutAmt,
    wallet_type: "cashout",
    transaction_type: "debit",
    source: "admin_cashout_payout",
    description: `Redeem Payout processed (-$${payoutAmt.toFixed(2)}): Admin test cashout payout`,
  });

  if (txErr) console.error("❌ Cashout tx error:", txErr.message);
  else console.log("✅ Cashout payout transaction recorded successfully in real time!");

  const { data: recent } = await db.from("wallet_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(3);
  console.log("\n📜 Recent Transactions (Admin Coin Ledger & CRM Stream):");
  console.table(recent?.map(r => ({
    Source: r.source,
    Amount: `$${r.amount}`,
    Type: r.transaction_type,
    Description: r.description,
    Time: r.created_at,
  })));
}

testCashoutLogging();
