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

async function testCrmVipQuery() {
  console.log("=== Testing CRM VIP Segment Query ===");

  // Test old query with vip_status!inner
  const { data: oldData, error: oldErr } = await db
    .from("profiles")
    .select("id, full_name, email, vip_status!inner(user_id)");

  if (oldErr) {
    console.error("❌ Old VIP query failed:", oldErr.message);
  } else {
    console.log("Old VIP query returned:", oldData?.length, "rows");
  }

  // Test new query filtering by vip_points > 0 or vip_tier != 'bronze'
  const { data: newData, error: newErr } = await db
    .from("profiles")
    .select("id, full_name, email, vip_points, vip_tier")
    .gt("vip_points", 0);

  if (newErr) {
    console.error("❌ New VIP query failed:", newErr.message);
  } else {
    console.log("🟢 New VIP query succeeded! Found", newData?.length, "VIP players:");
    console.table(newData);
  }
}

testCrmVipQuery();
