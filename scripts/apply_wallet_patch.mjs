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

async function creditUserFixed() {
  console.log("=== Crediting spinoraway@gmail.com $5 ===");

  const { data: user } = await db.from("profiles").select("id, email, wallet_balance").eq("email", "spinoraway@gmail.com").single();

  // Reset status of the deposit request so we can confirm it cleanly
  const { data: deposits } = await db.from("deposit_requests").select("id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1);
  const depId = deposits[0]?.id;

  if (!depId) {
    console.error("No deposit request found for spinoraway@gmail.com");
    return;
  }

  console.log("Found deposit ID:", depId);

  // Try executing complete_deposit_request RPC
  const { error: rpcErr } = await db.rpc("complete_deposit_request", {
    p_deposit_id: depId,
    p_amount: 5,
    p_admin_notes: "Admin confirmed $5 deposit",
  });

  if (rpcErr) {
    console.log("RPC Note:", rpcErr.message);
  } else {
    console.log("RPC Completed Successfully!");
  }

  const { data: updated } = await db.from("profiles").select("wallet_balance").eq("id", user.id).single();
  console.log("User updated wallet_balance:", updated.wallet_balance);
}

creditUserFixed();
