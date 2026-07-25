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

async function testCooldownBlock() {
  console.log("=== Testing 24-Hour Cooldown Verification ===");

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentClaims, error } = await db
    .from("wallet_transactions")
    .select("id, created_at")
    .eq("user_id", userId)
    .eq("source", "reward_claim")
    .gte("created_at", oneDayAgo)
    .limit(1);

  if (error) console.error("Error:", error.message);

  if (recentClaims && recentClaims.length > 0) {
    console.log("🛑 24-Hour Cooldown ACTIVE! Player claimed at:", recentClaims[0].created_at);
    console.log("🔒 Further claims are BLOCKED until 24 hours expire!");
  } else {
    console.log("🟢 24-Hour Cooldown EXPIRED! Player can claim daily reward.");
  }
}

testCooldownBlock();
