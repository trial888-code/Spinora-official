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

async function checkTransactions() {
  console.log("=== Checking All Deposit Requests & Game Account Requests in Database ===");

  const { data: deposits, error: depErr } = await db
    .from("deposit_requests")
    .select("id, user_id, amount, status, payment_method, created_at, profiles(email, full_name)")
    .order("created_at", { ascending: false });

  if (depErr) console.error("Deposit requests error:", depErr.message);
  else console.log("Deposit Requests in DB:", deposits);

  const { data: gameRequests, error: gErr } = await db
    .from("game_account_requests")
    .select("id, user_id, game_id, amount, type, status, created_at, profiles(email, full_name)")
    .order("created_at", { ascending: false });

  if (gErr) console.error("Game requests error:", gErr.message);
  else console.log("Game Account Requests (Wallet Loads) in DB:", gameRequests);
}

checkTransactions();
