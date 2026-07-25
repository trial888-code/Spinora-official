"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { NowPaymentsDepositModal } from "@/components/wallet/nowpayments-deposit-modal";
import { GameDepositSection } from "@/components/games/game-deposit-section";
import { GAMES } from "@/lib/games";

const PLAYABLE = GAMES.filter((g) => !g.upcoming);

/** Prompt C — NOWPayments Crypto Cashier as full-page deposit UI */
export function DepositPageClient() {
  const [manualOpen, setManualOpen] = useState(false);
  const game = PLAYABLE[0];
  if (!game) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      <div className="text-center space-y-2 mb-2">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400/90">Secure Crypto Deposit</p>
        <h1 className="text-2xl sm:text-3xl font-black text-white">NOWPayments Cashier</h1>
        <p className="text-xs text-purple-200/60">USDT · BTC · ETH · SOL — automated IPN crediting</p>
      </div>

      <NowPaymentsDepositModal />

      <button
        type="button"
        onClick={() => setManualOpen((v) => !v)}
        className="cosmic-glass-card w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-purple-200/80 hover:border-purple-400/40 transition-colors"
      >
        Manual deposit (PayPal, Chime, etc.)
        <ChevronDown className={`h-4 w-4 transition-transform ${manualOpen ? "rotate-180" : ""}`} />
      </button>

      {manualOpen && (
        <div className="space-y-4 cosmic-glass-card p-4">
          <GameDepositSection game={game} hideSectionAnchor />
          <p className="text-center text-xs text-purple-300/50">
            <Link href="/dashboard/deposits" className="text-cyan-400 hover:underline">
              View deposit history
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
