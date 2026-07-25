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
  } catch {
    /* ignore */
  }
}

loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const db = createClient(supabaseUrl, supabaseKey);

async function listRpcs() {
  console.log("=== Testing common RPC function signatures ===");

  const rpcs = [
    "get_wheel_daily_stats",
    "complete_deposit_request",
    "credit_wallet",
    "debit_wallet",
    "admin_payout_cashout",
  ];

  for (const name of rpcs) {
    const { error } = await db.rpc(name, {});
    console.log(`RPC '${name}':`, error ? `${error.message} (${error.code})` : "OK (No params error)");
  }
}

listRpcs();
