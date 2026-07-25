"use client";

import { useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Copy, Gamepad2, Loader2, Lock, Zap } from "lucide-react";
import { toast } from "sonner";

import { QuickLoadModal } from "@/components/games/quick-load-modal";
import type { ActiveJob } from "@/lib/data/dashboard";

export type LobbyPlatform = {
  slug: string;
  name: string;
  image: string;
  tagline: string;
  downloadUrl?: string;
  linked: boolean;
  username?: string;
  password?: string | null;
  pending?: boolean;
};

type Props = {
  platforms: LobbyPlatform[];
  activeJobs: Record<string, ActiveJob>;
};

const GLOW: Record<string, string> = {
  juwa: "border-amber-500/50 shadow-[0_0_28px_rgba(251,191,36,0.2)]",
  "fire-kirin": "border-orange-500/50 shadow-[0_0_28px_rgba(249,115,22,0.25)]",
  "game-vault": "border-cyan-500/50 shadow-[0_0_28px_rgba(6,182,212,0.25)]",
  "orion-stars": "border-fuchsia-500/50 shadow-[0_0_28px_rgba(217,70,239,0.25)]",
};

function CopyRow({ label, value, masked }: { label: string; value: string; masked?: boolean }) {
  const copy = useCallback(() => {
    void navigator.clipboard.writeText(value);
    toast.success(`${label} copied!`, { className: "bg-emerald-950 border-emerald-500 text-emerald-100" });
  }, [label, value]);

  return (
    <div className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-[#050816]/80 px-2 py-1.5">
      <div className="min-w-0 flex-1">
        <p className="text-[8px] font-black uppercase tracking-wider text-cyan-400/80">{label}</p>
        <p className="truncate font-mono text-[11px] text-white">{masked ? "••••••••" : value}</p>
      </div>
      <button type="button" onClick={copy} className="game-portal-copy-btn shrink-0 inline-flex items-center gap-1">
        <Copy className="h-3 w-3" /> Copy
      </button>
    </div>
  );
}

export function GameLobbySwitcher({ platforms, activeJobs }: Props) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-purple-300/70">
          🎮 1-Click Game Accounts &amp; Launch ({platforms.length} Games)
        </p>
        <span className="text-[10px] text-cyan-400/80 font-semibold">Swipe to view all →</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide -mx-1 px-1">
        {platforms.map((platform, i) => {
          const job = activeJobs[platform.slug];
          const busy = job && (job.status === "pending" || job.status === "processing");
          const glow = GLOW[platform.slug] ?? "border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.15)]";
          const href = `/games/${platform.slug}`;

          return (
            <motion.article
              key={platform.slug}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.3) }}
              className={`cosmic-glass-card w-[min(100%,260px)] shrink-0 snap-start overflow-hidden rounded-2xl border-2 ${glow}`}
            >
              <Link href={href} className="block relative aspect-[16/10] w-full overflow-hidden">
                <Image src={platform.image} alt={platform.name} fill className="object-cover" sizes="260px" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0418] via-transparent to-transparent" />
                <p className="absolute bottom-2 left-2 right-2 text-sm font-black text-white drop-shadow-lg">{platform.name}</p>
                {busy ? (
                  <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-500/40">
                    <Loader2 className="h-3 w-3 animate-spin" /> Working…
                  </span>
                ) : platform.linked ? (
                  <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-300 border border-emerald-500/40">
                    Active Account
                  </span>
                ) : null}
              </Link>

              <div className="p-3 space-y-2">
                {platform.linked && platform.username ? (
                  <>
                    <CopyRow label="Copy Username" value={platform.username} />
                    {platform.password ? (
                      <CopyRow label="Password" value={platform.password} masked />
                    ) : null}
                    <div className="flex gap-1.5 pt-1">
                      <QuickLoadModal
                        gameSlug={platform.slug}
                        gameName={platform.name}
                        gameUsername={platform.username}
                        trigger={
                          <button type="button" className="flex-1 cosmic-gold-btn py-2 text-[10px] uppercase tracking-wider font-black">
                            <Zap className="h-3.5 w-3.5 inline mr-1" /> Quick Load
                          </button>
                        }
                      />
                      {platform.downloadUrl && (
                        <a
                          href={platform.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-[10px] font-black uppercase text-cyan-300 hover:bg-cyan-500/20 transition-colors inline-flex items-center justify-center gap-1"
                        >
                          Launch 🚀
                        </a>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex gap-1.5">
                    <Link
                      href={href}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/35 bg-emerald-500/10 py-2.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                    >
                      <Gamepad2 className="h-4 w-4" /> Create Account
                    </Link>
                    {platform.downloadUrl && (
                      <a
                        href={platform.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-2 text-[10px] font-black uppercase text-cyan-300 hover:bg-cyan-500/20 transition-colors inline-flex items-center justify-center"
                      >
                        App 🚀
                      </a>
                    )}
                  </div>
                )}
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
