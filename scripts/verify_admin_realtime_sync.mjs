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
const userId = "c1931a25-745b-42aa-a3d4-857d267cdf31";

async function verifyAdminSync() {
  console.log("=== Verifying Admin Panel Real-Time Sync & Data Views ===");

  // 1. User Profile Stats
  const { data: p } = await db.from("profiles").select("id, full_name, email, wallet_balance, cashout_wallet, bonus_wallet, vip_points, role, is_suspended").eq("id", userId).single();
  console.log("1. Live Player Profile Stats:", {
    Name: p?.full_name,
    Email: p?.email,
    PlayBalance: `$${p?.wallet_balance}`,
    CashoutUnlocked: `$${p?.cashout_wallet}`,
    RewardCoins: `${p?.bonus_wallet} Coins`,
    XP: `${p?.vip_points} XP`,
    Role: p?.role,
    Status: p?.is_suspended ? "BANNED" : "ACTIVE",
  });

  // 2. Real-Time Transaction Feed (/admin/transactions & /admin/users/[id] Coin Ledger)
  const { data: txs } = await db.from("wallet_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5);
  console.log(`\n2. Real-Time Admin Transaction Hub & Coin Ledger (${txs?.length} recent entries):`);
  console.table(txs?.map(t => ({
    Source: t.source,
    Amount: `$${t.amount}`,
    Type: t.transaction_type,
    Wallet: t.wallet_type,
    Description: t.description,
    Time: t.created_at,
  })));

  // 3. Deposit Cashier Admin (/admin/deposits)
  const { data: deposits } = await db.from("deposit_requests").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(3);
  console.log(`\n3. Admin Deposit Cashier (${deposits?.length} recent deposit requests):`);
  console.table(deposits?.map(d => ({
    Method: d.payment_method,
    Amount: `$${d.amount}`,
    Status: d.status,
    Time: d.created_at,
  })));
}

verifyAdminSync();
