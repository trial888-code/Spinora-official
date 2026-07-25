"use client";

import Link from "next/link";
import Image from "next/image";
import { Crown, Menu, LogOut } from "lucide-react";
import { BrandLogo } from "@/components/ui/brand-logo";
import { useLobbyProfile } from "@/components/home/lobby/use-lobby-profile";
import { logoutUser } from "@/lib/auth/logout";

interface CosmicTopBarProps {
  onMenuClick?: () => void;
}

export function CosmicTopBar({ onMenuClick }: CosmicTopBarProps) {
  const { balance, fpBalance, walletHidden, profile, vipTierName } = useLobbyProfile();

  const fmt = (n: number) =>
    walletHidden
      ? "••••"
      : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  async function handleLogout() {
    await logoutUser("/");
    window.location.href = "/";
  }

  return (
    <header className="cosmic-top-bar shrink-0 z-40">
      <div className="flex flex-wrap items-center gap-3 px-3 sm:px-5 py-2.5">
        {/* Left: menu + logo + avatar + VIP */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden w-9 h-9 rounded-xl border border-cyan-500/30 bg-[#14082c]/80 flex items-center justify-center text-cyan-200"
            aria-label="Open menu"
          >
            <Menu className="h-4 w-4" />
          </button>

          <Link href="/" className="shrink-0 hidden sm:block">
            <BrandLogo className="h-9" showText />
          </Link>

          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.5)] shrink-0">
            {profile?.avatarUrl ? (
              <Image src={profile.avatarUrl} alt="Profile" fill className="object-cover" sizes="40px" />
            ) : (
              <Image src="/images/promos/spinora_model_five.jpg" alt="Profile" fill className="object-cover object-top" sizes="40px" />
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center border border-amber-200">
              <Crown className="h-2.5 w-2.5 text-amber-950" />
            </span>
          </div>

          <Link
            href="/dashboard/vip"
            className="hidden md:inline-flex items-center gap-1 rounded-full border border-amber-500/50 bg-gradient-to-r from-amber-500/25 to-yellow-600/15 px-3 py-1 text-[10px] font-black text-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.3)]"
          >
            <Crown className="h-3 w-3" /> {vipTierName}
          </Link>

          <button
            type="button"
            onClick={() => void handleLogout()}
            className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 font-bold text-xs hover:bg-rose-500/20 transition-all shrink-0"
          >
            <LogOut className="size-3.5" /> Logout
          </button>
        </div>

        {/* Center: deposit */}
        <div className="flex-1 flex justify-center order-3 sm:order-2 w-full sm:w-auto">
          <Link
            href="/dashboard/deposit"
            className="cosmic-gold-btn inline-flex items-center px-8 sm:px-12 py-2.5 text-xs sm:text-sm uppercase tracking-[0.15em] font-black"
          >
            Deposit
          </Link>
        </div>

        {/* Right: dual wallet cards (mockup) */}
        <div className="flex items-stretch gap-2 sm:gap-3 ml-auto order-2 sm:order-3">
          <div className="cosmic-balance-card min-w-[120px] sm:min-w-[150px]">
            <p className="cosmic-balance-label">Non-Redeemable</p>
            <p className="cosmic-balance-label text-[8px] opacity-70">Play Balance</p>
            <p className="cosmic-balance-value text-white">${fmt(balance)}</p>
          </div>
          <div className="cosmic-balance-card cosmic-balance-card-cashout min-w-[120px] sm:min-w-[150px]">
            <p className="cosmic-balance-label text-emerald-400/90">Unlocked Cashout</p>
            <p className="cosmic-balance-label text-[8px] opacity-70">Balance</p>
            <p className="cosmic-balance-value text-emerald-300">${fmt(fpBalance)}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
