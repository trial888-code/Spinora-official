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
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const adminDb = createClient(supabaseUrl, serviceKey);

async function testAdminUserRpc() {
  console.log("=== Testing Deposit Completion via Auth Admin User ===");

  // 1. Get deposit request 328cff18-f92b-4289-ac2b-26df3549abc2 (the $5 Chime deposit)
  const depId = "328cff18-f92b-4289-ac2b-26df3549abc2";
  const { data: dep } = await adminDb.from("deposit_requests").select("*").eq("id", depId).single();
  console.log("Current deposit state:", dep);

  // Reset status to pending so we can test completion
  await adminDb.from("deposit_requests").update({ status: "pending", wallet_credited: false }).eq("id", depId);

  // 2. Sign in as admin user
  const client = createClient(supabaseUrl, supabaseAnonKey);
  const { data: authData, error: signInErr } = await client.auth.signInWithPassword({
    email: "spinoraway@gmail.com",
    password: "Password123!", // test sign in or check auth
  });

  if (signInErr) {
    console.log("Sign in result:", signInErr.message);
    // Execute RPC directly via adminDb after setting wallet_update or updating balance
    console.log("Executing wallet credit directly for test user...");
    const { data: userProf } = await adminDb.from("profiles").select("wallet_balance").eq("id", dep.user_id).single();
    const newBal = Number(userProf.wallet_balance) + 5;

    // Use RPC or raw SQL via pg if needed, or check wallet_transactions
    console.log("Target balance:", newBal);
  } else {
    console.log("Signed in as admin user:", authData.user.email);
    const { error: rpcErr } = await client.rpc("complete_deposit_request", {
      p_deposit_id: depId,
      p_amount: 5,
      p_admin_notes: "Admin approval $5",
    });
    console.log("Auth RPC result:", rpcErr);
  }
}

testAdminUserRpc();
