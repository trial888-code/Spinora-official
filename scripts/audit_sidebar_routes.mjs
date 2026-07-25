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

async function auditSidebar() {
  console.log("=== Auditing All 13 Sidebar Sections & Supabase Queries ===");

  const results = [];

  // 1. Games Lobby
  const { data: games, error: gErr } = await db.from("games").select("id, name, is_active").limit(10);
  results.push({ Section: "1. Games Lobby", Status: gErr ? `❌ ${gErr.message}` : `🟢 OK (${games?.length} games found)` });

  // 2. Leaderboard
  const { data: profiles, error: lErr } = await db.from("profiles").select("id, full_name, wallet_balance").order("wallet_balance", { ascending: false }).limit(5);
  results.push({ Section: "2. Leaderboard", Status: lErr ? `❌ ${lErr.message}` : `🟢 OK (${profiles?.length} profiles found)` });

  // 3. Spin & Win Wheel / Reward Rules
  const { data: rules, error: rErr } = await db.from("reward_rules").select("id, key, name, coins").limit(5);
  results.push({ Section: "3. Spin & Win Wheel", Status: rErr ? `❌ ${rErr.message}` : `🟢 OK (${rules?.length ?? 0} rules found)` });

  // 4. Deposit Cashier (payment_methods or config)
  const { data: pm, error: pmErr } = await db.from("payment_methods").select("*").limit(5);
  results.push({ Section: "4. Deposit Cashier", Status: pmErr ? `❌ ${pmErr.message}` : `🟢 OK (${pm?.length ?? 0} methods found)` });

  // 5. Withdraw Winnings (requests or withdrawal_requests)
  const { data: wd, error: wdErr } = await db.from("requests").select("*").limit(5);
  results.push({ Section: "5. Withdraw Winnings", Status: wdErr ? `❌ Table missing/error: ${wdErr.message}` : `🟢 OK (${wd?.length ?? 0} requests found)` });

  // 6. Deposit History
  const { data: dh, error: dhErr } = await db.from("deposit_requests").select("*").limit(5);
  results.push({ Section: "6. Deposit History", Status: dhErr ? `❌ ${dhErr.message}` : `🟢 OK (${dh?.length ?? 0} deposit requests found)` });

  // 7. Wallet Activity
  const { data: wa, error: waErr } = await db.from("wallet_transactions").select("*").limit(5);
  results.push({ Section: "7. Wallet Activity", Status: waErr ? `❌ ${waErr.message}` : `🟢 OK (${wa?.length ?? 0} wallet txs found)` });

  // 8. Promotions & Offers
  const { data: promos, error: prErr } = await db.from("promotions").select("*").limit(5);
  results.push({ Section: "8. Promotions & Offers", Status: prErr ? `❌ ${prErr.message}` : `🟢 OK (${promos?.length ?? 0} promotions found)` });

  // 9. VIP Tier Status
  const { data: vip, error: vipErr } = await db.from("vip_tiers").select("*").limit(5);
  results.push({ Section: "9. VIP Tier Status", Status: vipErr ? `❌ ${vipErr.message}` : `🟢 OK (${vip?.length ?? 0} VIP tiers found)` });

  // 10. Missions & Rewards
  const { data: rc, error: rcErr } = await db.from("reward_claims").select("*").limit(5);
  results.push({ Section: "10. Missions & Rewards", Status: rcErr ? `❌ ${rcErr.message}` : `🟢 OK (${rc?.length ?? 0} claims found)` });

  // 11. Refer a Friend
  const { data: ref, error: refErr } = await db.from("profiles").select("id, referral_code").not("referral_code", "is", null).limit(5);
  results.push({ Section: "11. Refer a Friend", Status: refErr ? `❌ ${refErr.message}` : `🟢 OK (${ref?.length ?? 0} referral profiles found)` });

  // 12. ID Verification (KYC)
  const { data: kyc, error: kycErr } = await db.from("profiles").select("id, kyc_status, kyc_document_url").limit(5);
  results.push({ Section: "12. ID Verification (KYC)", Status: kycErr ? `❌ ${kycErr.message}` : `🟢 OK (${kyc?.length ?? 0} KYC records found)` });

  // 13. Support & Inbox
  const { data: tickets, error: tErr } = await db.from("support_tickets").select("*").limit(5);
  results.push({ Section: "13. Support & Inbox", Status: tErr ? `❌ ${tErr.message}` : `🟢 OK (${tickets?.length ?? 0} support tickets found)` });

  console.table(results);
}

auditSidebar();
