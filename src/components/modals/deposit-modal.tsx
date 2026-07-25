"use client";

import { useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { NowPaymentsDepositModal } from "@/components/wallet/nowpayments-deposit-modal";

const QUICK_AMOUNTS = [10, 20, 50, 100] as const;

type DepositModalProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerClassName?: string;
};

export function DepositModal({ open: controlledOpen, onOpenChange, triggerClassName }: DepositModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("cosmic-gold-btn px-6 py-2 text-xs uppercase tracking-wider font-black", triggerClassName)}
      >
        Quick Deposit
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Deposit"
        className="relative w-full max-w-lg cosmic-cashier-modal cosmic-glass-card rounded-2xl p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute top-3 right-3 w-8 h-8 rounded-lg border border-purple-500/30 text-purple-300 hover:text-white flex items-center justify-center"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-400">Spinora Cashier</p>
          <h2 className="text-xl font-black text-white">Confirm Deposit</h2>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {["VISA", "Mastercard", "BTC", "USDT", "SOL"].map((method) => (
            <span
              key={method}
              className="rounded-xl border border-purple-500/30 bg-[#0a0418]/60 px-3 py-2 text-[10px] font-bold text-purple-100"
            >
              {method}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {QUICK_AMOUNTS.map((amt) => (
            <Link
              key={amt}
              href={`/dashboard/deposit?amount=${amt}`}
              onClick={() => setOpen(false)}
              className="cosmic-glass-card rounded-xl py-3 text-center text-sm font-black text-amber-300 hover:border-amber-500/50 transition-all"
            >
              ${amt}
            </Link>
          ))}
        </div>

        <NowPaymentsDepositModal />

        <p className="mt-3 text-[10px] text-center text-purple-300/50">
          Manual methods (PayPal, Chime, etc.) available on the{" "}
          <Link href="/dashboard/deposit" className="text-cyan-400 underline" onClick={() => setOpen(false)}>
            full deposit page
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
