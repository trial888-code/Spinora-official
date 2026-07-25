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

async function checkWalletTx() {
  console.log("=== Checking wallet_transactions Table ===");
  const { data, error } = await db
    .from("wallet_transactions")
    .select("id, user_id, amount, wallet_type, transaction_type, source, description, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("❌ wallet_transactions error:", error.message);
  } else {
    console.log(`✅ Success! Found ${data?.length} transactions in wallet_transactions:`, data);
  }
}

checkWalletTx();
