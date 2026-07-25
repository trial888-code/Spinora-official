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

async function fixNulls() {
  console.log("=== Setting default 0 for NULL vip_points across profiles ===");

  const { data: profiles } = await db.from("profiles").select("id, email, full_name, vip_points");
  
  for (const p of profiles || []) {
    if (p.vip_points === null || p.vip_points === undefined) {
      await db.from("profiles").update({ vip_points: 0 }).eq("id", p.id);
      console.log(`Updated ${p.full_name || p.email} vip_points to 0.`);
    }
  }

  const { data: updated } = await db.from("profiles").select("id, full_name, email, vip_points").order("vip_points", { ascending: false });
  console.log("\n🏆 Updated Leaderboard Standings:");
  console.table(updated?.map((p, i) => ({
    Rank: `#${i + 1}`,
    Name: p.full_name || p.email?.split("@")[0],
    Email: p.email,
    XP: `${p.vip_points ?? 0} XP`,
  })));
}

fixNulls();
