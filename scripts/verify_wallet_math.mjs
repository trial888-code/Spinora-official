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

async function verifyMath() {
  console.log("=== Verifying Dual Wallet Balances for User kjgh ===");

  const { data: p } = await db.from("profiles").select("wallet_balance, cashout_wallet, bonus_wallet, vip_points").eq("id", id).single();
  
  console.log("📊 Database Values:");
  console.table({
    "Non-Redeemable Play Balance (wallet_balance)": `$${p?.wallet_balance ?? 0}`,
    "Unlocked Cashout Balance (cashout_wallet)": `$${p?.cashout_wallet ?? 0}`,
    "Reward Coins (bonus_wallet)": `${p?.bonus_wallet ?? 0}`,
    "VIP Experience Points (vip_points)": `${p?.vip_points ?? 0}`,
  });
}

verifyMath();
