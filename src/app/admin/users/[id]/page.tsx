import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Ban } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { UserManagementPanel } from "@/components/admin/user-management-panel";
import { GlassCard } from "@/components/shared/glass-card";
import { TierBadge } from "@/components/shared/tier-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminDb } from "@/lib/actions/admin/core";
import {
  profileDisplayName,
  profileHandle,
  profileInitials,
  profileIsBanned,
  profileNum,
  type SpinoraProfileRow,
} from "@/lib/admin/spinora-profile";
import { requirePermission, can } from "@/lib/data/admin";
import type { VipTierKey } from "@/lib/database.types";

export const metadata: Metadata = { title: "Member Details" };

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  contacted: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  fulfilled: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  rejected:  "bg-rose-500/15 text-rose-400 border border-rose-500/30",
};

const ENTRY_TYPE_COLORS: Record<string, string> = {
  daily_claim:  "bg-emerald-500/15 text-emerald-400",
  referral:     "bg-purple-500/15 text-purple-400",
  promotion:    "bg-amber-500/15 text-amber-400",
  achievement:  "bg-blue-500/15 text-blue-400",
  admin_grant:  "bg-cyan-500/15 text-cyan-400",
};

const TICKET_STATUS_COLORS: Record<string, string> = {
  open:        "bg-emerald-500/15 text-emerald-400",
  in_progress: "bg-blue-500/15 text-blue-400",
  pending:     "bg-amber-500/15 text-amber-400",
  resolved:    "bg-foreground/10 text-muted-foreground",
  closed:      "bg-foreground/8 text-muted-foreground",
};

const CATEGORY_LABEL: Record<string, string> = {
  account: "Account", rewards: "Rewards", vip: "VIP",
  referrals: "Referrals", technical: "Technical", other: "Other",
};

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requirePermission("users.manage");
  const { id } = await params;
  const db = adminDb();

  const { data: profile } = await db
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!profile) notFound();
  const p = profile as SpinoraProfileRow;

  const { data: authUser } = await db.auth.admin.getUserById(id);
  const email = authUser?.user?.email ?? p.email ?? null;

  // Roles available for staff assignment
  const allRoles: Array<{ key: string; name: string }> = [
    { key: "admin", name: "Admin (Full Access)" },
    { key: "manager", name: "Manager" },
    { key: "support_agent", name: "Support Agent" },
    { key: "customer", name: "Customer / Player" },
  ];

  const primaryRole = (p.role || "customer").toLowerCase();
  const userRoleKeys: string[] = [primaryRole];

  let vipTier: VipTierKey | undefined = undefined;
  let ledger: Array<{ id: string; currency: string; amount: number; entry_type: string; description: string | null; created_at: string }> = [];
  let spinoraDeposits: Array<{ id: string; game_name: string; payment_method: string; amount: number; status: string; created_at: string; reviewed_at: string | null }> = [];
  let deposits: Array<{ id: string; reference_code: string; request_type: string; deposit_amount: number; payment_method: string; status: string; created_at: string; resolved_at: string | null; games: { name: string } | null }> = [];
  let tickets: Array<{ id: string; ticket_no: number; subject: string; category: string; status: string; last_message_at: string; created_at: string }> = [];

  try {
    const [spinoraDepositsRes, walletTxRes] = await Promise.all([
      db
        .from("deposit_requests")
        .select("id, game_name, payment_method, amount, status, created_at, reviewed_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false }),
      db
        .from("wallet_transactions")
        .select("id, amount, transaction_type, source, description, created_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    spinoraDeposits = (spinoraDepositsRes.data ?? []) as typeof spinoraDeposits;

    const rawTx = (walletTxRes.data ?? []) as Array<{ id: string; amount: number; transaction_type: string; source: string; description: string | null; created_at: string }>;
    ledger = rawTx.map((tx) => ({
      id: tx.id,
      currency: "USD",
      amount: tx.transaction_type === "credit" ? Math.abs(Number(tx.amount)) : -Math.abs(Number(tx.amount)),
      entry_type: tx.source || tx.transaction_type,
      description: tx.description || `${tx.transaction_type} ${tx.source}`,
      created_at: tx.created_at,
    }));
  } catch {}

  const canManageRoles = true;
  const canDelete = true;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to All Users
      </Link>

      <AdminPageHeader
        title={profileDisplayName(p)}
        description={`${profileHandle(p)}${email ? ` · ${email}` : ""} · joined ${format(new Date(p.created_at!), "MMMM d, yyyy")}`}
        action={
          profileIsBanned(p) ? (
            <Badge className="bg-rose-500/15 text-rose-400 border border-rose-500/30">
              <Ban className="size-3 mr-1" aria-hidden />
              Banned
            </Badge>
          ) : (
            <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Active</Badge>
          )
        }
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile &amp; Actions</TabsTrigger>
          <TabsTrigger value="ledger">
            Wallet Ledger
            {ledger.length > 0 && (
              <span className="ml-1.5 rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-semibold">
                {ledger.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="deposits">
            Deposits
            {spinoraDeposits.length > 0 && (
              <span className="ml-1.5 rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] font-semibold">
                {spinoraDeposits.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Profile tab ── */}
        <TabsContent value="profile">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              {/* Avatar + stats */}
              <GlassCard className="p-6">
                <div className="flex items-center gap-4">
                  <Avatar className="size-16">
                    <AvatarImage src={p.avatar_url ?? undefined} alt="" />
                    <AvatarFallback className="bg-black/40 border border-border/50 text-lg font-bold text-cyan-400">
                      {profileInitials(p)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-wrap items-center gap-2">
                    {vipTier && <TierBadge tier={vipTier} />}
                    <Badge className="bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 uppercase font-bold text-[10px]">
                      {primaryRole}
                    </Badge>
                  </div>
                </div>

                <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {[
                    { label: "Level",    value: `Lv. ${Math.max(1, Math.floor(profileNum(p.vip_points) / 500) + 1)}` },
                    { label: "Total XP", value: profileNum(p.vip_points).toLocaleString() },
                    { label: "Coins",    value: profileNum(p.bonus_wallet).toLocaleString() },
                    { label: "Streak",   value: `${profileNum(p.current_streak)}d` },
                    {
                      label: "Wallet",
                      value: `$${profileNum(p.wallet_balance).toFixed(2)}`,
                      accent: "text-amber-400 font-bold",
                    },
                    {
                      label: "Cash-out",
                      value: `$${profileNum(p.cashout_wallet).toFixed(2)}`,
                      accent: "text-emerald-400 font-bold",
                    },
                  ].map((s) => (
                    <div key={s.label}>
                      <dt className="text-xs text-muted-foreground">{s.label}</dt>
                      <dd className={`tnum mt-1 text-lg font-bold ${s.accent ?? ""}`}>{s.value}</dd>
                    </div>
                  ))}
                </dl>
              </GlassCard>

              {/* Recent ledger preview */}
              <GlassCard className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">Recent Wallet Transactions</h3>
                </div>
                <ul className="mt-4 divide-y divide-border/40">
                  {ledger.length === 0 ? (
                    <li className="py-3 text-sm text-muted-foreground">No transaction history entries yet.</li>
                  ) : (
                    ledger.slice(0, 10).map((e) => (
                      <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{e.description || e.entry_type}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(e.created_at), "MMM d, HH:mm")}
                          </p>
                        </div>
                        <span
                          className={`tnum shrink-0 text-sm font-bold ${
                            e.amount >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {e.amount >= 0 ? "+" : ""}
                          ${Math.abs(e.amount).toFixed(2)}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </GlassCard>
            </div>

            {/* ── User Management Action Panel ── */}
            <UserManagementPanel
              userId={id}
              isBanned={profileIsBanned(p)}
              walletBalance={profileNum(p.wallet_balance)}
              cashoutWallet={profileNum(p.cashout_wallet)}
              coinsBalance={profileNum(p.bonus_wallet)}
              allRoles={allRoles}
              userRoleKeys={userRoleKeys}
              canManageRoles={canManageRoles}
              canDelete={canDelete}
            />
          </div>
        </TabsContent>

        {/* ── Coin Ledger tab ── */}
        <TabsContent value="ledger">
          <GlassCard className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
              <h3 className="font-bold">Wallet &amp; Ledger Activity</h3>
              <p className="text-xs text-muted-foreground">
                Showing last {ledger.length} entries
              </p>
            </div>
            {ledger.length === 0 ? (
              <p className="px-6 py-8 text-sm text-muted-foreground">No ledger entries yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-xs text-muted-foreground">
                      <th className="px-6 py-3 text-left font-medium">Date</th>
                      <th className="px-6 py-3 text-left font-medium">Description</th>
                      <th className="px-6 py-3 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {ledger.map((e) => (
                      <tr key={e.id} className="hover:bg-white/5">
                        <td className="tnum whitespace-nowrap px-6 py-3 text-xs text-muted-foreground">
                          {format(new Date(e.created_at), "MMM d, yyyy HH:mm")}
                        </td>
                        <td className="max-w-xs truncate px-6 py-3 font-medium">
                          {e.description || e.entry_type}
                        </td>
                        <td className={`tnum px-6 py-3 text-right font-bold ${e.amount >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {e.amount >= 0 ? "+" : ""}
                          ${Math.abs(e.amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </TabsContent>

        {/* ── Deposits tab ── */}
        <TabsContent value="deposits">
          {spinoraDeposits.length === 0 ? (
            <GlassCard className="py-10 text-center text-sm text-muted-foreground">
              No deposit requests found for this player.
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {spinoraDeposits.map((dep) => (
                <GlassCard key={dep.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-foreground">{dep.game_name}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${STATUS_COLORS[dep.status] ?? "bg-foreground/10 text-muted-foreground"}`}>
                          {dep.status}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="font-bold text-emerald-400">
                          ${Number(dep.amount ?? 0).toFixed(2)}
                        </span>
                        <span className="capitalize">{dep.payment_method}</span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{format(new Date(dep.created_at), "MMM d, yyyy")}</p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
