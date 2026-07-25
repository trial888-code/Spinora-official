import Image from "next/image";
import Link from "next/link";
import { SITE_NAME, DAILY_SPIN_ENABLED } from "@/lib/constants";

/** Prompt B — centered hero with floating 3D-style promo assets */
export function CosmicPublicHero() {
  return (
    <section className="relative min-h-[420px] sm:min-h-[480px] flex items-center justify-center text-center overflow-hidden py-10">
      {/* Nebula halos */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-fuchsia-600/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-cyan-500/25 rounded-full blur-[90px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px]" />
      </div>

      {/* Left — slot + coins ring */}
      <div className="hidden xl:block absolute left-4 top-1/2 -translate-y-1/2 w-[240px] pointer-events-none">
        <div className="absolute inset-0 rounded-full border-2 border-fuchsia-500/60 shadow-[0_0_50px_rgba(217,70,239,0.5)] animate-pulse" />
        <Image
          src="/images/promos/spinora_slot_fifteen.jpg"
          alt=""
          width={200}
          height={200}
          className="relative mx-auto mt-8 rounded-2xl border border-fuchsia-400/50 shadow-2xl rotate-[-8deg]"
        />
        <Image src="/images/promos/spinora_dealer_ten.jpg" alt="" width={64} height={64} className="absolute -bottom-2 left-0 rounded-full border-2 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.6)]" />
      </div>

      {/* Right — fish / treasure ring */}
      <div className="hidden xl:block absolute right-4 top-1/3 w-[220px] pointer-events-none">
        <div className="absolute inset-0 rounded-full border-2 border-cyan-400/60 shadow-[0_0_50px_rgba(6,182,212,0.45)]" />
        <Image
          src="/images/promos/spinora_gift_three.jpg"
          alt=""
          width={180}
          height={180}
          className="relative mx-auto mt-6 rounded-2xl border border-cyan-400/50 rotate-[8deg]"
        />
      </div>

      <div className="relative z-10 max-w-4xl px-4 space-y-8">
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black leading-[1.05] tracking-tight">
          <span className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">{SITE_NAME} —</span>
          <br />
          <span className="text-cyan-200">100% Legal Sweepstakes &amp; Crypto</span>
          <br />
          <span className="bg-gradient-to-r from-fuchsia-400 via-pink-400 to-fuchsia-500 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(217,70,239,0.5)]">
            Casino
          </span>
        </h1>

        <Link
          href={DAILY_SPIN_ENABLED ? "/spin" : "/register"}
          className="cosmic-gold-btn inline-flex items-center px-12 sm:px-16 py-4 text-sm sm:text-base uppercase tracking-[0.14em]"
        >
          Claim $50 Freeplay Bonus
        </Link>
      </div>
    </section>
  );
}
