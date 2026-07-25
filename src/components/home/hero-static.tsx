import Image from "next/image";
import Link from "next/link";
import { SITE_NAME, DAILY_SPIN_ENABLED } from "@/lib/constants";
import { Sparkles, ShieldCheck, Bitcoin, Coins } from "lucide-react";

/** Cosmic Arcade Glow — public landing hero (Prompt B) */
export function HeroStatic() {
  return (
    <section className="relative pb-6" aria-label="Welcome">
      <div className="relative w-full overflow-hidden rounded-3xl min-h-[320px] sm:min-h-[380px] lg:min-h-[420px] cosmic-glass-card cosmic-glass-card-glow border border-purple-500/30">
        <div className="absolute inset-0 bg-gradient-to-br from-[#050816] via-[#12072a] to-[#1a0836]" />
        <div className="absolute top-0 right-0 w-[420px] h-[420px] bg-fuchsia-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[380px] h-[380px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid lg:grid-cols-2 gap-8 items-center h-full px-6 sm:px-12 py-10 sm:py-14">
          <div className="text-left space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="h-3.5 w-3.5" /> 100% Legal Sweepstakes
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-300 border border-cyan-500/30">
                24/7 Live Support
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-black text-white tracking-tight leading-[1.1]">
              {SITE_NAME} — <span className="cosmic-gradient-text">100% Legal Sweepstakes &amp; Crypto Casino</span>
            </h1>

            <p className="text-sm sm:text-base text-purple-200/75 max-w-xl leading-relaxed">
              Instant 1-click credentials for Juwa 777, Fire Kirin, Game Vault, and Orion Stars. Crypto deposits via NOWPayments — USDT, BTC, ETH, SOL.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {DAILY_SPIN_ENABLED ? (
                <Link href="/spin" className="cosmic-gold-btn inline-flex items-center gap-2 px-8 py-3.5 text-sm uppercase tracking-wide">
                  <Sparkles className="h-4 w-4" /> Claim $50 Freeplay Bonus
                </Link>
              ) : (
                <Link href="/spin" className="cosmic-gold-btn inline-flex items-center gap-2 px-8 py-3.5 text-sm uppercase tracking-wide">
                  Daily Spin Active
                </Link>
              )}
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-2xl border border-purple-500/40 bg-purple-500/10 px-6 py-3.5 text-sm font-bold text-purple-100 hover:bg-purple-500/20 transition-all"
              >
                Player Dashboard
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-purple-300/60">
              <span className="inline-flex items-center gap-1.5"><Bitcoin className="h-3.5 w-3.5 text-amber-400" /> BTC</span>
              <span className="inline-flex items-center gap-1.5"><Coins className="h-3.5 w-3.5 text-emerald-400" /> USDT</span>
              <span>ETH · SOL · NOWPayments</span>
            </div>
          </div>

          <div className="relative flex items-center justify-center min-h-[240px] lg:min-h-[300px]">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-64 rounded-full bg-amber-400/20 blur-3xl animate-pulse" />
              <div className="absolute w-48 h-48 rounded-full bg-fuchsia-500/15 blur-2xl" />
            </div>
            <div className="relative flex items-center justify-center gap-4 sm:gap-6">
              <Image
                src="/images/promos/spinora_slot_fifteen.jpg"
                alt=""
                width={120}
                height={120}
                className="hidden sm:block rounded-2xl border border-fuchsia-500/40 shadow-[0_0_30px_rgba(217,70,239,0.35)] rotate-[-8deg]"
              />
              <Link
                href="/spin"
                className="relative block w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] shrink-0 hover:scale-105 transition-transform duration-300"
                aria-label={`${SITE_NAME} — Spin now`}
              >
                <Image
                  src="/logo.webp"
                  alt={SITE_NAME}
                  fill
                  priority
                  fetchPriority="high"
                  sizes="(max-width: 640px) 160px, 200px"
                  className="rounded-full object-cover shadow-[0_0_50px_rgba(251,191,36,0.45)] border-2 border-amber-400/50"
                />
              </Link>
              <Image
                src="/images/promos/spinora_gift_three.jpg"
                alt=""
                width={120}
                height={120}
                className="hidden sm:block rounded-2xl border border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.35)] rotate-[8deg]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
