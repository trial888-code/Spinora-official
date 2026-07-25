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

async function testRpc() {
  console.log("=== Testing complete_deposit_request RPC ===");
  const { error } = await db.rpc("complete_deposit_request", {
    p_deposit_id: "00000000-0000-0000-0000-000000000000",
    p_amount: 10,
    p_admin_notes: "test",
  });

  if (error) {
    console.log("RPC Error:", error.message, "Code:", error.code);
  } else {
    console.log("RPC SUCCESS!");
  }
}

testRpc();
