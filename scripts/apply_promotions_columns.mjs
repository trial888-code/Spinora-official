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

async function applyColumns() {
  const sql = readFileSync("supabase/add-promotions-extended-columns.sql", "utf8");
  console.log("Applying SQL schema updates to Supabase...");
  
  try {
    const { error } = await db.rpc("exec_sql", { sql_query: sql });
    if (error) {
      console.log("RPC exec_sql notice:", error.message);
    } else {
      console.log("SQL schema updated via exec_sql successfully!");
    }
  } catch (err) {
    console.log("RPC notice:", err.message);
  }
}

applyColumns();
