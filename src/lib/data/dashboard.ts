import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { GAMES } from "@/lib/games";
import type {
  Achievement,
  Profile,
  RewardRule,
  UserAchievement,
  VipTier,
} from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

/** UTC period keys — must mirror SQL period_key_for(). */
export function utcDateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function utcWeekKey(d = new Date()): string {
  // ISO week in UTC: IYYY-"W"IW
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day); // nearest Thursday
  const isoYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

export function utcMonthKey(d = new Date()): string {
  return d.toISOString().slice(0, 7); // YYYY-MM
}

/**
 * Auth guard for dashboard data — redirects when session is missing.
 * Wrapped in React `cache()` so every dashboard page that calls this (either
 * directly or via getDashboardCore/getRewardsOverview) shares one auth
 * round trip per request instead of each re-authenticating from scratch.
 */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");
  return { supabase, user };
});

export type StreamState = {
  rule: Pick<RewardRule, "key" | "name" | "description" | "reward_type" | "coins" | "xp" | "config">;
  claimed: boolean;
  /** for weekly/monthly streams */
  progress?: { current: number; required: number };
  /** for streak milestones */
  reached?: boolean;
};

export type DashboardCore = {
  profile: Profile;
  tier: Pick<VipTier, "key" | "name" | "rank" | "min_xp" | "reward_multiplier" | "color" | "benefits"> | null;
  nextTier: Pick<VipTier, "key" | "name" | "rank" | "min_xp"> | null;
  allTiers: Pick<VipTier, "key" | "name" | "rank" | "min_xp" | "reward_multiplier" | "color" | "benefits">[];
  unreadNotifications: number;
};

/**
 * Shared by layout + every dashboard page: profile, tier, unread count.
 * Wrapped in React `cache()` so the layout and page share one resolution
 * per request instead of each re-running the full auth + 4-query fetch.
 */
export const getDashboardCore = cache(async (): Promise<DashboardCore> => {
  const { supabase, user } = await requireUser();

  const [profileRes, tiersRes, statusRes, unreadRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("vip_tiers")
      .select("key, name, rank, min_xp, reward_multiplier, color, benefits")
      .eq("is_active", true)
      .order("rank"),
    supabase.from("vip_status").select("tier_id").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false),
  ]);

  const profile = profileRes.data;
  if (!profile) redirect("/login");

  const tiers = tiersRes.data ?? [];
  const xpTotal = Number(profile.vip_points ?? profile.xp ?? 0);
  let tier = null as DashboardCore["tier"];

  if (tiers.length) {
    tier =
      [...tiers].reverse().find((t) => Number(t.min_xp ?? 0) <= xpTotal) ??
      tiers[0] ??
      null;
  }

  const nextTier =
    tiers.find((t) => (tier ? t.rank === tier.rank + 1 : t.rank === 1)) ?? null;

  return {
    profile,
    tier,
    nextTier: nextTier
      ? { key: nextTier.key, name: nextTier.name, rank: nextTier.rank, min_xp: nextTier.min_xp }
      : null,
    allTiers: tiers,
    unreadNotifications: unreadRes.count ?? 0,
  };
});

export type RewardsOverview = {
  streams: StreamState[];
  multiplier: number;
};

/** Claimable state for every active reward stream. */
export async function getRewardsOverview(
  profile: Profile,
  multiplier: number
): Promise<RewardsOverview> {
  const { supabase, user } = await requireUser();

  const dayKey = utcDateKey();
  const weekKey = utcWeekKey();
  const monthKey = utcMonthKey();

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [rulesRes, claimsRes, txClaimsRes] = await Promise.all([
    supabase
      .from("reward_rules")
      .select("key, name, description, reward_type, coins, xp, config")
      .eq("is_active", true),
    supabase
      .from("reward_claims")
      .select("reward_type, period_key, claimed_at")
      .eq("user_id", user.id),
    supabase
      .from("wallet_transactions")
      .select("created_at")
      .eq("user_id", user.id)
      .eq("source", "reward_claim")
      .gte("created_at", oneDayAgo),
  ]);

  const rules = rulesRes.data ?? [];
  const claims = claimsRes.data ?? [];
  const hasTxClaimToday = (txClaimsRes.data ?? []).length > 0;

  const claimedKey = (type: string, key: string) =>
    (type === "daily" && hasTxClaimToday) ||
    claims.some((c) => c.reward_type === type && c.period_key === key);

  const dailyClaimsInWeek = claims.filter(
    (c) =>
      c.reward_type === "daily" &&
      utcWeekKey(new Date(c.claimed_at)) === weekKey
  ).length;
  const dailyClaimsInMonth = claims.filter(
    (c) =>
      c.reward_type === "daily" &&
      utcMonthKey(new Date(c.claimed_at)) === monthKey
  ).length;

  const streams: StreamState[] = rules
    .map((rule): StreamState | null => {
      const cfg = (rule.config ?? {}) as Record<string, unknown>;
      switch (rule.reward_type) {
        case "daily":
          return { rule, claimed: claimedKey("daily", dayKey) };
        case "weekly": {
          const required = Number(cfg.required_daily_claims ?? 0);
          return {
            rule,
            claimed: claimedKey("weekly", weekKey),
            progress: { current: Math.min(dailyClaimsInWeek, required), required },
          };
        }
        case "monthly": {
          const required = Number(cfg.required_daily_claims ?? 0);
          return {
            rule,
            claimed: claimedKey("monthly", monthKey),
            progress: { current: Math.min(dailyClaimsInMonth, required), required },
          };
        }
        case "streak_milestone": {
          const days = Number(cfg.days ?? 7);
          return {
            rule,
            claimed: claimedKey("streak_milestone", `streak-${days}`),
            reached: Number(profile.current_streak ?? 0) >= days,
            progress: { current: Math.min(Number(profile.current_streak ?? 0), days), required: days },
          };
        }
        case "seasonal": {
          const seasonKey = String(cfg.season_key ?? rule.key);
          return { rule, claimed: claimedKey("seasonal", seasonKey) };
        }
        default:
          return null;
      }
    })
    .filter((s): s is StreamState => s !== null);

  const order: Record<string, number> = {
    daily: 0, weekly: 1, monthly: 2, streak_milestone: 3, seasonal: 4,
  };
  streams.sort(
    (a, b) =>
      (order[a.rule.reward_type] ?? 9) - (order[b.rule.reward_type] ?? 9) ||
      a.rule.coins - b.rule.coins
  );

  return { streams, multiplier };
}

export type AchievementWithProgress = Pick<
  Achievement,
  "id" | "key" | "name" | "description" | "category" | "rarity" | "icon" | "condition_value" | "xp_reward" | "coins_reward"
> & {
  progress: number;
  unlocked_at: string | null;
};

export async function getAchievements(): Promise<AchievementWithProgress[]> {
  const { supabase, user } = await requireUser();

  const [achRes, userRes] = await Promise.all([
    supabase
      .from("achievements")
      .select(
        "id, key, name, description, category, rarity, icon, condition_value, xp_reward, coins_reward"
      )
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("user_achievements")
      .select("achievement_id, progress, unlocked_at")
      .eq("user_id", user.id),
  ]);

  const mine = new Map(
    (userRes.data ?? []).map((u: Pick<UserAchievement, "achievement_id" | "progress" | "unlocked_at">) => [
      u.achievement_id,
      u,
    ])
  );

  return (achRes.data ?? []).map((a) => ({
    ...a,
    progress: mine.get(a.id)?.progress ?? 0,
    unlocked_at: mine.get(a.id)?.unlocked_at ?? null,
  }));
}

export type ReferralStats = {
  code: string;
  total: number;
  qualified: number;
  rewarded: number;
  coinsEarned: number;
  recent: {
    id: string;
    username: string | null;
    status: string;
    created_at: string;
  }[];
};

export async function getReferralStats(profile: Profile): Promise<ReferralStats> {
  const { supabase, user } = await requireUser();

  const [refsRes, ledgerRes] = await Promise.all([
    supabase
      .from("referrals")
      .select("id, status, created_at, referred_id")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("ledger_entries")
      .select("amount")
      .eq("user_id", user.id)
      .eq("currency", "coins")
      .eq("entry_type", "referral_bonus"),
  ]);

  const refs = refsRes.data ?? [];
  const referredIds = refs.slice(0, 8).map((r) => r.referred_id);

  let usernames = new Map<string, string>();
  if (referredIds.length) {
    const { data: profiles } = await supabase.rpc("public_profiles_by_ids", {
      p_ids: referredIds,
    });
    usernames = new Map((profiles ?? []).map((p: { id: string; username: string }) => [p.id, p.username]));
  }

  return {
    code: profile.referral_code,
    total: refs.length,
    qualified: refs.filter((r) => r.status === "qualified" || r.status === "rewarded").length,
    rewarded: refs.filter((r) => r.status === "rewarded").length,
    coinsEarned: (ledgerRes.data ?? []).reduce((sum, e) => sum + e.amount, 0),
    recent: refs.slice(0, 8).map((r) => ({
      id: r.id,
      username: usernames.get(r.referred_id) ?? null,
      status: r.status,
      created_at: r.created_at,
    })),
  };
}

export async function getRecentActivity(limit = 8) {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("activity_log")
    .select("id, action, description, metadata, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getGameAccounts() {
  return getDashboardGameAccounts();
}

function staticGameMeta(slug: string) {
  const game = GAMES.find((g) => g.slug === slug);
  if (!game) return null;
  return { name: game.name, slug: game.slug, image_url: game.image, play_url: null as string | null };
}

function enrichAccountGames<T extends { games?: { slug: string; name: string; image_url: string | null; play_url: string | null } | null }>(
  row: T
): T {
  if (!row.games?.slug) return row;
  const meta = staticGameMeta(row.games.slug);
  if (!meta) return row;
  return {
    ...row,
    games: {
      ...row.games,
      name: row.games.name || meta.name,
      image_url: row.games.image_url || meta.image_url,
      play_url: row.games.play_url ?? meta.play_url,
    },
  };
}

/** Linked game accounts plus in-flight creates and legacy rows not yet in game_accounts. */
export type DashboardGameAccount = import("@/lib/database.types").GameAccount & {
  pending?: boolean;
};

export async function getLinkedGameSlugs(userId: string): Promise<string[]> {
  const accounts = await getDashboardGameAccountsForUser(userId);
  return accounts.map((a) => a.games?.slug).filter((s): s is string => Boolean(s));
}

async function getDashboardGameAccountsForUser(userId: string): Promise<DashboardGameAccount[]> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  if (!admin) return [];

  const { data: accounts, error: accountsError } = await admin
    .from("game_accounts")
    .select("*, games(name, slug, image_url, play_url)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (accountsError) {
    console.error("[getDashboardGameAccounts]", accountsError.message);
  }

  const list: DashboardGameAccount[] = ((accounts ?? []) as DashboardGameAccount[]).map(enrichAccountGames);
  const seenSlugs = new Set(
    list.map((a) => a.games?.slug).filter((s): s is string => Boolean(s))
  );

  const { data: inFlight } = await admin
    .from("game_load_requests")
    .select("game_slug, game_name, game_username, created_at, load_type")
    .eq("user_id", userId)
    .in("status", ["pending", "processing"])
    .in("load_type", ["create_account", "new_account"]);

  const pendingSlugs = [...new Set((inFlight ?? []).map((j) => j.game_slug).filter(Boolean))].filter(
    (slug) => !seenSlugs.has(slug)
  );

  if (pendingSlugs.length > 0) {
    const { data: games } = await admin
      .from("games")
      .select("id, name, slug, image_url, play_url")
      .in("slug", pendingSlugs);
    const gameBySlug = new Map((games ?? []).map((g) => [g.slug, g]));

    for (const job of inFlight ?? []) {
      if (!job.game_slug || seenSlugs.has(job.game_slug)) continue;
      const dbGame = gameBySlug.get(job.game_slug);
      const meta = dbGame
        ? enrichAccountGames({ games: dbGame }).games!
        : staticGameMeta(job.game_slug);
      if (!meta) continue;
      list.push({
        id: `pending-${job.game_slug}`,
        user_id: userId,
        game_id: dbGame?.id ?? `pending-${job.game_slug}`,
        game_username: job.game_username?.trim() || "creating…",
        game_user_id: null,
        credits_balance: 0,
        last_synced_at: null,
        created_at: job.created_at,
        updated_at: job.created_at,
        games: meta,
        pending: true,
      });
      seenSlugs.add(job.game_slug);
    }
  }

  const { data: completedOrphans } = await admin
    .from("game_load_requests")
    .select("game_slug, game_name, game_username, completed_at, created_at")
    .eq("user_id", userId)
    .eq("status", "completed")
    .in("load_type", ["create_account", "new_account"])
    .not("game_username", "is", null)
    .order("completed_at", { ascending: false });

  const orphanSlugs = [...new Set((completedOrphans ?? []).map((r) => r.game_slug).filter(Boolean))].filter(
    (slug) => !seenSlugs.has(slug)
  );

  if (orphanSlugs.length > 0) {
    const { data: games } = await admin
      .from("games")
      .select("id, name, slug, image_url, play_url")
      .in("slug", orphanSlugs);
    const gameBySlug = new Map((games ?? []).map((g) => [g.slug, g]));

    for (const row of completedOrphans ?? []) {
      if (!row.game_slug || seenSlugs.has(row.game_slug)) continue;
      const dbGame = gameBySlug.get(row.game_slug);
      const meta = dbGame
        ? enrichAccountGames({ games: dbGame }).games!
        : staticGameMeta(row.game_slug);
      if (!meta) continue;
      const ts = row.completed_at ?? row.created_at;
      list.push({
        id: `orphan-${row.game_slug}`,
        user_id: userId,
        game_id: dbGame?.id ?? `orphan-${row.game_slug}`,
        game_username: row.game_username!,
        game_user_id: null,
        credits_balance: 0,
        last_synced_at: row.completed_at,
        created_at: ts,
        updated_at: ts,
        games: {
          ...meta,
          name: row.game_name || meta.name,
        },
      });
      seenSlugs.add(row.game_slug);
    }
  }

  return list;
}

export async function getDashboardGameAccounts(): Promise<DashboardGameAccount[]> {
  const { user } = await requireUser();
  return getDashboardGameAccountsForUser(user.id);
}

export async function getGameAccountSummary() {
  const accounts = await getDashboardGameAccounts();
  const linked = accounts.filter((a) => !a.pending).length;
  const pending = accounts.filter((a) => a.pending).length;
  return { total: accounts.length, linked, pending };
}

/** Real-money wallet (deposit + cash-out) + recent ledger for the signed-in user. */
export async function getWalletData() {
  const { supabase, user } = await requireUser();
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const db = createAdminClient() ?? supabase;

  const [{ data: profile }, { data: transactions }] = await Promise.all([
    db
      .from("profiles")
      .select("wallet_balance, cashout_wallet")
      .eq("id", user.id)
      .single(),
    db
      .from("wallet_transactions")
      .select("id, amount, wallet_type, transaction_type, source, description, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return {
    balance: Number(profile?.wallet_balance ?? 0),
    cashout: Number(profile?.cashout_wallet ?? 0),
    transactions: (transactions ?? []) as import("@/lib/wallet/transaction-display").WalletTransactionRow[],
  };
}

export async function getUserDepositsData() {
  const { supabase, user } = await requireUser();
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const db = createAdminClient() ?? supabase;

  const [{ data: deposits }, { data: txDeposits }] = await Promise.all([
    db
      .from("deposit_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("wallet_transactions")
      .select("id, amount, transaction_type, source, description, created_at")
      .eq("user_id", user.id)
      .in("transaction_type", ["credit", "adjustment"])
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const reqs = (deposits ?? []).map((d: any) => ({
    id: String(d.id),
    game_name: String(d.game_name || "Spinora Wallet"),
    payment_method: String(d.payment_method || "direct"),
    status: String(d.status || "completed"),
    amount: d.amount ? Number(d.amount) : null,
    proof_url: (d.proof_url as string) || null,
    created_at: String(d.created_at),
  }));

  const txs = (txDeposits ?? []).map((t) => ({
    id: `tx-${t.id}`,
    game_name: "Spinora Wallet",
    payment_method: String(t.source || "deposit"),
    status: "completed",
    amount: Number(t.amount ?? 0),
    proof_url: null,
    created_at: String(t.created_at),
  }));

  const combined = [...reqs, ...txs];
  combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return combined;
}

/**
 * Active, automation-enabled games the player hasn't linked yet — i.e. the games
 * they can self-create an account for. Uses the admin client because
 * game_server_configs is service-role only.
 */
export async function getCreatableGames() {
  const { user } = await requireUser();
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const db = admin ?? (await createClient());

  const [{ data: cfgs }, { data: linked }, { data: jobs }] = await Promise.all([
    db.from("game_server_configs").select("game_id").eq("is_enabled", true),
    db.from("game_accounts").select("game_id, games(slug)").eq("user_id", user.id),
    db
      .from("game_load_requests")
      .select("game_slug")
      .eq("user_id", user.id)
      .in("status", ["pending", "processing"]),
  ]);

  const enabledIds = new Set((cfgs ?? []).map((c) => c.game_id));
  const linkedSlugs = new Set(
    (linked ?? []).map((l) => (l.games as unknown as { slug?: string } | null)?.slug).filter(Boolean)
  );
  const busySlugs = new Set((jobs ?? []).map((j) => j.game_slug));

  // If DB game_server_configs is unpopulated, include all live games from GAMES catalog
  const catalogGames = GAMES.filter((g) => !g.upcoming).map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    image_url: g.image,
  }));

  return catalogGames.filter((g) => !linkedSlugs.has(g.slug) && !busySlugs.has(g.slug));
}

export type CreatableGame = { id: string; name: string; slug: string; image_url: string | null };

export type ActiveJob = { loadType: string; status: string };

/**
 * In-flight bot jobs for the signed-in user, keyed by game_slug (latest per game).
 * Drives "Creating…/Loading…/Redeeming…" pills on account cards. The user can
 * read their own game_load_requests rows via RLS.
 */
export async function getActiveJobsByGame(): Promise<Record<string, ActiveJob>> {
  const { supabase, user } = await requireUser();
  const { data } = await supabase
    .from("game_load_requests")
    .select("game_slug, load_type, status, created_at")
    .eq("user_id", user.id)
    .in("status", ["pending", "processing"])
    .order("created_at", { ascending: false });

  const map: Record<string, ActiveJob> = {};
  for (const j of data ?? []) {
    if (!map[j.game_slug]) map[j.game_slug] = { loadType: j.load_type, status: j.status };
  }
  return map;
}
