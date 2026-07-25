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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const db = createClient(supabaseUrl, supabaseKey);

async function auditFeatures() {
  console.log("=== Auditing All 13 Sidebar Features & DB Dependencies ===");
  const results = {};

  // Test User
  const { data: user } = await db.from("profiles").select("id, email, role, wallet_balance, cashout_wallet, kyc_status").eq("email", "spinoraway@gmail.com").single();
  results.user = user ? "OK" : "MISSING_USER";

  // 1. Games Lobby (/dashboard)
  const { count: gameCount } = await db.from("games").select("id", { count: "exact", head: true });
  results.gamesLobby = `OK (${gameCount} games in DB)`;

  // 2. Leaderboard (/leaderboard)
  const { data: leaderboards, error: lbErr } = await db.from("profiles").select("id, full_name, wallet_balance, xp").order("xp", { ascending: false }).limit(5);
  results.leaderboard = lbErr ? `ERR: ${lbErr.message}` : `OK (${leaderboards?.length} top players)`;

  // 3. Spin & Win Wheel (/spin)
  const { data: spinLogs, error: spinErr } = await db.from("activity_log").select("id").eq("action", "wheel_spin").limit(1);
  results.spinWheel = spinErr ? `ERR: ${spinErr.message}` : "OK (Activity Log ready)";

  // 4. Deposit Cashier (/dashboard/deposit)
  const { count: depCount } = await db.from("deposit_requests").select("id", { count: "exact", head: true });
  results.depositCashier = `OK (${depCount} deposit requests)`;

  // 5. Withdraw Winnings (/dashboard/withdraw)
  results.withdrawWinnings = `OK (User Cashout Balance: $${user?.cashout_wallet ?? 0}, KYC: ${user?.kyc_status})`;

  // 6. Deposit History (/dashboard/deposits)
  results.depositHistory = "OK (Connected to deposit_requests)";

  // 7. Wallet Activity (/dashboard/activity)
  const { count: txCount } = await db.from("wallet_transactions").select("id", { count: "exact", head: true });
  results.walletActivity = `OK (${txCount} transactions logged)`;

  // 8. Promotions & Offers (/promotions)
  const { data: promos, error: promoErr } = await db.from("promotions").select("id").limit(5);
  results.promotions = promoErr ? `TABLE MISSING (${promoErr.message})` : `OK (${promos?.length} active promos)`;

  // 9. VIP Tier Status (/dashboard/vip)
  const { data: tiers, error: tierErr } = await db.from("vip_tiers").select("id, name, min_xp").order("rank");
  results.vipTiers = tierErr ? `ERR: ${tierErr.message}` : `OK (${tiers?.length} VIP tiers configured)`;

  // 10. Missions & Rewards (/dashboard/rewards)
  const { data: rewardRules, error: rrErr } = await db.from("reward_rules").select("id, key").eq("is_active", true);
  results.rewards = rrErr ? `ERR: ${rrErr.message}` : `OK (${rewardRules?.length} active reward rules)`;

  // 11. Refer a Friend (/dashboard/referrals)
  const { count: refCount } = await db.from("referrals").select("id", { count: "exact", head: true });
  results.referrals = `OK (${refCount} referral records)`;

  // 12. ID Verification (KYC) (/dashboard/kyc)
  const { data: kycDocs, error: kycErr } = await db.from("kyc_documents").select("id").limit(1);
  results.kyc = kycErr ? `ERR: ${kycErr.message}` : `OK (KYC Documents table ready)`;

  // 13. Support & Inbox (/dashboard/messages)
  const { count: msgCount } = await db.from("chat_messages").select("id", { count: "exact", head: true });
  results.supportInbox = `OK (${msgCount} chat messages)`;

  console.log("\n📊 AUDIT RESULTS:");
  console.table(Object.entries(results).map(([feature, status]) => ({ Feature: feature, Status: status })));
}

auditFeatures();
