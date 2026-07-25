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

async function debugQuery() {
  console.log("=== Testing Leaderboard Query Fields ===");

  const { data: allData, error: err1 } = await db.from("profiles").select("*");
  console.log("Select * count:", allData?.length, "Error:", err1?.message);

  const { data: selData, error: err2 } = await db.from("profiles").select("id, full_name, email, vip_points");
  console.log("Select specific count:", selData?.length, "Error:", err2?.message);
}

debugQuery();
