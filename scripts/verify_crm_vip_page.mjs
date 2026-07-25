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

async function verifyCrmVipPage() {
  console.log("=== Verifying CRM VIP Segment Page Output ===");

  const { data: profiles } = await db
    .from("profiles")
    .select("id, full_name, email, vip_points, bonus_wallet, wallet_balance, created_at")
    .gt("vip_points", 0)
    .order("created_at", { ascending: false });

  console.log(`🟢 Successfully fetched ${profiles?.length} VIP players for CRM VIP Segment:`);
  console.table((profiles || []).map((p) => {
    const pts = Number(p.vip_points ?? 0);
    let vipName = "Bronze";
    if (pts >= 5000) vipName = "Platinum";
    else if (pts >= 2000) vipName = "Gold";
    else if (pts >= 500) vipName = "Silver";

    return {
      Member: p.full_name || p.email?.split("@")[0],
      Email: p.email,
      "VIP Points": `${pts} pts`,
      "VIP Badge": vipName,
      Level: `Lv. ${Math.max(1, Math.floor(pts / 500) + 1)}`,
      Wallet: `$${p.wallet_balance ?? 0}`,
    };
  }));
}

verifyCrmVipPage();
