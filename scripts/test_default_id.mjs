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

async function testDefaultId() {
  console.log("=== Testing default ID on deposit_requests ===");
  const { data: profile } = await db.from("profiles").select("id").limit(1).single();

  const { data, error } = await db
    .from("deposit_requests")
    .insert({
      user_id: profile.id,
      game_slug: "juwa",
      game_name: "Juwa",
      payment_method: "cashapp",
      amount: 10,
      proof_url: "deposit-proofs/test_default.png",
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("FAIL:", error.message, error.code, error.details);
  } else {
    console.log("SUCCESS! Created ID:", data.id);
    await db.from("deposit_requests").delete().eq("id", data.id);
  }
}

testDefaultId();
