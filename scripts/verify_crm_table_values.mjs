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

async function verifyCrmTable() {
  console.log("=== Verifying Admin CRM Table Level & Coins Values ===");

  const { data: users } = await db.from("profiles").select("id, full_name, email, vip_points, bonus_wallet, coins_balance, created_at").order("created_at", { ascending: false });

  console.table((users || []).map((u) => {
    const pts = Number(u.vip_points ?? 0);
    const coins = Number(u.bonus_wallet ?? u.coins_balance ?? 0);
    const level = Math.max(1, Math.floor(pts / 500) + 1);

    let vipBadge = "Bronze";
    if (pts >= 5000) vipBadge = "Platinum";
    else if (pts >= 2000) vipBadge = "Gold";
    else if (pts >= 500) vipBadge = "Silver";

    return {
      Member: u.full_name || u.email?.split("@")[0],
      Email: u.email,
      "CRM Level": `Lv ${level}`,
      "VIP Badge": vipBadge,
      "Reward Coins": `${coins} Coins`,
      "VIP Points": `${pts} XP`,
    };
  }));
}

verifyCrmTable();
