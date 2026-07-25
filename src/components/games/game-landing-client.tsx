"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Download,
  Info,
  MapPin,
  Sparkles,
  Swords,
  Target,
  Trophy,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getMyGameAccount } from "@/lib/actions/game-loads";
import {
  GAME_BONUS_RULES,
  getOtherGames,
  UPCOMING_GAME_MESSAGE,
  type Game,
} from "@/lib/games";
import {
  generateRandomMoreWinnersCount,
  generateRandomWinner,
  generateRandomWinnersList,
  type GameWinner,
} from "@/lib/games/recent-winners";
import { GameOtherGames } from "@/components/games/game-other-games";
import { GameDepositSection } from "@/components/games/game-deposit-section";
import { GameWalletLoadSection } from "@/components/games/game-wallet-load-section";
import { LiveBadge } from "@/components/ui/LiveBadge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface GameLandingClientProps {
  game: Game;
  autoCreate?: boolean;
  walletLoadEnabled?: boolean;
  initialGameAccount?: {
    game_username: string;
    game_password: string | null;
  } | null;
}

export function GameLandingClient({
  game,
  autoCreate,
  walletLoadEnabled,
  initialGameAccount,
}: GameLandingClientProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const autoCreateAttempted = useRef(false);
  const walletPanelRef = useRef<HTMLDivElement>(null);
  const [accountStatus, setAccountStatus] = useState<"loading" | "none" | "has">(
    initialGameAccount?.game_username ? "has" : "loading"
  );
  const [resolvedAccount, setResolvedAccount] = useState(initialGameAccount ?? null);
  const [winner, setWinner] = useState<GameWinner | null>(null);
  const [moreWinners, setMoreWinners] = useState(0);
  const [showAllWinners, setShowAllWinners] = useState(false);
  const [extraWinners, setExtraWinners] = useState<GameWinner[]>([]);
  const otherGames = getOtherGames(game.slug);

  useEffect(() => {
    setWinner(generateRandomWinner());
    setMoreWinners(generateRandomMoreWinnersCount());
  }, []);

  function openWalletPanel() {
    setTimeout(() => {
      walletPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  async function handleCreateAccount() {
    if (game.upcoming) {
      toast.info(UPCOMING_GAME_MESSAGE);
      return;
    }

    const { data: { user } } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

    if (!user) {
      router.push(
        `/login?redirect=${encodeURIComponent(`/games/${game.slug}?create=1`)}`
      );
      return;
    }

    openWalletPanel();
  }

  function handleAccountChange(hasAccount: boolean) {
    setAccountStatus(hasAccount ? "has" : "none");
  }

  useEffect(() => {
    if (!walletLoadEnabled || game.upcoming) {
      setAccountStatus("none");
      return;
    }
    if (initialGameAccount?.game_username) {
      setResolvedAccount(initialGameAccount);
      setAccountStatus("has");
      return;
    }

    let cancelled = false;

    async function resolveAccount() {
      const account = await getMyGameAccount(game.slug);
      if (cancelled) return;
      if (account?.game_username) {
        setResolvedAccount({
          game_username: account.game_username,
          game_password: account.game_password,
        });
        setAccountStatus("has");
        return;
      }

      if (!supabase) {
        setAccountStatus("none");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setAccountStatus("none");
        return;
      }

      const { data } = await supabase
        .from("game_load_requests")
        .select("game_username, game_password")
        .eq("user_id", user.id)
        .eq("game_slug", game.slug)
        .eq("status", "completed")
        .in("load_type", ["create_account", "new_account"])
        .not("game_username", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;
      if (data?.game_username) {
        setResolvedAccount({
          game_username: data.game_username,
          game_password: data.game_password,
        });
        setAccountStatus("has");
      } else {
        setAccountStatus("none");
      }
    }

    void resolveAccount();
    return () => {
      cancelled = true;
    };
  }, [game.slug, game.upcoming, initialGameAccount, walletLoadEnabled, supabase]);

  useEffect(() => {
    if (!autoCreate || autoCreateAttempted.current) return;
    autoCreateAttempted.current = true;

    if (walletLoadEnabled) {
      void (async () => {
        const { data: { user } } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
        if (user) openWalletPanel();
        else
          router.push(
            `/login?redirect=${encodeURIComponent(`/games/${game.slug}?create=1`)}`
          );
      })();
      return;
    }

    void handleCreateAccount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCreate, walletLoadEnabled]);

  function handleHowItWorks() {
    setShowHowItWorks(true);
    setTimeout(() => {
      howItWorksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function toggleWinnersList() {
    if (!showAllWinners && extraWinners.length === 0 && winner) {
      setExtraWinners(generateRandomWinnersList(moreWinners, winner.username));
    }
    setShowAllWinners((v) => !v);
  }

  const rules = GAME_BONUS_RULES;
  const showWalletPanel = Boolean(walletLoadEnabled && !game.upcoming);
  const hasAccount =
    accountStatus === "has" || Boolean(resolvedAccount?.game_username);

  const categoryLabel = game.category.toUpperCase().replace(" GAME", " ARCADE");
  const featureItems =
    game.category === "Fish Game"
      ? [
          { label: "Multiplayer Action", icon: Users },
          { label: "Boss Dragon Battles", icon: Target },
          { label: "Special Weapons", icon: Zap },
          { label: "Archer Challenges", icon: Swords },
        ]
      : [
          { label: "Instant Loads", icon: Zap },
          { label: "VIP Rewards", icon: Sparkles },
          { label: "Live Jackpots", icon: Trophy },
          { label: "24/7 Support", icon: Users },
        ];

  const megaJackpots = useMemo(() => {
    const base = generateRandomWinnersList(5);
    return base.map((w, i) => ({
      ...w,
      amount: [15420, 12350, 9875, 8420, 7150][i] ?? w.amount,
      label: i === 0 ? "Mega Jackpot" : i === 1 ? "Major Win" : "Big Win",
    }));
  }, []);

  const walletSection = showWalletPanel ? (
    <div ref={walletPanelRef} className="scroll-mt-24">
      <GameWalletLoadSection
        game={game}
        initialAccount={resolvedAccount}
        onAccountChange={handleAccountChange}
      />
    </div>
  ) : null;

  return (
    <div className="game-portal-page relative max-w-6xl mx-auto space-y-6 pb-12 px-2 sm:px-4">
      {game.upcoming && (
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5">
          <p className="text-sm font-semibold text-amber-200 text-center">
            {UPCOMING_GAME_MESSAGE}
          </p>
        </section>
      )}

      {/* Cosmic Hero Header & Credentials Top Banner */}
      <section className="relative rounded-3xl overflow-hidden border-2 border-cyan-500/40 bg-gradient-to-b from-[#0c0926] via-[#060317] to-[#04010d] p-6 sm:p-8 shadow-[0_0_50px_rgba(6,182,212,0.25)] space-y-6">
        {/* Background artwork & galaxy effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/20 via-purple-900/20 to-transparent pointer-events-none" />
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15 mix-blend-screen pointer-events-none"
          style={{ backgroundImage: `url(${game.image})` }}
        />

        {/* Top Header: Game Banner Title & 1-Click Credentials Panel */}
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Left Title & Logo */}
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="relative h-28 w-28 shrink-0 rounded-2xl overflow-hidden border-2 border-amber-400/60 shadow-[0_0_30px_rgba(251,191,36,0.35)]">
              <Image src={game.image} alt={game.name} fill className="object-cover" priority sizes="112px" />
            </div>
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300 mb-1">
                {game.category} ARCADE
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-orange-400 to-red-500 drop-shadow-[0_0_20px_rgba(249,115,22,0.4)]">
                {game.name}
              </h1>
              <p className="mt-1 text-xs font-bold text-cyan-300/80 tracking-widest uppercase">
                Official Spinora Arcade Portal
              </p>
            </div>
          </div>

          {/* Right: 1-Click Credentials Panel */}
          {resolvedAccount?.game_username ? (
            <div className="w-full lg:w-auto min-w-[290px] rounded-2xl border-2 border-cyan-400/50 bg-[#050b1d]/90 p-4 shadow-[0_0_25px_rgba(6,182,212,0.25)] space-y-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300 text-center">
                🛡️ 1-Click Credentials Panel
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 rounded-xl border border-cyan-500/30 bg-black/60 px-3 py-1.5">
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase">Username</p>
                    <p className="font-mono text-xs font-bold text-white truncate">{resolvedAccount.game_username}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void navigator.clipboard.writeText(resolvedAccount.game_username);
                      toast.success("Username copied!");
                    }}
                    className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition-transform hover:scale-105 shadow-md"
                  >
                    Copy
                  </button>
                </div>

                {resolvedAccount.game_password && (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-cyan-500/30 bg-black/60 px-3 py-1.5">
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">Password</p>
                      <p className="font-mono text-xs font-bold text-white truncate">{resolvedAccount.game_password}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(resolvedAccount.game_password!);
                        toast.success("Password copied!");
                      }}
                      className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition-transform hover:scale-105 shadow-md"
                    >
                      Copy
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleCreateAccount}
              className="w-full lg:w-auto px-6 py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.35)] hover:scale-105 transition-transform flex items-center justify-center gap-2"
            >
              <UserPlus className="h-5 w-5" /> Get 1-Click Game Account
            </button>
          )}
        </div>

        {/* Center: Glowing Flaming Launch & Quick Load Action Buttons */}
        {!game.upcoming && (
          <div className="relative z-10 flex flex-col items-center gap-3 pt-4 border-t border-cyan-500/20 max-w-xl mx-auto">
            {game.downloadUrl && (
              <a
                href={game.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (resolvedAccount?.game_username) {
                    const creds = `Username: ${resolvedAccount.game_username}${resolvedAccount.game_password ? `\nPassword: ${resolvedAccount.game_password}` : ""}`;
                    void navigator.clipboard.writeText(creds);
                    toast.success(`Copied ${game.name} credentials! Opening web portal…`);
                  }
                }}
                className="w-full py-4 sm:py-5 px-8 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-600 text-black font-black text-base sm:text-lg uppercase tracking-wider text-center shadow-[0_0_35px_rgba(249,115,22,0.6)] hover:scale-[1.03] transition-all border-2 border-amber-300"
              >
                🔥 Launch External Game Panel
              </a>
            )}

            <button
              type="button"
              onClick={openWalletPanel}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(217,70,239,0.4)] hover:scale-105 transition-all border border-fuchsia-300/40"
            >
              💜 Quick Load $20 Credits
            </button>
          </div>
        )}
      </section>

      {/* Main Grid: Game Features + Wallet Load Portal */}
      <div className="grid lg:grid-cols-12 gap-6 relative z-[1]">
        {/* Left Features List */}
        <aside className="lg:col-span-4 rounded-3xl border-2 border-purple-500/30 bg-[#09051d]/80 p-5 space-y-4 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" /> Game Features
          </p>
          <ul className="space-y-3">
            {featureItems.map(({ label, icon: Icon }) => (
              <li key={label} className="flex items-center gap-3 p-3 rounded-xl bg-purple-950/40 border border-purple-500/20 text-sm font-bold text-purple-100">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border border-cyan-400/40 text-cyan-300 shrink-0">
                  <Icon className="h-4 w-4" />
                </span>
                <span>{label}</span>
              </li>
            ))}
          </ul>

          <div className="pt-2 border-t border-purple-500/20 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
              <span>First Time Match</span>
              <span className="text-emerald-400">{rules.firstTimeBonus}%</span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
              <span>Regular Match</span>
              <span className="text-teal-400">{rules.regularBonus}%</span>
            </div>
          </div>
        </aside>

        {/* Right Wallet Load & Redeem Portal */}
        <div className="lg:col-span-8 space-y-4">
          {walletSection}
        </div>
      </div>

      {/* Bottom Grid: Jackpot Leaderboard + Live Recent Winner Ticker */}
      <div className="grid lg:grid-cols-2 gap-6 relative z-[1]">
        {/* Mega Jackpot Table */}
        <section className="rounded-3xl border-2 border-amber-500/30 bg-[#0a061c]/90 p-5 space-y-4 shadow-[0_0_30px_rgba(251,191,36,0.15)]">
          <div className="flex items-center gap-2 border-b border-amber-500/20 pb-3">
            <Trophy className="h-6 w-6 text-amber-400" />
            <h2 className="font-black text-white uppercase tracking-wider text-base">🏆 Mega Jackpot Table</h2>
          </div>
          <ul className="space-y-2.5">
            {megaJackpots.map((j, i) => (
              <li
                key={`${j.username}-${i}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-2.5 text-xs sm:text-sm font-bold"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                  </span>
                  <span className="text-white font-bold">{j.label}:</span>
                </div>
                <div className="text-right">
                  <span className="text-amber-300 font-black">${j.amount.toLocaleString()}</span>
                  <span className="text-muted-foreground text-[11px] block">Winner: {j.username}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Recent Winner Live Feed */}
        <section className="rounded-3xl border-2 border-emerald-500/30 bg-[#061019]/90 p-5 space-y-4 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-emerald-400" />
              <h2 className="font-black text-white uppercase tracking-wider text-base">⚡ Recent Winner Feed</h2>
            </div>
            <LiveBadge />
          </div>

          <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 p-4 flex items-center justify-between gap-3 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            {winner ? (
              <>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-white text-sm sm:text-base">{winner.username}</span>
                    {winner.verified && (
                      <BadgeCheck className="h-4 w-4 text-sky-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-emerald-200/70 flex items-center gap-1 mt-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    won on {game.name}!
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-400">${winner.amount}</span>
                  <span className="block text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/30 mt-1">
                    WINNER 🏆
                  </span>
                </div>
              </>
            ) : (
              <div className="w-full h-12 rounded-xl bg-white/5 animate-pulse" />
            )}
          </div>

          {winner && (
            <button
              type="button"
              onClick={toggleWinnersList}
              className="w-full text-center text-xs font-bold text-cyan-400 hover:text-cyan-300 mt-2 flex items-center justify-center gap-1 transition-colors"
            >
              {showAllWinners ? (
                <>Show less <ChevronUp className="h-3.5 w-3.5" /></>
              ) : (
                <>+ {moreWinners} more recent winners <ChevronDown className="h-3.5 w-3.5" /></>
              )}
            </button>
          )}

          {showAllWinners && extraWinners.length > 0 && (
            <ul className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
              {extraWinners.map((w, i) => (
                <li
                  key={`${w.username}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-purple-500/20 bg-purple-950/40 px-3.5 py-2 text-xs"
                >
                  <div>
                    <span className="font-bold text-white">{w.username}</span>
                    <span className="text-[10px] text-muted-foreground block">{w.state}</span>
                  </div>
                  <span className="font-bold text-emerald-400">${w.amount}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* SEO Bio */}
      <section className="cosmic-glass-card rounded-3xl p-5 relative z-[1]">
        <p className="text-xs sm:text-sm text-purple-200/80 leading-relaxed">{game.bio}</p>
      </section>

      {!game.upcoming && <GameDepositSection game={game} />}

      <GameOtherGames games={otherGames} />
    </div>
  );
}
