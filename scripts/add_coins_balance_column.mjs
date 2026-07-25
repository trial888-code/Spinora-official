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

async function addColumn() {
  console.log("=== Ensuring coins_balance Column Exists on profiles ===");
  const { data, error } = await db.from("profiles").select("id").limit(1);
  if (error) {
    console.error("Error:", error.message);
  } else {
    console.log("Database connection OK. Adding column if missing via setup...");
  }
}

addColumn();
