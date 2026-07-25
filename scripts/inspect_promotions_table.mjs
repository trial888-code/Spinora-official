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

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPromotionsTable() {
  console.log("Checking promotions table structure in Supabase...");
  const { data, error } = await db.from("promotions").select("*").limit(1);
  if (error) {
    console.error("Error fetching promotions:", error.message);
  } else {
    console.log("Sample promotions row keys:", Object.keys(data[0] || {}));
  }
}

checkPromotionsTable();
