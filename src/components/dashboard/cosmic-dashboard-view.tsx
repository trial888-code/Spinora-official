"use client";

import Link from "next/link";
import { GameLobbySwitcher, type LobbyPlatform } from "@/components/dashboard/game-lobby-switcher";
import { DashboardCosmicGameGrid } from "@/components/dashboard/dashboard-cosmic-game-grid";
import { DualWalletRolloverBar } from "@/components/dashboard/dual-wallet-rollover-bar";
import type { ActiveJob } from "@/lib/data/dashboard";
import type { RolloverProgress } from "@/lib/data/rollover";
import { cn } from "@/lib/utils";

type Props = {
  wallet: { play: number; cashout: number };
  rollover: RolloverProgress | null;
  platforms: LobbyPlatform[];
  activeJobs: Record<string, ActiveJob>;
  showBrowseLink?: boolean;
};

export function CosmicDashboardView({
  wallet,
  rollover,
  platforms,
  activeJobs,
  showBrowseLink = false,
}: Props) {
  return (
    <div className="space-y-6">
      {/* 🎁 1-Tap Daily Bonus Claim Banner */}
      <div className="relative rounded-2xl border-2 border-amber-400/50 bg-gradient-to-r from-amber-500/25 via-yellow-500/15 to-purple-900/30 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-[0_0_30px_rgba(251,191,36,0.25)] overflow-hidden">
        <div className="flex items-center gap-3.5">
          <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-black shadow-md">
            <span className="text-2xl">🎁</span>
          </div>
          <div>
            <span className="inline-block rounded-full bg-amber-400/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-300 border border-amber-400/40 mb-0.5">
              Daily Reward Available
            </span>
            <h3 className="text-base sm:text-lg font-black text-white leading-tight">
              Claim Your $5.00 Free Daily Bonus!
            </h3>
            <p className="text-xs text-amber-200/80">Log in every 24 hours to collect free coins &amp; level up VIP status.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href="/dashboard/rewards"
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-1.5"
          >
            🎁 Claim $5.00 Bonus Now
          </Link>
        </div>
      </div>

      <DualWalletRolloverBar playBalance={wallet.play} cashoutBalance={wallet.cashout} rollover={rollover} />

      <GameLobbySwitcher platforms={platforms} activeJobs={activeJobs} />

      <div className="flex flex-wrap gap-2">
        {[
          { label: "All Games", href: "/dashboard/games", active: true },
          { label: "Slots", href: "/#games" },
          { label: "Fish Tables", href: "/#games" },
          { label: "Live Casino", href: "/#games" },
          { label: "VIP Lounge", href: "/dashboard/vip" },
        ].map(({ label, href, active }) => (
          <Link key={label} href={href} className={cn("cosmic-pill-tab", active && "cosmic-pill-tab-active")}>
            {label}
          </Link>
        ))}
      </div>

      <DashboardCosmicGameGrid />

      {showBrowseLink && (
        <Link
          href="/dashboard"
          className="cosmic-glass-card block rounded-2xl p-4 text-center text-sm font-bold text-cyan-400 hover:border-cyan-400/40 transition-all"
        >
          Open full dashboard →
        </Link>
      )}
    </div>
  );
}
