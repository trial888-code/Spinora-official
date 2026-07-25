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
const id = "c1931a25-745b-42aa-a3d4-857d267cdf31";

async function testUserDetail() {
  console.log("=== Testing Data Queries for User Detail Page ===");

  const { data: profile, error: pErr } = await db
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (pErr) console.error("❌ Profile Error:", pErr.message);
  else console.log("✅ Profile Data:", profile);

  const [rolesRes, userRolesRes, vipRes, ledgerRes, spinoraDepositsRes, winDepositsRes, ticketsRes] = await Promise.all([
    db.from("roles").select("key, name").order("key"),
    db.from("user_roles").select("roles(key)").eq("user_id", id),
    db.from("vip_status").select("vip_tiers(key, name)").eq("user_id", id).maybeSingle(),
    db.from("ledger_entries").select("id, currency, amount, entry_type, description, created_at").eq("user_id", id).limit(100),
    db.from("deposit_requests").select("id, game_name, payment_method, amount, status, created_at, reviewed_at").eq("user_id", id),
    db.from("requests").select("id, reference_code, request_type, deposit_amount, payment_method, status, created_at, resolved_at, games(name)").eq("user_id", id),
    db.from("support_tickets").select("id, ticket_no, subject, category, status, last_message_at, created_at").eq("user_id", id),
  ]);

  console.log("rolesRes:", rolesRes.error?.message || "OK");
  console.log("userRolesRes:", userRolesRes.error?.message || "OK");
  console.log("vipRes:", vipRes.error?.message || "OK");
  console.log("ledgerRes:", ledgerRes.error?.message || "OK");
  console.log("spinoraDepositsRes:", spinoraDepositsRes.error?.message || "OK");
  console.log("winDepositsRes:", winDepositsRes.error?.message || "OK");
  console.log("ticketsRes:", ticketsRes.error?.message || "OK");
}

testUserDetail();
