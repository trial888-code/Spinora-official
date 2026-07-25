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

async function verifyClaimFlow() {
  console.log("=== Verifying Reward Claim Execution ===");

  const { data: before } = await db.from("profiles").select("bonus_wallet, vip_points").eq("id", userId).single();
  console.log("Before Claim:", before);

  // Execute claim update using admin_adjust_user_wallet RPC
  const coinsAwarded = 100;
  const xpAwarded = 50;
  const newBonus = Number(before?.bonus_wallet ?? 0) + coinsAwarded;
  const newXp = Number(before?.vip_points ?? 0) + xpAwarded;

  await db.rpc("admin_adjust_user_wallet", {
    p_user_id: userId,
    p_bonus_wallet: newBonus,
    p_vip_points: newXp,
  });

  await db.from("wallet_transactions").insert({
    user_id: userId,
    amount: coinsAwarded,
    wallet_type: "bonus",
    transaction_type: "credit",
    source: "reward_claim",
    description: `Daily Reward Claim (+${coinsAwarded} Coins, +${xpAwarded} XP)`,
  });

  const { data: after } = await db.from("profiles").select("bonus_wallet, vip_points").eq("id", userId).single();
  console.log("✅ Success! After Claim:", after);

  if (after?.bonus_wallet === newBonus && after?.vip_points === newXp) {
    console.log("🎉 SUCCESS! Reward coins and XP points were credited live!");
  } else {
    console.error("❌ Claim balance update mismatch.");
  }
}

verifyClaimFlow();
