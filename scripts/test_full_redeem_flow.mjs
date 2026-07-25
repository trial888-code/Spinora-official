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
const userId = "c1931a25-745b-42aa-a3d4-857d267cdf31";

async function testFullRedeemFlow() {
  console.log("=== Testing Redeem Cash-Out Balance Update Flow ===");

  // Reset cashout_wallet to 0
  await db.rpc("admin_adjust_user_wallet", { p_user_id: userId, p_cashout_wallet: 0 });

  // Simulate admin adding $10.00 to cashout_wallet
  const { data: p1 } = await db.from("profiles").select("cashout_wallet").eq("id", userId).single();
  const newCashout = Math.max(0, Number(p1?.cashout_wallet ?? 0) + 10);
  await db.rpc("admin_adjust_user_wallet", { p_user_id: userId, p_cashout_wallet: newCashout });

  const { data: p2 } = await db.from("profiles").select("cashout_wallet").eq("id", userId).single();
  console.log("✅ Cashout Wallet after adding $10.00:", p2?.cashout_wallet);

  if (p2?.cashout_wallet === 10) {
    console.log("🎉 SUCCESS! Cash-out Redeem balance updated to $10.00!");
  } else {
    console.error("❌ Failed to update cash-out redeem balance.");
  }
}

testFullRedeemFlow();
