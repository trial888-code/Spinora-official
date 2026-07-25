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

async function debugFraud() {
  console.log("=== Debugging fraud_scores Table Query ===");
  const { data: scores, error } = await db
    .from("fraud_scores")
    .select("user_id, risk_score, flags, blocked, rewards_blocked, manual_review, last_calculated_at")
    .or("rewards_blocked.eq.true,blocked.eq.true,manual_review.eq.true,risk_score.gte.50")
    .order("risk_score", { ascending: false })
    .limit(200);

  if (error) {
    console.error("❌ fraud_scores Query Error:", error.message, error.details, error.hint);
  } else {
    console.log(`✅ Success! Returned ${scores?.length} rows from fraud_scores.`);
  }
}

debugFraud();
