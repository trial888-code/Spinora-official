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

async function auditUsers() {
  console.log("=== Auditing Users & Profiles Module ===");

  const { data: users, error } = await db
    .from("profiles")
    .select("id, email, full_name, role, wallet_balance, cashout_wallet, kyc_status, is_suspended, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Users Query Error:", error.message);
  } else {
    console.log(`✅ Success! Found ${users?.length} registered user profiles in database:`);
    console.table(users.map((u) => ({
      ID: u.id.slice(0, 8),
      Name: u.full_name || "(No Name)",
      Email: u.email,
      Role: u.role,
      DepositWallet: `$${u.wallet_balance ?? 0}`,
      CashoutWallet: `$${u.cashout_wallet ?? 0}`,
      KYC: u.kyc_status ?? "unverified",
      Suspended: u.is_suspended ? "YES 🛑" : "NO 🟢",
    })));
  }
}

auditUsers();
