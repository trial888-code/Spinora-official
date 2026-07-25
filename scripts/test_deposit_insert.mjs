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

async function testInsert() {
  console.log("=== Testing deposit_requests Insert ===");

  // Find a test profile or user_id
  const { data: profile } = await db.from("profiles").select("id").limit(1).single();
  if (!profile) {
    console.error("No profile found");
    return;
  }

  console.log("Using user_id:", profile.id);

  const { data, error } = await db
    .from("deposit_requests")
    .insert({
      user_id: profile.id,
      game_slug: "fire-kirin",
      game_name: "Fire Kirin",
      payment_method: "usdt",
      amount: 20,
      proof_url: "deposit-proofs/test.png",
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("INSERT ERROR:", error);
  } else {
    console.log("INSERT SUCCESS! Row ID:", data.id);
    // Cleanup test row
    await db.from("deposit_requests").delete().eq("id", data.id);
    console.log("Test row cleaned up.");
  }
}

testInsert();
