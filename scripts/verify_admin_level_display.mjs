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

async function verifyAdminLevel() {
  console.log("=== Verifying Admin Panel Level Display Output ===");

  const { data: users } = await db.from("profiles").select("id, full_name, email, vip_points, bonus_wallet, wallet_balance").order("vip_points", { ascending: false });

  console.table((users || []).map((u) => {
    const xp = Number(u.vip_points ?? 0);
    const level = Math.max(1, Math.floor(xp / 500) + 1);

    return {
      Member: u.full_name || u.email?.split("@")[0],
      Email: u.email,
      "Admin Panel Level": `Lv. ${level}`,
      "Total XP": `${xp} XP`,
      "Play Wallet": `$${u.wallet_balance ?? 0}`,
    };
  }));
}

verifyAdminLevel();
