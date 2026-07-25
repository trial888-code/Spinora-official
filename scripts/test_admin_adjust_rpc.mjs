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

async function testRpc() {
  console.log("=== Testing admin_adjust_user_wallet RPC ===");

  const { error } = await db.rpc("admin_adjust_user_wallet", {
    p_user_id: userId,
    p_wallet_balance: 50,
  });

  if (error) {
    console.error("❌ RPC Error:", error.message);
  } else {
    const { data: p } = await db.from("profiles").select("wallet_balance").eq("id", userId).single();
    console.log("✅ RPC Executed! Wallet Balance After:", p?.wallet_balance);
  }
}

testRpc();
