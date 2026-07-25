"use client";

import Link from "next/link";
import { Crown, Plus } from "lucide-react";
import { GameLobbySwitcher, type LobbyPlatform } from "@/components/dashboard/game-lobby-switcher";
import { DashboardCosmicGameGrid } from "@/components/dashboard/dashboard-cosmic-game-grid";
import { RolloverTracker } from "@/components/dashboard/rollover-tracker";
import type { ActiveJob } from "@/lib/data/dashboard";
import type { RolloverProgress } from "@/lib/data/rollover";
import { cn } from "@/lib/utils";

type Props = {
  displayName: string;
  tierName?: string | null;
  wallet: { play: number; cashout: number };
  rollover: RolloverProgress | null;
  platforms: LobbyPlatform[];
  activeJobs: Record<string, ActiveJob>;
};

export function CosmicLoggedInHub({
  displayName,
  tierName,
  wallet,
  rollover,
  platforms,
  activeJobs,
}: Props) {
  return (
    <div className="vip-page-content cosmic-dashboard-content space-y-5 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Cosmic Arcade Glow</p>
          <h1 className="text-2xl font-black text-white sm:text-3xl">
            Welcome, <span className="cosmic-gradient-text">{displayName}</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/vip"
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/45 bg-amber-500/15 px-3 py-1.5 text-xs font-black text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.25)]"
          >
            <Crown className="h-3.5 w-3.5" /> VIP {tierName ?? "Gold"}
          </Link>
          <Link href="/dashboard/deposit" className="cosmic-gold-btn inline-flex items-center gap-1.5 px-5 py-2.5 text-xs uppercase tracking-wider">
            <Plus className="h-4 w-4" /> Deposit
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="cosmic-glass-card cosmic-glass-card-glow rounded-2xl p-5 border-cyan-500/30">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-purple-300/80">Non-Redeemable Play Balance</p>
          <p className="mt-2 text-3xl font-black tabular-nums text-white">
            ${wallet.play.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="cosmic-glass-card cosmic-glass-card-glow rounded-2xl p-5 border-emerald-500/30">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-400/90">Unlocked Cashout Balance</p>
          <p className="mt-2 text-3xl font-black tabular-nums text-emerald-300">
            ${wallet.cashout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <RolloverTracker rollover={rollover} />

      <div className="flex flex-wrap gap-2">
        {[
          { label: "All Games", href: "/dashboard/games", active: true },
          { label: "Slots", href: "/#games" },
          { label: "Fish Tables", href: "/#games" },
          { label: "Live Casino", href: "/#games" },
          { label: "VIP Lounge", href: "/dashboard/vip" },
        ].map(({ label, href, active }) => (
          <Link
            key={label}
            href={href}
            className={cn("cosmic-pill-tab", active && "cosmic-pill-tab-active")}
          >
            {label}
          </Link>
        ))}
      </div>

      <GameLobbySwitcher platforms={platforms} activeJobs={activeJobs} />
      <DashboardCosmicGameGrid />

      <Link href="/dashboard" className="cosmic-glass-card block rounded-2xl p-4 text-center text-sm font-bold text-cyan-400 hover:border-cyan-400/40 transition-all">
        Open full dashboard →
      </Link>
    </div>
  );
}
