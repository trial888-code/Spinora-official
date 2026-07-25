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

async function verifyLevelAndTier() {
  console.log("=== Verifying Dynamic Player Level & VIP Tier Calculations ===");

  const { data: profiles } = await db
    .from("profiles")
    .select("id, full_name, email, vip_points")
    .order("vip_points", { ascending: false });

  console.table((profiles ?? []).map((p) => {
    const xp = Number(p.vip_points ?? 0);
    const level = Math.max(1, Math.floor(xp / 500) + 1);

    let tierName = "VIP BRONZE";
    if (xp >= 5000) tierName = "VIP PLATINUM";
    else if (xp >= 2000) tierName = "VIP GOLD";
    else if (xp >= 500) tierName = "VIP SILVER";

    return {
      Name: p.full_name || p.email?.split("@")[0],
      "XP Points": `${xp} XP`,
      "Dynamic Level": `Lv. ${level}`,
      "Dynamic VIP Tier": tierName,
    };
  }));
}

verifyLevelAndTier();
