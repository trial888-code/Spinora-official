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

async function testUserWalletView() {
  console.log("=== Testing User Deposit History & Wallet Activity Data ===");

  const { data: user } = await db.from("profiles").select("id, email, wallet_balance, cashout_wallet").eq("email", "spinoraway@gmail.com").single();

  // 1. Check Deposit History (deposit_requests)
  const { data: deposits, error: depErr } = await db
    .from("deposit_requests")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  console.log(`\n📌 Deposit History Rows (${deposits?.length ?? 0}):`);
  if (depErr) console.error("Deposit fetch error:", depErr);
  else {
    console.table(deposits.map(d => ({ id: d.id, game: d.game_name, method: d.payment_method, amount: d.amount, status: d.status, date: d.created_at })));
  }

  // 2. Check Wallet Activity (wallet_transactions)
  const { data: txs, error: txErr } = await db
    .from("wallet_transactions")
    .select("id, amount, wallet_type, transaction_type, source, description, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  console.log(`\n💳 Wallet Activity Rows (${txs?.length ?? 0}):`);
  if (txErr) console.error("Wallet Activity fetch error:", txErr);
  else {
    console.table(txs.map(t => ({ id: t.id, amount: t.amount, wallet: t.wallet_type, type: t.transaction_type, desc: t.description, date: t.created_at })));
  }
}

testUserWalletView();
