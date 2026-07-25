"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Coins,
  Zap,
  ShieldCheck,
  Copy,
  Radio,
  Clock,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type PaymentData = {
  payment_id?: string;
  invoice_url?: string;
  pay_address?: string;
  pay_amount?: number;
  pay_currency?: string;
};

const AMOUNTS = [10, 20, 50, 100, 250] as const;

const CURRENCIES = [
  { id: "usdttrc20", label: "USDT TRC20", icon: "💎" },
  { id: "usdtbep20", label: "USDT BEP20", icon: "💎" },
  { id: "btc", label: "BTC", icon: "⚡" },
  { id: "eth", label: "ETH", icon: "🔷" },
  { id: "sol", label: "SOL", icon: "☀️" },
] as const;

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function NowPaymentsDepositModal() {
  const [amount, setAmount] = useState<number>(20);
  const [currency, setCurrency] = useState<string>("usdttrc20");
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [countdown, setCountdown] = useState(20 * 60);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!paymentData?.pay_address) return;
    setCountdown(20 * 60);
    const timer = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [paymentData?.pay_address]);

  const copy = useCallback((text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  }, []);

  async function handleCreateInvoice() {
    if (amount < 5) {
      toast.error("Minimum deposit amount is $5");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/payments/nowpayments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, currency, userId: userId ?? "guest_user" }),
      });

      const data = await res.json();
      setLoading(false);

      if (data.invoice_url || data.pay_address) {
        setPaymentData(data);
        toast.success(`Payment invoice ready — send $${amount} via NOWPayments`);
        if (data.invoice_url && !data.pay_address) {
          window.open(data.invoice_url, "_blank");
        }
      } else {
        toast.error(data.error || "Could not generate invoice");
      }
    } catch {
      setLoading(false);
      toast.error("Error connecting to NOWPayments API");
    }
  }

  const qrUrl =
    paymentData?.pay_address
      ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(paymentData.pay_address)}`
      : null;

  return (
    <div className="cosmic-cashier-modal cosmic-glass-card rounded-2xl p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-500/25 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/35 shadow-[0_0_15px_rgba(251,191,36,0.25)]">
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-black text-white text-lg">NOWPayments Crypto Cashier</h3>
            <p className="text-xs text-purple-200/60">USDT, BTC, ETH, SOL — automated crediting</p>
          </div>
        </div>
        <Badge className="bg-emerald-500/20 text-emerald-300 font-mono text-[10px] border border-emerald-500/35 cosmic-ipn-pulse">
          <ShieldCheck className="h-3 w-3 mr-1 inline" /> AUTOMATED IPN
        </Badge>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-black uppercase tracking-[0.14em] text-purple-300/70 block mb-2">
            Select deposit amount
          </label>
          <div className="flex flex-wrap gap-2">
            {AMOUNTS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(val)}
                className={`flex-1 min-w-[3.5rem] rounded-xl border px-3 py-2.5 text-xs font-extrabold transition-all ${
                  amount === val
                    ? "cosmic-gold-btn border-amber-200/80"
                    : "border-purple-500/30 bg-[#0a0418]/60 text-purple-200/80 hover:border-purple-400/50"
                }`}
              >
                ${val}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-black uppercase tracking-[0.14em] text-purple-300/70 block mb-2">
            Select cryptocurrency
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {CURRENCIES.map(({ id, label, icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setCurrency(id)}
                className={`rounded-xl border px-2 py-3 text-[10px] font-bold transition-all ${
                  currency === id
                    ? "border-amber-500/60 bg-amber-500/15 text-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.2)]"
                    : "border-purple-500/25 bg-[#0a0418]/50 text-purple-200/70 hover:border-purple-400/40"
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>
        </div>

        {!paymentData?.pay_address ? (
          <button
            type="button"
            onClick={handleCreateInvoice}
            disabled={loading}
            className="w-full cosmic-gold-btn inline-flex items-center justify-center gap-2 py-4 text-sm uppercase tracking-wide disabled:opacity-60"
          >
            <Zap className="h-4 w-4" />
            {loading ? "Generating Payment…" : `Create $${amount} Crypto Invoice`}
          </button>
        ) : (
          <div className="grid sm:grid-cols-[180px_1fr] gap-4 rounded-xl border border-cyan-500/30 bg-[#0a0418]/50 p-4">
            <div className="flex flex-col items-center gap-2">
              {qrUrl ? (
                <div className="relative h-[180px] w-[180px] rounded-xl border-2 border-amber-500/40 bg-white p-2 shadow-[0_0_20px_rgba(251,191,36,0.2)]">
                  <Image src={qrUrl} alt="Payment QR code" fill className="object-contain p-1" unoptimized />
                </div>
              ) : null}
              <p className="text-[10px] text-purple-300/60 text-center">Scan to pay</p>
            </div>

            <div className="space-y-3 min-w-0">
              <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                <span className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                  <Radio className="h-3.5 w-3.5 cosmic-ipn-pulse" /> IPN listener active
                </span>
                <span className="flex items-center gap-1 text-xs font-mono font-bold text-amber-300">
                  <Clock className="h-3.5 w-3.5" /> {formatCountdown(countdown)}
                </span>
              </div>

              {paymentData.payment_id ? (
                <div className="flex items-center gap-2 rounded-xl border border-purple-500/25 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase text-purple-400/80">Payment ID</p>
                    <p className="truncate font-mono text-xs text-white">{paymentData.payment_id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copy(String(paymentData.payment_id), "Payment ID")}
                    className="cosmic-copy-btn shrink-0"
                  >
                    <Copy className="h-3 w-3 inline mr-1" /> Copy
                  </button>
                </div>
              ) : null}

              {paymentData.pay_address ? (
                <div className="flex items-center gap-2 rounded-xl border border-cyan-500/30 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-bold uppercase text-cyan-400/80">Deposit wallet address</p>
                    <p className="truncate font-mono text-[11px] text-white">{paymentData.pay_address}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copy(paymentData.pay_address!, "Wallet address")}
                    className="cosmic-copy-btn shrink-0"
                  >
                    <Copy className="h-3 w-3 inline mr-1" /> Copy
                  </button>
                </div>
              ) : null}

              {paymentData.invoice_url ? (
                <a
                  href={paymentData.invoice_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Open full invoice <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
