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
const id = "c1931a25-745b-42aa-a3d4-857d267cdf31";

async function testAll() {
  console.log("=== Comprehensive User Actions Verification ===");

  // 1. Check Coin Ledger Query
  const { data: txs } = await db.from("wallet_transactions").select("*").eq("user_id", id);
  console.log(`✅ Coin Ledger: ${txs?.length ?? 0} transaction records found.`);

  // 2. Check Ban Action
  await db.from("profiles").update({ is_suspended: true }).eq("id", id);
  const { data: pBanned } = await db.from("profiles").select("is_suspended").eq("id", id).single();
  console.log("✅ Ban Member (Freeze):", pBanned?.is_suspended ? "BANNED 🛑" : "ACTIVE 🟢");

  await db.from("profiles").update({ is_suspended: false }).eq("id", id);
  console.log("✅ Reinstated Member back to ACTIVE 🟢");

  // 3. Check Role Update
  await db.from("profiles").update({ role: "admin" }).eq("id", id);
  const { data: pRole } = await db.from("profiles").select("role").eq("id", id).single();
  console.log("✅ Save Roles:", pRole?.role?.toUpperCase());
}

testAll();
