"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  Gift,
  Crown,
  Target,
  Trophy,
  Headphones,
  LayoutDashboard,
  Gamepad2,
  Wallet,
  ShieldCheck,
  History,
  MessageSquare,
  Users,
  StarHalf,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLobbyProfile } from "@/components/home/lobby/use-lobby-profile";
import { useUnreadMessages } from "@/hooks/use-unread-messages";
import { UnreadBadge } from "@/components/ui/unread-badge";
import {
  IconLobby,
  IconSlots777,
  IconFish,
  IconTableCards,
  IconLiveCasino,
  IconFortuneWheel,
} from "@/components/home/lobby/lobby-icons";

export type LobbyMenuId =
  | "lobby"
  | "slots"
  | "fish"
  | "table"
  | "live"
  | "promotions"
  | "vip"
  | "missions"
  | "leaderboard"
  | "support";

const FILTER_ITEMS: {
  id: LobbyMenuId;
  label: string;
  icon: React.ReactNode;
}[] = [
  { id: "lobby", label: "LOBBY", icon: <IconLobby className="w-4 h-4" /> },
  { id: "slots", label: "SLOTS", icon: <IconSlots777 /> },
  { id: "fish", label: "FISH GAMES", icon: <IconFish className="w-4 h-4" /> },
  { id: "table", label: "TABLE GAMES", icon: <IconTableCards className="w-4 h-4" /> },
  { id: "live", label: "LIVE CASINO", icon: <IconLiveCasino /> },
];

const LINK_ITEMS: {
  id: LobbyMenuId;
  label: string;
  icon: React.ElementType;
  href: string;
}[] = [
  { id: "promotions", label: "PROMOTIONS", icon: Gift, href: "/promotions" },
  { id: "vip", label: "VIP CLUB", icon: Crown, href: "/dashboard/vip" },
  { id: "leaderboard", label: "LEADERBOARD", icon: Trophy, href: "/leaderboard" },
  { id: "support", label: "SUPPORT", icon: Headphones, href: "/dashboard/messages" },
];

/** Account pages — no Deposit / Withdraw / Daily Spin (bottom bar + spin wheel cover those). */
const ACCOUNT_LINKS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/games", label: "My Games", icon: Gamepad2 },
  { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
  { href: "/dashboard/kyc", label: "KYC Verification", icon: ShieldCheck },
  { href: "/dashboard/deposits", label: "My Deposits", icon: History },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
  { href: "/dashboard/referrals", label: "Referrals", icon: Users },
  { href: "/dashboard/reviews", label: "Reviews", icon: StarHalf },
  { href: "/dashboard/rewards", label: "Rewards", icon: Target },
  { href: "/dashboard/achievements", label: "Achievements", icon: Trophy },
  { href: "/dashboard/activity", label: "Activity", icon: History },
];

interface LobbySidebarProps {
  activeMenu: LobbyMenuId;
  onMenuChange: (id: LobbyMenuId) => void;
  className?: string;
  walletSlot?: React.ReactNode;
  /** When true, shows My Account section (dashboard only). Landing/lobby must pass false. */
  showAccountLinks?: boolean;
}

export function LobbySidebar({
  activeMenu,
  onMenuChange,
  className,
  walletSlot,
  showAccountLinks = false,
}: LobbySidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const prefetched = useRef(new Set<string>());
  const { profile, levelProgress } = useLobbyProfile();
  const { count: unreadMessages } = useUnreadMessages();
  const level = profile?.level ?? 28;
  const displayName = "Spinora VIP";

  const accountNavVisible = showAccountLinks;
  const onLobbyHome = pathname === "/";

  function warmRoute(href: string) {
    if (prefetched.current.has(href)) return;
    prefetched.current.add(href);
    router.prefetch(href);
  }

  useEffect(() => {
    if (!accountNavVisible) return;
    for (const { href } of ACCOUNT_LINKS) warmRoute(href);
  }, [accountNavVisible, router]);

  function isLinkActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <aside className={cn("lobby-sidebar flex flex-col h-full py-3 px-2.5", className)}>
      <div className="lobby-profile-block px-2 pb-3 mb-1 border-b border-purple-500/25">
        <div className="flex items-center gap-2.5">
          <div className="relative w-11 h-11 rounded-full overflow-hidden border-2 border-amber-400/70 shrink-0 shadow-[0_0_14px_rgba(251,191,36,0.35)]">
            {profile?.avatarUrl ? (
              <Image src={profile.avatarUrl} alt={displayName} fill className="object-cover" sizes="44px" />
            ) : (
              <Image
                src="/images/promos/spinora_model_five.jpg"
                alt={displayName}
                fill
                className="object-cover object-top"
                sizes="44px"
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-black text-white leading-tight">{displayName}</p>
            <p className="text-[11px] font-bold text-amber-400/90">Lv. {level}</p>
          </div>
        </div>
        <div className="mt-2.5 h-[6px] rounded-full bg-purple-950/90 overflow-hidden border border-purple-600/30">
          <div
            className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-purple-500 to-violet-400"
            style={{ width: `${Math.max(levelProgress, 35)}%` }}
          />
        </div>
      </div>

      {walletSlot && !accountNavVisible && <div className="px-1 mb-2 shrink-0">{walletSlot}</div>}

      <nav className="flex flex-col gap-0.5 flex-1 py-1 overflow-y-auto scrollbar-hide min-h-0">
        {accountNavVisible ? (
          <>
            <div className="cosmic-sidebar-group">
              <p className="cosmic-sidebar-group-label">Main Casino</p>
              {FILTER_ITEMS.map(({ id, label, icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onMenuChange(id)}
                  className={cn(
                    "lobby-nav-btn flex items-center gap-2.5 w-full px-3 py-[8px] rounded-lg text-left transition-all",
                    activeMenu === id && onLobbyHome
                      ? "lobby-nav-btn-active text-white font-bold"
                      : "text-purple-200/75 hover:text-white hover:bg-purple-800/25"
                  )}
                >
                  <span className="w-5 flex items-center justify-center shrink-0 opacity-90">{icon}</span>
                  <span className="text-[10px] font-bold tracking-[0.06em]">{label}</span>
                </button>
              ))}
            </div>

            <div className="cosmic-sidebar-group">
              <p className="cosmic-sidebar-group-label">Wallet &amp; Cash</p>
              {walletSlot && <div className="px-1 pb-1">{walletSlot}</div>}
              {[
                { href: "/dashboard/wallet", label: "Wallet", icon: Wallet },
                { href: "/dashboard/deposit", label: "Deposit", icon: History },
                { href: "/dashboard/deposits", label: "My Deposits", icon: History },
                { href: "/dashboard/withdraw", label: "Withdraw", icon: Wallet },
              ].map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  prefetch
                  onMouseEnter={() => warmRoute(href)}
                  className={cn(
                    "lobby-nav-btn flex items-center gap-2.5 w-full px-3 py-[8px] rounded-lg transition-all",
                    isLinkActive(href) ? "lobby-nav-btn-active text-white font-bold" : "text-purple-200/75 hover:text-white hover:bg-purple-800/25"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0 opacity-90" />
                  <span className="text-[10px] font-bold tracking-[0.04em]">{label}</span>
                </Link>
              ))}
            </div>

            <div className="cosmic-sidebar-group">
              <p className="cosmic-sidebar-group-label">VIP &amp; Promos</p>
              {[
                { href: "/promotions", label: "Promotions", icon: Gift },
                { href: "/dashboard/vip", label: "VIP Club", icon: Crown },
                { href: "/dashboard/rewards", label: "Rewards", icon: Target },
                { href: "/dashboard/referrals", label: "Referrals", icon: Users },
              ].map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  prefetch
                  onMouseEnter={() => warmRoute(href)}
                  className={cn(
                    "lobby-nav-btn flex items-center gap-2.5 w-full px-3 py-[8px] rounded-lg transition-all",
                    isLinkActive(href) ? "lobby-nav-btn-active text-white font-bold" : "text-purple-200/75 hover:text-white hover:bg-purple-800/25"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0 opacity-90" />
                  <span className="text-[10px] font-bold tracking-[0.04em]">{label}</span>
                </Link>
              ))}
              <button
                type="button"
                onClick={() => onMenuChange("missions")}
                className={cn(
                  "lobby-nav-btn flex items-center gap-2.5 w-full px-3 py-[8px] rounded-lg text-left transition-all",
                  activeMenu === "missions" && onLobbyHome
                    ? "lobby-nav-btn-active text-white font-bold"
                    : "text-purple-200/75 hover:text-white hover:bg-purple-800/25"
                )}
              >
                <Target className="w-4 h-4 shrink-0 opacity-90" />
                <span className="text-[10px] font-bold tracking-[0.04em]">Missions</span>
              </button>
            </div>

            <div className="cosmic-sidebar-group">
              <p className="cosmic-sidebar-group-label">Account &amp; Support</p>
              {ACCOUNT_LINKS.filter(
                (l) =>
                  !["/dashboard/wallet", "/dashboard/deposits"].includes(l.href)
              ).map(({ href, label, icon: Icon, exact }) => (
                <Link
                  key={href}
                  href={href}
                  prefetch
                  onMouseEnter={() => warmRoute(href)}
                  onFocus={() => warmRoute(href)}
                  className={cn(
                    "lobby-nav-btn flex items-center gap-2.5 w-full px-3 py-[8px] rounded-lg transition-all",
                    isLinkActive(href, exact)
                      ? "lobby-nav-btn-active text-white font-bold"
                      : "text-purple-200/75 hover:text-white hover:bg-purple-800/25"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0 opacity-90" />
                  <span className="text-[10px] font-bold tracking-[0.04em] flex-1">{label}</span>
                  {href === "/dashboard/messages" && <UnreadBadge count={unreadMessages} />}
                </Link>
              ))}
            </div>
          </>
        ) : (
          <>
            {FILTER_ITEMS.map(({ id, label, icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onMenuChange(id)}
                className={cn(
                  "lobby-nav-btn flex items-center gap-2.5 w-full px-3 py-[9px] rounded-lg text-left transition-all",
                  activeMenu === id && onLobbyHome
                    ? "lobby-nav-btn-active text-white font-bold"
                    : "text-purple-200/75 hover:text-white hover:bg-purple-800/25"
                )}
              >
                <span className="w-5 flex items-center justify-center shrink-0 opacity-90">{icon}</span>
                <span className="text-[10.5px] font-bold tracking-[0.06em]">{label}</span>
              </button>
            ))}

            <div className="my-2 mx-1 h-px bg-purple-500/15" />

            {LINK_ITEMS.slice(0, 2).map(({ id, label, icon: Icon, href }) => {
              const active = isLinkActive(href);
              return (
                <Link
                  key={id}
                  href={href}
                  prefetch
                  onMouseEnter={() => warmRoute(href)}
                  className={cn(
                    "lobby-nav-btn flex items-center gap-2.5 w-full px-3 py-[9px] rounded-lg transition-all",
                    active
                      ? "lobby-nav-btn-active text-white font-bold"
                      : "text-purple-200/75 hover:text-white hover:bg-purple-800/25"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0 opacity-80" />
                  <span className="text-[10.5px] font-bold tracking-[0.06em]">{label}</span>
                </Link>
              );
            })}

            <button
              type="button"
              onClick={() => onMenuChange("missions")}
              className={cn(
                "lobby-nav-btn flex items-center gap-2.5 w-full px-3 py-[9px] rounded-lg text-left transition-all",
                activeMenu === "missions" && onLobbyHome
                  ? "lobby-nav-btn-active text-white font-bold"
                  : "text-purple-200/75 hover:text-white hover:bg-purple-800/25"
              )}
            >
              <Target className="w-4 h-4 shrink-0 opacity-80" />
              <span className="text-[10.5px] font-bold tracking-[0.06em]">MISSIONS</span>
            </button>

            {LINK_ITEMS.slice(2).map(({ id, label, icon: Icon, href }) => {
              const active = isLinkActive(href);
              return (
                <Link
                  key={id}
                  href={href}
                  prefetch
                  onMouseEnter={() => warmRoute(href)}
                  className={cn(
                    "lobby-nav-btn flex items-center gap-2.5 w-full px-3 py-[9px] rounded-lg transition-all",
                    active
                      ? "lobby-nav-btn-active text-white font-bold"
                      : "text-purple-200/75 hover:text-white hover:bg-purple-800/25"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0 opacity-80" />
                  <span className="text-[10.5px] font-bold tracking-[0.06em]">{label}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <Link
        href="/spin"
        className="lobby-spin-block mt-auto flex flex-col items-center pt-2 pb-1 group shrink-0"
      >
        <div className="relative group-hover:scale-105 transition-transform duration-300">
          <div className="absolute inset-0 bg-amber-400/25 blur-xl rounded-full scale-110" />
          <IconFortuneWheel className="relative w-[64px] h-[64px] drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]" />
        </div>
        <span className="mt-1.5 text-[10px] font-black text-amber-400 tracking-[0.12em]">SPIN &amp; WIN</span>
        <span className="text-[8px] font-bold text-amber-300/60 tracking-wide">WIN BIG EVERYDAY!</span>
      </Link>
    </aside>
  );
}
