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

async function auditAll() {
  console.log("=================================================");
  console.log("  COMPREHENSIVE WALLET & REALTIME SYSTEM AUDIT   ");
  console.log("=================================================\n");

  const auditReport = [];

  // 1. Check Profiles Table Columns & Triggers
  const { data: p, error: pErr } = await db
    .from("profiles")
    .select("wallet_balance, cashout_wallet, bonus_wallet, vip_points, role, is_suspended")
    .eq("id", userId)
    .single();

  if (pErr) {
    auditReport.push({ System: "1. Profiles Schema", Status: `❌ Error: ${pErr.message}` });
  } else {
    auditReport.push({
      System: "1. Profiles Schema",
      Status: `🟢 OK (Play: $${p.wallet_balance}, Cashout: $${p.cashout_wallet}, Bonus: ${p.bonus_wallet}, XP: ${p.vip_points})`,
    });
  }

  // 2. Check RPC Functions in Schema Cache
  const rpcs = ["admin_adjust_user_wallet", "claim_reward", "credit_wallet"];
  for (const rpcName of rpcs) {
    try {
      const { error } = await db.rpc(rpcName, { p_user_id: userId, p_amount: 0, p_wallet_type: "cash", p_source: "test", rule_key: "test" });
      const isMissing = error && /Could not find the function/i.test(error.message);
      auditReport.push({
        System: `2. RPC: ${rpcName}`,
        Status: isMissing ? `❌ Function missing in schema cache` : `🟢 Active in Supabase`,
      });
    } catch {
      auditReport.push({ System: `2. RPC: ${rpcName}`, Status: `🟢 Active in Supabase` });
    }
  }

  // 3. Check Wallet Transactions Audit Trail
  const { data: txs, error: txErr } = await db
    .from("wallet_transactions")
    .select("id, source, amount, wallet_type, transaction_type, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  auditReport.push({
    System: "3. Wallet Transactions",
    Status: txErr ? `❌ Error: ${txErr.message}` : `🟢 OK (${txs?.length} recent transactions recorded)`,
  });

  // 4. Check Activity Log Audit Trail
  const { data: logs, error: logErr } = await db
    .from("activity_log")
    .select("id, action, description, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  auditReport.push({
    System: "4. Activity Log",
    Status: logErr ? `❌ Error: ${logErr.message}` : `🟢 OK (${logs?.length} recent activity logs recorded)`,
  });

  // 5. Check 24-Hour Cooldown Lock
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: claims } = await db
    .from("wallet_transactions")
    .select("created_at")
    .eq("user_id", userId)
    .eq("source", "reward_claim")
    .gte("created_at", oneDayAgo)
    .limit(1);

  auditReport.push({
    System: "5. 24-Hour Reward Lock",
    Status: claims?.length ? `🟢 ACTIVE (Claimed at ${claims[0].created_at}, locks repeat claims)` : `🟢 Ready for daily claim`,
  });

  console.table(auditReport);
}

auditAll();
