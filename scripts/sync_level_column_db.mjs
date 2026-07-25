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

async function syncLevelColumn() {
  console.log("=== Syncing PostgreSQL profiles.level Column with Total XP ===");

  const { data: profiles } = await db.from("profiles").select("id, email, full_name, vip_points, level");

  for (const p of profiles || []) {
    const points = Number(p.vip_points ?? 0);
    const calcLevel = Math.max(1, Math.floor(points / 500) + 1);

    if (p.level !== calcLevel) {
      await db.from("profiles").update({ level: calcLevel }).eq("id", p.id);
      console.log(`Updated ${p.full_name || p.email}: Level ${p.level ?? 1} ➔ Lv. ${calcLevel} (${points} XP)`);
    }
  }

  const { data: updated } = await db.from("profiles").select("id, full_name, email, vip_points, level, vip_tier").order("vip_points", { ascending: false });
  console.log("\n👑 Admin Panel Database Standings:");
  console.table(updated?.map((p) => ({
    Name: p.full_name || p.email?.split("@")[0],
    Email: p.email,
    XP: `${p.vip_points ?? 0} XP`,
    DB_Level: `Lv. ${p.level}`,
    DB_VipTier: (p.vip_tier ?? "bronze").toUpperCase(),
  })));
}

syncLevelColumn();
