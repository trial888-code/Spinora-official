"use client";

import Link from "next/link";
import Image from "next/image";
import { GAMES } from "@/lib/games";

const SHOWCASE = GAMES.filter((g) => !g.upcoming).slice(0, 15);

export function DashboardCosmicGameGrid() {
  return (
    <section className="space-y-3">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-purple-300/70">Game Matrix</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
        {SHOWCASE.map((game) => (
          <Link
            key={game.slug}
            href={`/games/${game.slug}`}
            className="group relative aspect-[3/4] overflow-hidden rounded-xl border-2 border-purple-500/35 bg-[#14082c]/50 hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all"
          >
            <Image
              src={game.image}
              alt={game.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width:640px) 33vw, 20vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0418]/95 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-2">
              <p className="text-[9px] sm:text-[10px] font-black text-white truncate drop-shadow-md">{game.name}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
