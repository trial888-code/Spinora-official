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

async function auditPlatformConfig() {
  console.log("=== Auditing Platform Config Features & Database Tables ===");
  const results = {};

  // 1. Live Support Chat
  const { count: supportCount, error: sErr } = await db.from("support_tickets").select("id", { count: "exact", head: true });
  results.liveSupport = sErr ? `ERR: ${sErr.message}` : `OK (${supportCount ?? 0} support tickets)`;

  // 2. Fraud & Flags
  const { count: auditCount, error: aErr } = await db.from("admin_audit_logs").select("id", { count: "exact", head: true });
  results.auditLogs = aErr ? `ERR: ${aErr.message}` : `OK (${auditCount ?? 0} audit log entries)`;

  // 3. Settings / Site Config
  const { data: configs, error: cErr } = await db.from("site_settings").select("*").limit(5);
  results.siteSettings = cErr ? `ERR: ${cErr.message}` : `OK (${configs?.length ?? 0} site configs)`;

  console.table(Object.entries(results).map(([feature, status]) => ({ Feature: feature, Status: status })));
}

auditPlatformConfig();
