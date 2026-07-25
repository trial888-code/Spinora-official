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

async function testPublicLeaderboard() {
  console.log("=== Testing Public Leaderboard Data Fetch ===");

  const { data: topProfiles, error } = await db
    .from("profiles")
    .select("id, full_name, email, avatar_url, level, vip_points")
    .order("vip_points", { ascending: false });

  if (error) console.error("Error:", error.message);
  console.log(`Public Leaderboard: Found ${topProfiles?.length ?? 0} player rows:`);
  console.table((topProfiles ?? []).map((p, i) => ({
    Rank: `#${i + 1}`,
    Name: p.full_name || p.email?.split("@")[0],
    Score: `${p.vip_points ?? 0} XP`,
  })));
}

testPublicLeaderboard();
