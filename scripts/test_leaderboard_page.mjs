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

async function testLeaderboard() {
  console.log("=== Testing Leaderboard Fetch for Dashboard ===");

  const { data: topProfiles } = await db
    .from("profiles")
    .select("id, full_name, email, avatar_url, level, vip_points, role")
    .order("vip_points", { ascending: false });

  console.log(`Found ${topProfiles?.length ?? 0} player profiles for Leaderboard:`);
  console.table((topProfiles ?? []).map((p, i) => ({
    Rank: `#${i + 1}`,
    Name: p.full_name || p.email?.split("@")[0] || "Player",
    Email: p.email,
    XP: `${p.vip_points ?? 0} XP`,
    Level: `Lvl ${p.level ?? 1}`,
  })));
}

testLeaderboard();
