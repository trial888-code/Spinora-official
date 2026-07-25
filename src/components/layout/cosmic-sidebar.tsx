"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Crown,
  Gamepad2,
  Gift,
  Headphones,
  HelpCircle,
  History,
  LayoutDashboard,
  MessageSquare,
  ShieldCheck,
  Spade,
  Star,
  Target,
  Trophy,
  Users,
  Wallet,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLobbyProfile } from "@/components/home/lobby/use-lobby-profile";

type NavItem = { href: string; label: string; icon: React.ElementType; exact?: boolean };

const GROUPS: {
  label: string;
  accent: string;
  icon: React.ElementType;
  items: NavItem[];
}[] = [
  {
    label: "Casino & Games",
    accent: "text-amber-400",
    icon: Spade,
    items: [
      { href: "/dashboard", label: "Games Lobby", icon: Gamepad2, exact: true },
      { href: "/blog", label: "Blog & Strategy Guides", icon: FileText },
      { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
      { href: "/spin", label: "Spin & Win Wheel", icon: Target },
    ],
  },
  {
    label: "Cashier & Wallet",
    accent: "text-cyan-400",
    icon: Wallet,
    items: [
      { href: "/dashboard/deposit", label: "Deposit Cashier", icon: Wallet },
      { href: "/dashboard/withdraw", label: "Withdraw Winnings", icon: History },
      { href: "/dashboard/deposits", label: "Deposit History", icon: History },
      { href: "/dashboard/activity", label: "Wallet Activity", icon: LayoutDashboard },
    ],
  },
  {
    label: "Rewards & Account",
    accent: "text-fuchsia-400",
    icon: Gift,
    items: [
      { href: "/promotions", label: "Promotions & Offers", icon: Gift },
      { href: "/dashboard/vip", label: "VIP Tier Status", icon: Crown },
      { href: "/dashboard/rewards", label: "Missions & Rewards", icon: Star },
      { href: "/dashboard/referrals", label: "Refer a Friend", icon: Users },
      { href: "/dashboard/kyc", label: "ID Verification (KYC)", icon: ShieldCheck },
      { href: "/dashboard/messages", label: "Support & Inbox", icon: Headphones },
    ],
  },
];

interface CosmicSidebarProps {
  className?: string;
  walletSlot?: React.ReactNode;
}

export function CosmicSidebar({ className, walletSlot }: CosmicSidebarProps) {
  const pathname = usePathname();
  const { profile, levelProgress } = useLobbyProfile();
  const level = profile?.level ?? 1;

  function isActive(href: string, exact?: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className={cn("cosmic-app-sidebar flex flex-col gap-3 p-3 h-full overflow-y-auto scrollbar-hide", className)}>
      <div className="cosmic-sidebar-group cosmic-sidebar-group-glow">
        <div className="flex items-center gap-2.5 px-2 py-1">
          <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-amber-400/80 shadow-[0_0_18px_rgba(251,191,36,0.45)] shrink-0">
            {profile?.avatarUrl ? (
              <Image src={profile.avatarUrl} alt="Profile" fill className="object-cover" sizes="44px" />
            ) : (
              <Image src="/images/promos/spinora_model_five.jpg" alt="Profile" fill className="object-cover object-top" sizes="44px" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-white truncate">Spinora VIP</p>
            <p className="text-[10px] font-bold text-amber-400">Lv. {level}</p>
          </div>
        </div>
        <div className="mx-2 h-1.5 rounded-full bg-[#0a0418] border border-purple-500/30 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
            style={{ width: `${Math.max(levelProgress, 20)}%` }}
          />
        </div>
      </div>

      {walletSlot && <div className="px-0.5">{walletSlot}</div>}

      {GROUPS.map(({ label, accent, icon: GroupIcon, items }) => (
        <div key={label} className="cosmic-sidebar-group cosmic-sidebar-group-glow relative">
          <div className="flex items-center justify-between px-2 pt-1 pb-0.5">
            <p className="cosmic-sidebar-group-label">{label}</p>
            <GroupIcon className={cn("h-3.5 w-3.5 opacity-80", accent)} />
          </div>
          <nav className="flex flex-col gap-0.5 px-1 pb-1">
            {items.map(({ href, label: itemLabel, icon: Icon, exact }) => {
              const active = isActive(href, exact);
              return (
                <Link
                  key={`${href}-${itemLabel}`}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px] font-bold transition-all",
                    active
                      ? "bg-gradient-to-r from-amber-500/25 to-amber-600/10 text-amber-200 border border-amber-500/35 shadow-[0_0_12px_rgba(251,191,36,0.15)]"
                      : "text-purple-200/75 hover:text-white hover:bg-purple-800/20 border border-transparent"
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-amber-400" : "text-purple-400/70")} />
                  <span className="truncate">{itemLabel}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      ))}

      <Link
        href="/spin"
        className="mt-auto cosmic-sidebar-group cosmic-sidebar-group-glow flex flex-col items-center py-3 group"
      >
        <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-[0_0_25px_rgba(251,191,36,0.5)] group-hover:scale-105 transition-transform">
          <Trophy className="h-7 w-7 text-amber-950" />
        </div>
        <span className="mt-2 text-[9px] font-black text-amber-400 tracking-widest">SPIN & WIN</span>
      </Link>
    </aside>
  );
}
