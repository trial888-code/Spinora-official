"use client";

import Image from "next/image";
import Link from "next/link";
import { GAMES } from "@/lib/games";

const FEATURED = [
  { slug: "juwa", glow: "shadow-[0_0_40px_rgba(251,191,36,0.45)] border-amber-400/60", accent: "/images/promos/spinora_slot_fifteen.jpg" },
  { slug: "fire-kirin", glow: "shadow-[0_0_40px_rgba(249,115,22,0.45)] border-orange-400/60", accent: "/images/promos/spinora_dealer_ten.jpg" },
  { slug: "game-vault", glow: "shadow-[0_0_40px_rgba(6,182,212,0.45)] border-cyan-400/60", accent: "/images/promos/spinora_gift_three.jpg" },
  { slug: "orion-stars", glow: "shadow-[0_0_40px_rgba(217,70,239,0.45)] border-fuchsia-400/60", accent: "/images/promos/spinora_model_five.jpg" },
] as const;

export function CosmicPopularGames() {
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base sm:text-lg font-black uppercase tracking-[0.14em] text-white">
          Interactive Game Showcase
        </h2>
        <span className="rounded-full border border-amber-500/50 bg-amber-500/10 px-4 py-1.5 text-[10px] font-black text-amber-300 uppercase tracking-wider shadow-[0_0_15px_rgba(251,191,36,0.25)]">
          1-Click Play
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {FEATURED.map(({ slug, glow, accent }) => {
          const game = GAMES.find((g) => g.slug === slug);
          if (!game) return null;
          return (
            <Link
              key={slug}
              href={`/games/${slug}`}
              className={`group relative overflow-hidden rounded-2xl border-2 bg-[#14082c]/80 backdrop-blur-md ${glow} transition-all hover:scale-[1.03] hover:brightness-110`}
            >
              <div className="relative aspect-[3/4] w-full">
                <Image src={game.image} alt={game.name} fill className="object-cover" sizes="(max-width:640px) 50vw, 25vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0418] via-[#0a0418]/30 to-transparent" />
                <div className="absolute top-2 right-2 w-12 h-12 rounded-full overflow-hidden border-2 border-amber-400/70 shadow-[0_0_15px_rgba(251,191,36,0.5)]">
                  <Image src={accent} alt="" fill className="object-cover" sizes="48px" />
                </div>
              </div>
              <div className="p-3 space-y-2 border-t border-purple-500/20">
                <p className="text-sm font-black text-white">{game.name}</p>
                <span className="flex w-full items-center justify-center cosmic-gold-btn py-2.5 text-[11px] uppercase tracking-wider font-black">
                  Play Now
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
