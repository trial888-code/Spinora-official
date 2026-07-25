import { createClient } from "@/lib/supabase/server";
import {
  utcDateKey,
  utcMonthKey,
  utcWeekKey,
} from "@/lib/data/dashboard";
import type { LeaderboardPeriod } from "@/lib/database.types";

export const LEADERBOARD_PERIODS: {
  key: LeaderboardPeriod;
  label: string;
}[] = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "all_time", label: "All Time" },
];

export function periodKeyFor(period: LeaderboardPeriod): string {
  switch (period) {
    case "daily":
      return utcDateKey();
    case "weekly":
      return utcWeekKey();
    case "monthly":
      return utcMonthKey();
    case "all_time":
      return "all";
  }
}

export type LeaderboardRow = {
  user_id: string;
  rank: number;
  score: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  level: number;
  country: string | null;
};

export type LeaderboardView = {
  period: LeaderboardPeriod;
  rows: LeaderboardRow[];
  me: LeaderboardRow | null;
};

export async function getLeaderboard(
  period: LeaderboardPeriod,
  limit = 50,
  currentUserId?: string
): Promise<LeaderboardView> {
  const supabase = await createClient();

  const { data: topProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, vip_points")
    .order("vip_points", { ascending: false })
    .limit(limit);

  const rows: LeaderboardRow[] = (topProfiles ?? []).map((p, idx) => ({
    user_id: p.id,
    rank: idx + 1,
    score: Number(p.vip_points ?? 0),
    username: p.full_name || p.email?.split("@")[0] || "Player",
    display_name: p.full_name || p.email?.split("@")[0] || "Player",
    avatar_url: p.avatar_url ?? null,
    level: 1,
    country: "US",
  }));

  const me = currentUserId ? rows.find((r) => r.user_id === currentUserId) ?? null : null;
  return { period, rows, me };
}

export function isLeaderboardPeriod(value: string): value is LeaderboardPeriod {
  return ["daily", "weekly", "monthly", "all_time"].includes(value);
}
