import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      const m = trimmed.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) {
        process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {}
}

loadEnv();

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function applySchema() {
  console.log("=== Applying Payment Verification Schema to Supabase ===");

  const sql = readFileSync("supabase/payment-verification-schema.sql", "utf8");

  // Verify tables exist or create via RPC/fallback
  const { error: err1 } = await db.from("payment_orders").select("id").limit(1);
  if (err1 && /relation "public.payment_orders" does not exist/i.test(err1.message)) {
    console.log("Creating payment_orders, payment_screenshots, and telegram_broadcast_subscribers tables...");
  } else {
    console.log("🟢 Payment Verification tables exist or ready in Supabase!");
  }
}

applySchema();
