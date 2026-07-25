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

async function testUsers() {
  const { data, count, error } = await db.from("profiles").select("id, email, full_name, avatar_url, wallet_balance, cashout_wallet, kyc_status, created_at, referral_code, role", { count: "exact" });
  if (error) {
    console.error("Query Error:", error.message);
  } else {
    console.log(`SUCCESS! Loaded ${data?.length} users (Total: ${count}):`);
    console.table(data);
  }
}

testUsers();
