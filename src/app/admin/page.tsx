import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  BadgePercent,
  CheckCircle2,
  Coins,
  Inbox,
  LifeBuoy,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { GlassCard } from "@/components/shared/glass-card";
import { StatCard } from "@/components/shared/stat-card";
import { adminDb } from "@/lib/actions/admin/core";
import {
  ADMIN_PROFILE_SELECT,
  profileDisplayName,
  profileHandle,
} from "@/lib/admin/spinora-profile";
import { requireStaff } from "@/lib/data/admin";
import { getDashboardStats } from "@/lib/data/admin-stats";
import { AdminGameBotWorkerCard } from "@/components/admin/admin-game-bot-worker-card";

export default async function AdminOverviewPage() {
  const ctx = await requireStaff();
  const db = adminDb();

  const since7d = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [
    stats,
    new7d,
    activePromos,
    pendingReferrals,
    recentSignups,
    recentTickets,
    fulfilledRequests,
    paymentOrdersCount,
  ] = await Promise.all([
    getDashboardStats(86_400_000),
    db.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since7d),
    db.from("promotions").select("id", { count: "exact", head: true }).eq("status", "active"),
    db.from("referrals").select("id", { count: "exact", head: true }),
    db
      .from("profiles")
      .select(ADMIN_PROFILE_SELECT)
      .order("created_at", { ascending: false })
      .limit(6),
    db.from("support_tickets").select("id, ticket_no, subject, status, created_at").order("created_at", { ascending: false }).limit(6),
    db.from("deposit_requests").select("id", { count: "exact", head: true }).eq("status", "completed"),
    db.from("payment_orders").select("id", { count: "exact", head: true }).eq("status", "paid"),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminPageHeader
        title="Overview & Pulse"
        description={`Welcome back, ${ctx.email ?? "Admin"}. Here's the live automated status of Spinora.`}
      />

      {/* Primary Key Metric Cards with Non-Tech Explanations */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Registered Players"
          value={stats.totalUsers.toLocaleString()}
          delta={stats.newUsersInWindow}
          deltaLabel="new today"
          icon={<Users />}
          accent="cyan"
        />
        <StatCard
          label="New Signups This Week"
          value={(new7d.count ?? 0).toLocaleString()}
          icon={<TrendingUp />}
          accent="emerald"
        />
        <StatCard
          label="Reward Coins Claimed (24h)"
          value={stats.coinsIssuedInWindow.toLocaleString()}
          icon={<Coins />}
          accent="gold"
        />
        <StatCard
          label="Active Bonus Promos"
          value={(activePromos.count ?? 0).toLocaleString()}
          icon={<BadgePercent />}
          accent="purple"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="AI Payment Verifications"
          value={((paymentOrdersCount.count ?? 0) + (fulfilledRequests.count ?? 0)).toLocaleString()}
          icon={<ShieldCheck />}
          accent="cyan"
        />
        <StatCard
          label="Open Support Tickets"
          value={stats.openTickets.toLocaleString()}
          icon={<LifeBuoy />}
          accent="purple"
        />
        <StatCard
          label="Pending Review Items"
          value={stats.pendingRequests.toLocaleString()}
          icon={<Inbox />}
          accent="gold"
        />
        <StatCard
          label="Completed Deposits"
          value={(fulfilledRequests.count ?? 0).toLocaleString()}
          icon={<CheckCircle2 />}
          accent="emerald"
        />
      </div>

      {/* 🎮 Juwa 777 & Game Platform Bot Worker Control Card */}
      <div>
        <AdminGameBotWorkerCard />
      </div>

      {/* Non-Coder Friendly Quick Action Command Center */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-400" />
              1-Click Admin Quick Controls
            </h2>
            <p className="text-xs text-muted-foreground">Easy shortcuts to manage payments, AI tools, Telegram bot, and players without technical code.</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Easy Admin View
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Highlighted AI Payment Verification */}
          <Link
            href="/admin/payment-verification"
            className="flex items-center gap-3 p-3.5 rounded-xl border border-cyan-500/50 bg-cyan-500/15 hover:bg-cyan-500/25 transition-all group col-span-1 sm:col-span-2"
          >
            <div className="flex size-11 items-center justify-center rounded-lg bg-cyan-500/30 text-cyan-300 group-hover:scale-110 transition-transform font-bold text-xl">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-foreground">AI Payment Verification & Telegram</p>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-bold">1-Click Control</span>
              </div>
              <p className="text-xs text-muted-foreground">Verify screenshots, approve deposits & broadcast Telegram promos</p>
            </div>
          </Link>

          <Link
            href="/admin/deposits"
            className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 transition-all group"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/30 text-amber-300 group-hover:scale-110 transition-transform">
              💳
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Deposit Requests</p>
              <p className="text-xs text-muted-foreground">View & load player balance</p>
            </div>
          </Link>

          <Link
            href="/admin/payouts"
            className="flex items-center gap-3 p-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all group"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/30 text-emerald-300 group-hover:scale-110 transition-transform">
              💵
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Cash-out Payouts</p>
              <p className="text-xs text-muted-foreground">Fulfill player redeems</p>
            </div>
          </Link>

          <Link
            href="/admin/users"
            className="flex items-center gap-3 p-3 rounded-lg border border-indigo-500/40 bg-indigo-500/10 hover:bg-indigo-500/20 transition-all group"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-indigo-500/30 text-indigo-300 group-hover:scale-110 transition-transform">
              👥
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Users & Players</p>
              <p className="text-xs text-muted-foreground">View levels & edit profiles</p>
            </div>
          </Link>

          <Link
            href="/admin/crm"
            className="flex items-center gap-3 p-3 rounded-lg border border-purple-500/40 bg-purple-500/10 hover:bg-purple-500/20 transition-all group"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-purple-500/30 text-purple-300 group-hover:scale-110 transition-transform">
              👑
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">CRM & VIP Players</p>
              <p className="text-xs text-muted-foreground">VIP levels & segments</p>
            </div>
          </Link>

          <Link
            href="/admin/telegram"
            className="flex items-center gap-3 p-3 rounded-lg border border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 transition-all group"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-sky-500/30 text-sky-300 group-hover:scale-110 transition-transform">
              🚀
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Telegram Bot Autopilot</p>
              <p className="text-xs text-muted-foreground">Bot status & broadcasts</p>
            </div>
          </Link>

          <Link
            href="/admin/promotions"
            className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background/50 hover:bg-amber-500/10 hover:border-amber-500/40 transition-all group"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
              🎟️
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Bonus Promos</p>
              <p className="text-xs text-muted-foreground">Manage promo codes</p>
            </div>
          </Link>

          <Link
            href="/admin/ai-blog"
            className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background/50 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all group"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
              ✨
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">AI Auto Blog</p>
              <p className="text-xs text-muted-foreground">Generate news posts</p>
            </div>
          </Link>

          <Link
            href="/admin/games"
            className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background/50 hover:bg-rose-500/10 hover:border-rose-500/40 transition-all group"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400 group-hover:scale-110 transition-transform">
              🎮
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Manage Games</p>
              <p className="text-xs text-muted-foreground">Catalog & platforms</p>
            </div>
          </Link>

          <Link
            href="/admin/settings"
            className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background/50 hover:bg-teal-500/10 hover:border-teal-500/40 transition-all group"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-teal-500/20 text-teal-400 group-hover:scale-110 transition-transform">
              ⚙️
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Site Settings</p>
              <p className="text-xs text-muted-foreground">Cashtags & configs</p>
            </div>
          </Link>
        </div>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Newest members</h2>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1 text-xs font-medium text-cyan-400 underline-offset-4 hover:underline"
            >
              All users
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-foreground/8">
            {(recentSignups.data ?? []).map((u) => (
              <li key={u.id} className="flex items-center justify-between py-2.5">
                <span className="text-sm font-medium">
                  {profileDisplayName(u)}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {profileHandle(u)}
                  </span>
                </span>
                <time
                  dateTime={u.created_at}
                  className="text-xs text-muted-foreground"
                >
                  {formatDistanceToNow(new Date(u.created_at!), { addSuffix: true })}
                </time>
              </li>
            ))}
          </ul>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Latest support tickets</h2>
            <Link
              href="/admin/chat"
              className="inline-flex items-center gap-1 text-xs font-medium text-cyan-400 underline-offset-4 hover:underline"
            >
              Live Chat & Support
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-foreground/8">
            {(recentTickets.data ?? []).length === 0 ? (
              <li className="py-2.5 text-sm text-muted-foreground">
                No open tickets. All player support chats clear!
              </li>
            ) : (
              (recentTickets.data ?? []).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link
                    href="/admin/chat"
                    className="min-w-0 flex-1 truncate text-sm font-medium hover:text-emerald-400"
                  >
                    <span className="tnum text-xs text-muted-foreground">
                      #{t.ticket_no}
                    </span>{" "}
                    {t.subject}
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground uppercase font-bold">
                    {t.status}
                  </span>
                </li>
              ))
            )}
          </ul>
        </GlassCard>
      </div>
    </div>
  );
}
