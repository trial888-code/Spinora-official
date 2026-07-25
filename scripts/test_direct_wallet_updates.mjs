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

async function testUpdates() {
  console.log("=== Testing Direct Wallet & Cashout Balance Updates ===");

  // 1. Test Deposit Wallet Balance
  const { data: p1 } = await db.from("profiles").select("wallet_balance, cashout_wallet").eq("id", id).single();
  console.log("Initial State:", p1);

  const newWallet = Number(p1?.wallet_balance ?? 0) + 50;
  await db.from("profiles").update({ wallet_balance: newWallet }).eq("id", id);
  const { data: p2 } = await db.from("profiles").select("wallet_balance").eq("id", id).single();
  console.log("✅ Wallet Balance after +$50:", p2?.wallet_balance);

  // 2. Revert back for clean state
  await db.from("profiles").update({ wallet_balance: p1?.wallet_balance ?? 5 }).eq("id", id);
  console.log("✅ Reverted Wallet Balance back to initial.");
}

testUpdates();
