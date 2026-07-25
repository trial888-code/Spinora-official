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

async function syncTiers() {
  console.log("=== Syncing Database profiles.vip_tier Column with Points ===");

  const { data: profiles } = await db.from("profiles").select("id, email, full_name, vip_points, vip_tier");

  for (const p of profiles || []) {
    const points = Number(p.vip_points ?? 0);
    let newTier = "bronze";
    if (points >= 5000) newTier = "platinum";
    else if (points >= 2000) newTier = "gold";
    else if (points >= 500) newTier = "silver";

    if (p.vip_tier !== newTier) {
      await db.from("profiles").update({ vip_tier: newTier }).eq("id", p.id);
      console.log(`Updated ${p.full_name || p.email}: ${p.vip_tier} ➔ ${newTier.toUpperCase()} (${points} pts)`);
    }
  }

  const { data: updated } = await db.from("profiles").select("id, full_name, email, vip_points, vip_tier").order("vip_points", { ascending: false });
  console.log("\n👑 Updated Database Profiles VIP Tier Standings:");
  console.table(updated?.map((p) => ({
    Name: p.full_name || p.email?.split("@")[0],
    Email: p.email,
    Points: `${p.vip_points ?? 0} pts`,
    DB_VipTier: (p.vip_tier ?? "bronze").toUpperCase(),
  })));
}

syncTiers();
