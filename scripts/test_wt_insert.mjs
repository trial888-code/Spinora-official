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

async function testWalletTransactions() {
  console.log("=== Testing wallet_transactions Insert with UUID ===");

  const { data: user } = await db.from("profiles").select("id, email").eq("email", "spinoraway@gmail.com").single();

  const { data, error } = await db.from("wallet_transactions").insert({
    id: crypto.randomUUID(),
    user_id: user.id,
    amount: 5,
    wallet_type: "current",
    transaction_type: "credit",
    source: "deposit",
    description: "Deposit confirmed — $5 via Chime (Fire Kirin)",
    created_by: user.id,
  }).select("*");

  if (error) {
    console.error("wallet_transactions error:", error.message, error.code, error.details);
  } else {
    console.log("wallet_transactions INSERT SUCCESS! Data:", data);
  }
}

testWalletTransactions();
