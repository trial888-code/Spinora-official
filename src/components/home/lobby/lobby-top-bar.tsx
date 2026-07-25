"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Crown, Menu, Mail, Volume2, VolumeX } from "lucide-react";
import { useLobbyProfile } from "@/components/home/lobby/use-lobby-profile";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { BrandLogo } from "@/components/ui/brand-logo";

interface LobbyTopBarProps {
  onMenuClick?: () => void;
}

export function LobbyTopBar({ onMenuClick }: LobbyTopBarProps) {
  const pathname = usePathname();
  const onDashboard = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const { balance, fpBalance, walletHidden, profile } = useLobbyProfile();
  const { count: unreadMessages } = useUnreadMessages();
  const [soundOn, setSoundOn] = useState(true);

  const fmt = (n: number) =>
    walletHidden
      ? "••••"
      : n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <header className="lobby-top-bar shrink-0 min-h-[58px] flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2">
      {/* Left — logo + avatar */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-white/80 hover:bg-white/10 shrink-0 border border-purple-500/30"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <Link href="/" className="hidden sm:block shrink-0">
          <BrandLogo className="h-9" showText />
        </Link>

        <div className="flex items-center gap-2 pl-1">
          <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-amber-400/80 shadow-[0_0_16px_rgba(251,191,36,0.4)] shrink-0">
            {profile?.avatarUrl ? (
              <Image src={profile.avatarUrl} alt="Profile" fill className="object-cover" sizes="40px" />
            ) : (
              <Image
                src="/images/promos/spinora_model_five.jpg"
                alt="Profile"
                fill
                className="object-cover object-top"
                sizes="40px"
              />
            )}
          </div>
          <Link
            href="/dashboard/vip"
            className="hidden md:inline-flex items-center gap-1 rounded-full border border-amber-500/50 bg-gradient-to-r from-amber-500/20 to-amber-600/10 px-2.5 py-1 text-[10px] font-black text-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.2)]"
          >
            <Crown className="h-3 w-3" /> VIP GOLD
          </Link>
        </div>
      </div>

      {/* Center — balances (mockup labels) */}
      <div className="flex items-center gap-2 sm:gap-3 order-3 sm:order-2 w-full sm:w-auto justify-center">
        <div className="cosmic-glass-card rounded-xl px-3 py-2 min-w-[130px] border-purple-500/30">
          <p className="text-[8px] font-black uppercase tracking-wider text-purple-300/70 leading-none">Play Balance</p>
          <p className="text-sm font-black text-amber-300 tabular-nums">${fmt(balance)}</p>
        </div>
        <div className="cosmic-glass-card rounded-xl px-3 py-2 min-w-[130px] border-emerald-500/35">
          <p className="text-[8px] font-black uppercase tracking-wider text-emerald-400/80 leading-none">Cashout</p>
          <p className="text-sm font-black text-emerald-300 tabular-nums">${fmt(fpBalance)}</p>
        </div>
      </div>

      {/* Right — deposit + utilities */}
      <div className="flex items-center gap-2 order-2 sm:order-3 ml-auto">
        <Link
          href="/dashboard/deposit"
          className="cosmic-gold-btn inline-flex items-center px-4 sm:px-6 py-2 text-[11px] sm:text-xs uppercase tracking-wider font-black"
        >
          Deposit
        </Link>

        {onDashboard && (
          <span className="hidden xl:block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-400/80 mr-1">
            Cosmic Hub
          </span>
        )}

        <Link href="/dashboard/messages" className="relative lobby-utility-btn w-9 h-9" title="Mail">
          <Mail className="h-4 w-4 text-purple-200" />
          {unreadMessages > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-red-500 text-[8px] font-bold text-white flex items-center justify-center">
              {unreadMessages > 9 ? "9+" : unreadMessages}
            </span>
          )}
        </Link>

        <button
          type="button"
          onClick={() => setSoundOn((v) => !v)}
          className="lobby-utility-btn w-9 h-9 hidden sm:flex"
          aria-label={soundOn ? "Mute" : "Unmute"}
        >
          {soundOn ? <Volume2 className="h-4 w-4 text-purple-200" /> : <VolumeX className="h-4 w-4 text-purple-200/40" />}
        </button>
      </div>
    </header>
  );
}
