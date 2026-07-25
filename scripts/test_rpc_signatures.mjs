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

async function testRpcs() {
  console.log("=== Testing PostgreSQL RPC Function Signatures ===");

  // 1. admin_adjust_user_wallet
  const { error: err1 } = await db.rpc("admin_adjust_user_wallet", {
    p_user_id: userId,
    p_wallet_balance: 24,
    p_cashout_wallet: 0,
  });
  console.log("RPC admin_adjust_user_wallet:", err1 ? `❌ Error: ${err1.message}` : "🟢 EXISTS AND WORKING PERFECTLY!");

  // 2. claim_reward
  const { error: err2 } = await db.rpc("claim_reward", {
    rule_key: "daily_login",
  });
  console.log("RPC claim_reward:", err2 ? `Result: ${err2.message}` : "🟢 EXISTS AND WORKING PERFECTLY!");
}

testRpcs();
