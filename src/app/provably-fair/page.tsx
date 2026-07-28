import { createMetadata } from "@/lib/seo/metadata";
import { VipPageLayout } from "@/components/layout/vip-page-layout";
import { ShieldCheck, Lock, Sparkles, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export const metadata = createMetadata({
  title: "Spinora Provably Fair — Transparent Cryptographic RNG",
  description: "Verify the absolute fairness of every spin, card deal, and game round on Spinora using SHA-256 seed hashing technology.",
  keywords: ["provably fair", "crypto casino", "fair rng", "sha-256 casino", "Spinora fairness"],
  path: "/provably-fair",
});

export default function ProvablyFairPage() {
  return (
    <VipPageLayout contentClassName="vip-page-content mx-auto max-w-4xl py-8 px-4">
      <div className="flex flex-col gap-8 rounded-3xl border border-emerald-500/20 bg-zinc-950/90 p-6 sm:p-10 backdrop-blur-xl shadow-2xl">
        <div className="flex items-center gap-4 border-b border-emerald-500/10 pb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 shadow-xl shadow-emerald-500/20">
            <ShieldCheck className="h-8 w-8 text-black" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide">Provably Fair Guarantee</h1>
            <p className="text-sm text-emerald-400">100% Cryptographically Verifiable Game Outcomes</p>
          </div>
        </div>

        <div className="space-y-6 text-zinc-300 text-sm leading-relaxed">
          <p>
            At Spinora, absolute trust and transparency are our highest priorities. Every game outcome on our platform—including
            <strong> Fortune Slots</strong>, <strong>Classic Blackjack</strong>, <strong>European Roulette</strong>, 
            <strong> Spinora Mines</strong>, and the <strong>Daily Prize Wheel</strong>—is generated using deterministic HMAC-SHA256 seed cryptography.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-400">
                <Lock className="h-5 w-5 text-amber-400" /> 1. Server Seed Hash
              </div>
              <p className="text-xs text-zinc-400">
                Before every round, a secret 64-character server seed is generated. Its SHA-256 hash is published publicly before you play so it cannot be altered.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-400">
                <Sparkles className="h-5 w-5 text-emerald-400" /> 2. Client Seed & Nonce
              </div>
              <p className="text-xs text-zinc-400">
                Your browser supplies a client seed paired with a incrementing round nonce, guaranteeing that neither player nor server can manipulate the roll.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 space-y-2">
              <div className="flex items-center gap-2 font-bold text-blue-400">
                <CheckCircle2 className="h-5 w-5 text-blue-400" /> 3. Verification
              </div>
              <p className="text-xs text-zinc-400">
                After the round, the unhashed server seed is revealed. Anyone can re-calculate the HMAC-SHA256 hash to prove 100% mathematical integrity.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 text-center space-y-3">
            <h3 className="text-lg font-bold text-white">Ready to test our games?</h3>
            <p className="text-xs text-emerald-300">Choose from our flagship in-house casino titles and experience instant provably fair gaming.</p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link href="/games/slots" className="rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-black text-black hover:bg-amber-300">
                Play Fortune Slots &rarr;
              </Link>
              <Link href="/games/blackjack" className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-black text-black hover:bg-emerald-400">
                Play Blackjack 21 &rarr;
              </Link>
              <Link href="/games/roulette" className="rounded-xl bg-red-600 px-5 py-2.5 text-xs font-black text-white hover:bg-red-500">
                Play Roulette &rarr;
              </Link>
              <Link href="/games/mines" className="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-black text-white hover:bg-purple-500">
                Play Mines &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </VipPageLayout>
  );
}
