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

async function testCreditWalletRPC() {
  console.log("=== Testing credit_wallet RPC ===");

  const { data: profile } = await db.from("profiles").select("id, email, wallet_balance").eq("email", "spinoraway@gmail.com").single();
  console.log("User before RPC credit:", profile.email, "Balance:", profile.wallet_balance);

  const { data: newBal, error } = await db.rpc("credit_wallet", {
    p_user: profile.id,
    p_amount: 5,
    p_kind: "deposit",
    p_desc: "Deposit approved — $5 via Chime",
  });

  if (error) {
    console.error("credit_wallet RPC Error:", error.message, error.code);
  } else {
    console.log("credit_wallet RPC SUCCESS! New balance returned:", newBal);
    const { data: updated } = await db.from("profiles").select("wallet_balance").eq("id", profile.id).single();
    console.log("User updated wallet_balance in DB:", updated.wallet_balance);
  }
}

testCreditWalletRPC();
