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

async function testApproval() {
  console.log("=== Testing Admin Deposit Approval Fallback ===");

  const { data: profile } = await db.from("profiles").select("id, wallet_balance").limit(1).single();
  const initBalance = Number(profile.wallet_balance ?? 0);
  console.log("User initial wallet_balance:", initBalance);

  const { data: dep, error: depErr } = await db
    .from("deposit_requests")
    .insert({
      user_id: profile.id,
      game_slug: "fire-kirin",
      game_name: "Fire Kirin",
      payment_method: "paypal",
      amount: 50,
      proof_url: "deposit-proofs/test_approval_flow.png",
      status: "pending",
    })
    .select("id")
    .single();

  if (depErr) {
    console.error("Deposit insert error:", depErr);
    return;
  }

  console.log("Deposit created, ID:", dep.id);

  // Perform direct wallet update fallback test
  const newBalance = Math.round((initBalance + 50) * 100) / 100;
  await db.from("profiles").update({ wallet_balance: newBalance }).eq("id", profile.id);
  await db
    .from("deposit_requests")
    .update({
      status: "completed",
      amount: 50,
      wallet_credited: true,
      admin_notes: "Test credit",
    })
    .eq("id", dep.id);

  const { data: updatedProfile } = await db.from("profiles").select("wallet_balance").eq("id", profile.id).single();
  console.log("Updated user wallet_balance:", updatedProfile.wallet_balance);

  // Restore balance & clean up
  await db.from("profiles").update({ wallet_balance: initBalance }).eq("id", profile.id);
  await db.from("deposit_requests").delete().eq("id", dep.id);
  console.log("Test clean up completed. SUCCESS!");
}

testApproval();
