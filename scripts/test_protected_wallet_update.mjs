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

async function testBypassTrigger() {
  console.log("=== Testing Wallet Update with RPC or Session Config ===");

  const { data: pBefore } = await db.from("profiles").select("wallet_balance").eq("id", userId).single();
  console.log("Wallet Balance Before:", pBefore?.wallet_balance);

  // Call rpc credit_user_wallet_admin or set session config
  const { error: rpcErr } = await db.rpc("credit_user_wallet_admin", {
    target_user: userId,
    amount: 15.00
  });

  if (rpcErr) {
    console.error("RPC Error:", rpcErr.message);
  } else {
    const { data: pAfter } = await db.from("profiles").select("wallet_balance").eq("id", userId).single();
    console.log("✅ Success! Wallet Balance After:", pAfter?.wallet_balance);
  }
}

testBypassTrigger();
