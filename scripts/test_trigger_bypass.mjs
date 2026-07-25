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

async function testTriggerBypass() {
  console.log("=== Testing Trigger Bypass on Profiles ===");

  // Get user profile for spinoraway@gmail.com
  const { data: profile } = await db.from("profiles").select("id, email, wallet_balance").eq("email", "spinoraway@gmail.com").single();
  console.log("User:", profile.email, "Current balance:", profile.wallet_balance);

  // Attempt direct update
  await db.from("profiles").update({ wallet_balance: 5 }).eq("id", profile.id);

  const { data: profileAfterDirect } = await db.from("profiles").select("wallet_balance").eq("id", profile.id).single();
  console.log("Balance after direct update:", profileAfterDirect.wallet_balance);

  // If direct update failed (reverted to 0), let's check RPC or setting app.wallet_update
}

testTriggerBypass();
