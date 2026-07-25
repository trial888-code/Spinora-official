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

async function testPostPatch() {
  console.log("=== Testing Wallet System After fix-wallet-credit-permissions.sql ===");

  // 1. Check user spinoraway@gmail.com
  const { data: user } = await db
    .from("profiles")
    .select("id, email, wallet_balance")
    .eq("email", "spinoraway@gmail.com")
    .single();

  if (!user) {
    console.error("User spinoraway@gmail.com not found!");
    return;
  }

  console.log("User:", user.email, "| Current Balance:", user.wallet_balance);

  // 2. Find pending deposit or create test deposit
  let { data: dep } = await db
    .from("deposit_requests")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!dep) {
    console.log("Creating new test pending deposit request ($5)...");
    const { data: newDep, error: insertErr } = await db
      .from("deposit_requests")
      .insert({
        user_id: user.id,
        game_slug: "fire-kirin",
        game_name: "Fire Kirin",
        payment_method: "chime",
        amount: 5,
        proof_url: "deposit-proofs/test_patch_run.png",
        status: "pending",
      })
      .select("*")
      .single();

    if (insertErr) {
      console.error("Failed to insert deposit request:", insertErr);
      return;
    }
    dep = newDep;
  }

  console.log("Testing complete_deposit_request on Deposit ID:", dep.id);

  // 3. Execute complete_deposit_request RPC
  const { error: rpcErr } = await db.rpc("complete_deposit_request", {
    p_deposit_id: dep.id,
    p_amount: 5,
    p_admin_notes: "Confirmed $5 via SQL patch test",
  });

  if (rpcErr) {
    console.error("❌ RPC Error:", rpcErr.message, "Code:", rpcErr.code);
  } else {
    console.log("✅ RPC complete_deposit_request executed successfully!");
  }

  // 4. Verify updated balance
  const { data: updatedUser } = await db
    .from("profiles")
    .select("wallet_balance")
    .eq("id", user.id)
    .single();

  console.log("🎉 User New Wallet Balance:", updatedUser.wallet_balance);

  // 5. Verify transaction history record
  const { data: txs } = await db
    .from("wallet_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  console.log(`📊 Transaction History Rows (${txs?.length ?? 0}):`);
  if (txs?.length) {
    console.table(txs.map(t => ({ id: t.id, amount: t.amount, type: t.transaction_type, desc: t.description, created_at: t.created_at })));
  }
}

testPostPatch();
