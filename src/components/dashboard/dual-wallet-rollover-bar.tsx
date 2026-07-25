"use client";

import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import type { RolloverProgress } from "@/lib/data/rollover";

type Props = {
  playBalance: number;
  cashoutBalance: number;
  rollover: RolloverProgress | null;
};

/** Mockup-style dual-wallet rollover tracker bar */
export function DualWalletRolloverBar({ playBalance, cashoutBalance, rollover }: Props) {
  const percent = rollover?.percentComplete ?? Math.min(100, Math.round((cashoutBalance / Math.max(playBalance + cashoutBalance, 1)) * 100));
  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <section className="cosmic-glass-card cosmic-glass-card-glow rounded-2xl p-4 sm:p-5 border border-cyan-500/25">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-cyan-300">
          Dual-Wallet Rollover Progress Tracker
        </p>
        <p className="text-[10px] font-bold text-emerald-400/90 uppercase tracking-wider">Unlocked Cashout Balance</p>
      </div>

      <div className="relative cosmic-dual-wallet-bar mb-2">
        <Progress
          value={percent}
          className="h-4 bg-[#0e0520] border border-purple-500/40 [&>div]:bg-gradient-to-r [&>div]:from-emerald-500 [&>div]:via-teal-400 [&>div]:to-fuchsia-500 [&>div]:shadow-[0_0_20px_rgba(16,185,129,0.8),0_0_30px_rgba(217,70,239,0.4)]"
        />
      </div>

      <div className="flex items-center justify-between text-[11px] font-bold">
        <div>
          <span className="text-purple-300/70">Non-Redeemable </span>
          <span className="text-white tabular-nums">${fmt(playBalance)}</span>
          <span className="text-purple-400/50"> — </span>
          <span className="text-purple-300/60 tabular-nums">${fmt(playBalance)}</span>
        </div>
        <span className="text-emerald-300 tabular-nums text-sm font-black">${fmt(cashoutBalance)}</span>
      </div>

      {rollover ? (
        <p className="mt-2 text-[10px] text-purple-300/55">
          {rollover.percentComplete}% wagered on {rollover.gameName}.{" "}
          <Link href={`/games/${rollover.gameSlug}`} className="text-cyan-400 hover:underline">
            Play & wager →
          </Link>
        </p>
      ) : (
        <p className="mt-2 text-[10px] text-purple-300/55">
          Load a bonus to your game account to track rollover progress here.
        </p>
      )}
    </section>
  );
}
