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

async function testInsertTx() {
  console.log("=== Testing wallet_transactions Insert ===");

  const { data: pBefore } = await db.from("profiles").select("wallet_balance").eq("id", userId).single();
  console.log("Wallet Balance Before:", pBefore?.wallet_balance);

  const { error: insErr } = await db.from("wallet_transactions").insert({
    user_id: userId,
    amount: 50,
    wallet_type: "current",
    transaction_type: "credit",
    source: "admin_adjustment",
    description: "Admin manual credit test",
  });

  if (insErr) {
    console.error("❌ Insert error:", insErr.message);
  } else {
    const { data: pAfter } = await db.from("profiles").select("wallet_balance").eq("id", userId).single();
    console.log("✅ Success! Wallet Balance After inserting $50 credit:", pAfter?.wallet_balance);
  }
}

testInsertTx();
