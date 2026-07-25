import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Award,
  Coins,
  Gamepad2,
  Gift,
  History,
  Sparkles,
  TrendingUp,
  UserPlus,
  Wallet,
} from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { GlassCard } from "@/components/shared/glass-card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/data/dashboard";
import { createAdminClient } from "@/lib/supabase/admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Activity History | Spinora" };
export const dynamic = "force-dynamic";

type CombinedActivityItem = {
  id: string;
  kind: "transaction" | "activity";
  title: string;
  subtitle?: string;
  amountText?: string;
  amountColor?: string;
  icon: typeof Gift;
  accent: string;
  created_at: string;
};

export default async function ActivityPage() {
  const { supabase, user } = await requireUser();
  const db = createAdminClient() ?? supabase;

  const [{ data: rawTxs }, { data: rawLogs }] = await Promise.all([
    db
      .from("wallet_transactions")
      .select("id, amount, wallet_type, transaction_type, source, description, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(300),
    db
      .from("activity_log")
      .select("id, action, description, metadata, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  const items: CombinedActivityItem[] = [];

  // 1. Process Wallet Transactions
  for (const tx of rawTxs ?? []) {
    const isCredit = tx.transaction_type === "credit" || tx.transaction_type === "adjustment";
    const amt = Number(tx.amount ?? 0);
    items.push({
      id: `tx-${tx.id}`,
      kind: "transaction",
      title: tx.description || (isCredit ? "Wallet Credit" : "Wallet Debit"),
      subtitle: `Wallet: ${tx.wallet_type === "cashout" ? "Cash Out Winnings" : "Deposit Wallet"}`,
      amountText: isCredit ? `+$${amt.toFixed(2)}` : `-$${amt.toFixed(2)}`,
      amountColor: isCredit ? "text-emerald-400 font-extrabold" : "text-amber-400 font-bold",
      icon: isCredit ? ArrowDownLeft : ArrowUpRight,
      accent: isCredit ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" : "text-amber-400 bg-amber-500/10 border border-amber-500/20",
      created_at: tx.created_at,
    });
  }

  // 2. Process Activity Logs
  for (const log of rawLogs ?? []) {
    const meta = (log.metadata ?? {}) as Record<string, unknown>;
    const coins = Number(meta.coins ?? 0);
    const xp = Number(meta.xp ?? 0);
    let amountText = "";
    if (coins > 0 && xp > 0) amountText = `+${coins} coins · +${xp} XP`;
    else if (coins > 0) amountText = `+${coins} coins`;
    else if (xp > 0) amountText = `+${xp} XP`;

    let Icon = Coins;
    let accent = "text-purple-400 bg-purple-500/10 border border-purple-500/20";
    if (log.action === "reward_claimed") { Icon = Gift; accent = "text-amber-400 bg-amber-500/10 border border-amber-500/20"; }
    else if (log.action === "promotion_claimed") { Icon = Sparkles; accent = "text-fuchsia-400 bg-fuchsia-500/10 border border-fuchsia-500/20"; }
    else if (log.action === "achievement_unlocked") { Icon = Award; accent = "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20"; }
    else if (log.action === "referral_rewarded") { Icon = UserPlus; accent = "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"; }
    else if (log.action === "level_up") { Icon = TrendingUp; accent = "text-amber-400 bg-amber-500/10 border border-amber-500/20"; }

    items.push({
      id: `log-${log.id}`,
      kind: "activity",
      title: log.description || "Account Activity",
      subtitle: "Reward / System Event",
      amountText: amountText || undefined,
      amountColor: "text-ws-gold font-bold",
      icon: Icon,
      accent,
      created_at: log.created_at,
    });
  }

  // Sort unified timeline by date descending
  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-foreground sm:text-3xl">📜 Activity & Wallet History</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A full timeline of your deposits, game loads, redeems, payouts, and reward claims.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/deposit">
            <Button size="sm" className="bg-emerald-500 text-black font-bold hover:bg-emerald-400">
              <Wallet className="h-4 w-4 mr-1" /> Deposit
            </Button>
          </Link>
          <Link href="/dashboard/withdraw">
            <Button size="sm" variant="outline" className="border-amber-500/40 text-amber-300 font-bold hover:bg-amber-500/10">
              Cash Out
            </Button>
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<History className="h-10 w-10 text-muted-foreground" />}
          title="No activity yet"
          description="Make a deposit or claim your daily bonus to start your ledger."
          action={
            <Button asChild className="bg-amber-500 text-black font-bold hover:bg-amber-400">
              <Link href="/dashboard/deposit">Make a Deposit</Link>
            </Button>
          }
        />
      ) : (
        <GlassCard className="overflow-hidden p-2 sm:p-4">
          <ul className="divide-y divide-foreground/8">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id} className="flex items-center gap-3.5 p-3 sm:p-4 hover:bg-foreground/5 rounded-xl transition-colors">
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl",
                      item.accent
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-foreground">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">{item.subtitle}</span>
                      <span className="text-[10px] text-muted-foreground/50">•</span>
                      <time dateTime={item.created_at} className="text-[11px] text-muted-foreground/80">
                        {format(new Date(item.created_at), "MMM d, yyyy · HH:mm")}
                      </time>
                    </div>
                  </div>
                  {item.amountText && (
                    <div className="shrink-0 text-right">
                      <p className={cn("tnum text-sm", item.amountColor)}>{item.amountText}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </GlassCard>
      )}
    </div>
  );
}
