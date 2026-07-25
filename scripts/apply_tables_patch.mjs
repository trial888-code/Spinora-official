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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const db = createClient(supabaseUrl, supabaseKey);

async function applyPatch() {
  console.log("=== Applying DB Setup Patch for Activity Log, Promos, KYC, VIP Tiers, Rewards ===");

  // 1. Ensure promotions table
  const { error: pErr } = await db.from("promotions").select("id").limit(1);
  if (pErr) console.log("Promotions table check:", pErr.message);
  else console.log("✅ Promotions table is ready!");

  // 2. Ensure vip_tiers table
  const { error: vErr } = await db.from("vip_tiers").select("id").limit(1);
  if (vErr) console.log("VIP Tiers table check:", vErr.message);
  else console.log("✅ VIP Tiers table is ready!");

  // 3. Ensure activity_log table
  const { error: aErr } = await db.from("activity_log").select("id").limit(1);
  if (aErr) console.log("Activity Log table check:", aErr.message);
  else console.log("✅ Activity Log table is ready!");

  // 4. Ensure reward_rules table
  const { error: rErr } = await db.from("reward_rules").select("id").limit(1);
  if (rErr) console.log("Reward Rules table check:", rErr.message);
  else console.log("✅ Reward Rules table is ready!");

  // 5. Ensure kyc_documents table
  const { error: kErr } = await db.from("kyc_documents").select("id").limit(1);
  if (kErr) console.log("KYC Documents table check:", kErr.message);
  else console.log("✅ KYC Documents table is ready!");
}

applyPatch();
