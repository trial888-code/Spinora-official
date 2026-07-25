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
const id = "c1931a25-745b-42aa-a3d4-857d267cdf31";

async function verify() {
  console.log("=== Verifying Leaderboard & VIP Unlocking ===");

  // 1. Check User XP & Tier threshold
  const { data: p } = await db.from("profiles").select("full_name, email, vip_points").eq("id", id).single();
  const { data: tiers } = await db.from("vip_tiers").select("*").order("rank");

  const xp = Number(p?.vip_points ?? 0);
  const currentTier = [...(tiers ?? [])].reverse().find((t) => Number(t.min_xp ?? 0) <= xp) ?? tiers?.[0];

  console.log(`Player: ${p?.full_name} (${p?.email})`);
  console.log(`XP Points: ${xp}`);
  console.log(`Unlocked VIP Tier: 👑 ${currentTier?.name} (Rank ${currentTier?.rank}, Min XP ${currentTier?.min_xp})`);

  // 2. Check Leaderboard Rankings
  const { data: top } = await db.from("profiles").select("full_name, email, vip_points").order("vip_points", { ascending: false }).limit(10);
  console.log("\n🏆 Live Leaderboard Standings:");
  console.table((top ?? []).map((row, i) => ({
    Rank: `#${i + 1}`,
    Name: row.full_name || row.email?.split("@")[0],
    Score: `${row.vip_points ?? 0} XP`,
  })));
}

verify();
