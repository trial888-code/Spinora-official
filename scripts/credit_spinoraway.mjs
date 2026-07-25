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

async function creditUser() {
  console.log("=== Crediting spinoraway@gmail.com $5 Deposit ===");

  const { data: user } = await db.from("profiles").select("id, email, wallet_balance").eq("email", "spinoraway@gmail.com").single();
  if (!user) {
    console.error("User not found!");
    return;
  }

  console.log("Initial balance:", user.wallet_balance);

  // Update deposit_requests
  await db.from("deposit_requests").update({
    status: "completed",
    amount: 5,
    wallet_credited: true,
    admin_notes: "Admin confirmed $5 deposit",
    reviewed_at: new Date().toISOString(),
  }).eq("user_id", user.id);

  // Update profiles wallet_balance
  const newBal = (Number(user.wallet_balance ?? 0)) + 5;
  await db.from("profiles").update({ wallet_balance: newBal }).eq("id", user.id);

  // Insert wallet_transactions history entry
  const { error: txErr } = await db.from("wallet_transactions").insert({
    user_id: user.id,
    amount: 5,
    wallet_type: "current",
    transaction_type: "credit",
    source: "deposit",
    description: "Deposit confirmed — $5 via Chime (Fire Kirin)",
    created_by: user.id,
  });

  if (txErr) console.log("Transaction insert note:", txErr.message);

  const { data: updated } = await db.from("profiles").select("wallet_balance").eq("id", user.id).single();
  console.log("Updated balance for spinoraway@gmail.com:", updated.wallet_balance);

  const { data: txs } = await db.from("wallet_transactions").select("*").eq("user_id", user.id);
  console.log("Wallet transactions count:", txs?.length ?? 0);
  console.log("Transactions:", txs);
}

creditUser();
