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

async function checkDeposits() {
  console.log("=== Checking Deposit Requests in Database ===");
  const { data: deposits, error } = await db
    .from("deposit_requests")
    .select("*, user:profiles!deposit_requests_user_id_fkey(email, full_name, wallet_balance, cashout_wallet)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching deposits:", error);
    return;
  }

  console.log(`Found ${deposits.length} deposit requests:`);
  for (const d of deposits) {
    console.log({
      id: d.id,
      user_email: d.user?.email,
      user_wallet_balance: d.user?.wallet_balance,
      user_cashout_wallet: d.user?.cashout_wallet,
      game_name: d.game_name,
      payment_method: d.payment_method,
      amount: d.amount,
      status: d.status,
      wallet_credited: d.wallet_credited,
      created_at: d.created_at,
    });
  }
}

checkDeposits();
