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

async function debugAudit() {
  console.log("=== Debugging audit_logs Table Query ===");
  const { data, error } = await db
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, created_at, actor_id")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("❌ audit_logs error:", error.message);
  } else {
    console.log(`✅ Success! Found ${data?.length} raw audit log rows in DB:`, data);
  }
}

debugAudit();
