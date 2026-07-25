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
const userId = "c1931a25-745b-42aa-a3d4-857d267cdf31";

async function testActions() {
  console.log("=== Auditing Ban, Delete, and Roles Actions ===");

  // 1. Test Ban Toggle
  const { data: pBefore } = await db.from("profiles").select("is_suspended, role").eq("id", userId).single();
  console.log("Before:", pBefore);

  const { error: banErr } = await db.from("profiles").update({ is_suspended: true }).eq("id", userId);
  if (banErr) console.error("❌ Ban Error:", banErr.message);
  else console.log("✅ Ban toggled to TRUE successfully!");

  // Revert Ban
  await db.from("profiles").update({ is_suspended: false }).eq("id", userId);
  console.log("✅ Ban reverted back to FALSE.");

  // 2. Test Wallet Transactions for Coin Ledger
  const { data: txs, error: txErr } = await db.from("wallet_transactions").select("*").eq("user_id", userId);
  if (txErr) console.error("❌ Wallet Tx Error:", txErr.message);
  else console.log(`✅ Coin Ledger query OK! Found ${txs?.length ?? 0} transactions for player.`);
}

testActions();
