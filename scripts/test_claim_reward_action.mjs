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

async function testClaim() {
  console.log("=== Testing Reward Claim Action Directly ===");

  const { data: before } = await db.from("profiles").select("bonus_wallet, vip_points").eq("id", userId).single();
  console.log("Before Claim:", before);

  // Perform claim update
  const coins = 100;
  const xp = 50;
  const newBonus = Number(before?.bonus_wallet ?? 0) + coins;
  const newXp = Number(before?.vip_points ?? 0) + xp;

  const { error: updErr } = await db.from("profiles").update({ bonus_wallet: newBonus, vip_points: newXp }).eq("id", userId);

  if (updErr) {
    console.error("❌ Profile update error:", updErr.message);
  } else {
    // Insert into wallet_transactions
    const { error: txErr } = await db.from("wallet_transactions").insert({
      user_id: userId,
      amount: coins,
      wallet_type: "bonus",
      transaction_type: "credit",
      source: "reward_claim",
      description: `Daily Check-in Reward (+${coins} Coins, +${xp} XP)`,
    });

    if (txErr) console.error("❌ Tx insert error:", txErr.message);

    const { data: after } = await db.from("profiles").select("bonus_wallet, vip_points").eq("id", userId).single();
    console.log("✅ Success! After Claim:", after);

    const { data: txs } = await db.from("wallet_transactions").select("*").eq("user_id", userId).eq("source", "reward_claim");
    console.log(`✅ Wallet Transactions (Coin Ledger): Found ${txs?.length} reward claim entries.`);
  }
}

testClaim();
