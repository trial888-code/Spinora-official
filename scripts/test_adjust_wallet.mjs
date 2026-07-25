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

async function testAdjust() {
  console.log("=== Testing Direct Wallet Adjustment ===");

  const { data: before } = await db.from("profiles").select("wallet_balance").eq("id", userId).single();
  console.log("Wallet Balance Before:", before?.wallet_balance);

  const newBal = Number(before?.wallet_balance ?? 0) + 10;
  const { error } = await db.from("profiles").update({ wallet_balance: newBal }).eq("id", userId);

  if (error) {
    console.error("❌ Adjustment Error:", error.message);
  } else {
    const { data: after } = await db.from("profiles").select("wallet_balance").eq("id", userId).single();
    console.log("✅ Success! Wallet Balance After adjustment (+10):", after?.wallet_balance);

    // Revert back to 5 for clean state
    await db.from("profiles").update({ wallet_balance: 5 }).eq("id", userId);
    console.log("Reverted balance back to $5.00 for clean state.");
  }
}

testAdjust();
