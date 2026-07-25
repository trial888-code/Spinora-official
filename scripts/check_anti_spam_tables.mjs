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

async function checkAntiSpam() {
  console.log("=== Checking Anti-Spam & Fraud Tables ===");
  const { data: fraud, error: fErr } = await db.from("fraud_scores").select("*").limit(1);
  if (fErr) console.log("fraud_scores table status:", fErr.message);
  else console.log("✅ fraud_scores table is READY!");

  const { data: device, error: dErr } = await db.from("device_map").select("*").limit(1);
  if (dErr) console.log("device_map table status:", dErr.message);
  else console.log("✅ device_map table is READY!");
}

checkAntiSpam();
