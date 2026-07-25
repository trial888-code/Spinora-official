import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {}
}

loadEnv();

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const id = "c1931a25-745b-42aa-a3d4-857d267cdf31";

async function testRedeemDeduction() {
  console.log("=== Testing Simple Admin Redeem Flow ===");

  // Reset wallet_balance to $50.00 and cashout_wallet to $0
  await db.rpc("admin_adjust_user_wallet", { p_user_id: id, p_wallet_balance: 50.00, p_cashout_wallet: 0 });

  const { data: pBefore } = await db.from("profiles").select("wallet_balance, cashout_wallet").eq("id", id).single();
  console.log("Initial State: Wallet Balance =", pBefore?.wallet_balance, "| Cash-out History =", pBefore?.cashout_wallet);

  // Process $10.00 Redeem Payout
  const payoutAmt = 10.00;
  const newBal = Math.max(0, Number(pBefore?.wallet_balance ?? 0) - payoutAmt);
  const newCashout = Number(pBefore?.cashout_wallet ?? 0) + payoutAmt;

  await db.rpc("admin_adjust_user_wallet", {
    p_user_id: id,
    p_wallet_balance: newBal,
    p_cashout_wallet: newCashout
  });

  const { data: pAfter } = await db.from("profiles").select("wallet_balance, cashout_wallet").eq("id", id).single();
  console.log("✅ After $10.00 Redeem: Wallet Balance =", pAfter?.wallet_balance, "| Cash-out History =", pAfter?.cashout_wallet);

  if (pAfter?.wallet_balance === 40 && pAfter?.cashout_wallet === 10) {
    console.log("🎉 SUCCESS! $10.00 was deducted from wallet (50 -> 40) and recorded in redeem history!");
  } else {
    console.error("❌ Failed expected math.");
  }
}

testRedeemDeduction();
