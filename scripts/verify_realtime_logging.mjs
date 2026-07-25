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

async function verifyRealtimeLogging() {
  console.log("=== Verifying Real-Time Transaction & Activity Log Inserts ===");

  const coins = 100;
  const xp = 50;

  // Insert wallet_transaction
  const { error: txErr } = await db.from("wallet_transactions").insert({
    user_id: userId,
    amount: coins,
    wallet_type: "bonus",
    transaction_type: "credit",
    source: "reward_claim",
    description: `Claimed Daily Reward (+${coins} Coins, +${xp} XP)`,
  });

  // Insert activity_log
  const { error: logErr } = await db.from("activity_log").insert({
    user_id: userId,
    action: "reward_claimed",
    description: `Claimed Daily Reward (+${coins} Coins, +${xp} XP)`,
    metadata: { coins, xp, rule: "daily_login" },
  });

  if (txErr) console.error("❌ wallet_transactions error:", txErr.message);
  else console.log("✅ wallet_transactions logged successfully!");

  if (logErr) console.error("❌ activity_log error:", logErr.message);
  else console.log("✅ activity_log logged successfully!");

  const { data: txs } = await db.from("wallet_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(3);
  console.log("\n📜 Recent Wallet Transactions (Admin Coin Ledger & CRM Feed):");
  console.table(txs?.map(t => ({
    Source: t.source,
    Amount: `$${t.amount}`,
    Type: t.transaction_type,
    Description: t.description,
    Time: t.created_at,
  })));
}

verifyRealtimeLogging();
