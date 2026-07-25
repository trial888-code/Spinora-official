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

async function testCompleteDeposit() {
  console.log("=== Testing complete_deposit_request with Service Role ===");

  // Create a dummy deposit request
  const { data: profile } = await db.from("profiles").select("id").limit(1).single();
  const { data: dep, error: depErr } = await db
    .from("deposit_requests")
    .insert({
      user_id: profile.id,
      game_slug: "juwa",
      game_name: "Juwa",
      payment_method: "cashapp",
      amount: 25,
      proof_url: "deposit-proofs/test_approval.png",
      status: "pending",
    })
    .select("id")
    .single();

  if (depErr) {
    console.error("Failed to insert deposit request:", depErr);
    return;
  }

  console.log("Created deposit request:", dep.id);

  const { error: rpcErr } = await db.rpc("complete_deposit_request", {
    p_deposit_id: dep.id,
    p_amount: 25,
    p_admin_notes: "Admin approval test",
  });

  if (rpcErr) {
    console.error("RPC FAILED:", rpcErr.message, "Code:", rpcErr.code);
  } else {
    console.log("RPC SUCCESS!");
  }

  // Clean up
  await db.from("deposit_requests").delete().eq("id", dep.id);
}

testCompleteDeposit();
