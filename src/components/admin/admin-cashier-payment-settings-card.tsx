"use client";

import { useState, useTransition } from "react";
import { GlassCard } from "@/components/shared/glass-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DollarSign, Save, ShieldCheck, QrCode } from "lucide-react";
import { updateCashierPaymentHandlesAction } from "@/lib/actions/admin/settings";

interface AdminCashierPaymentSettingsCardProps {
  initialSettings?: {
    cashier_cashapp?: string;
    cashier_chime?: string;
    cashier_paypal?: string;
    cashier_venmo?: string;
    cashier_zelle?: string;
    cashier_usdt_address?: string;
  };
}

export function AdminCashierPaymentSettingsCard({ initialSettings }: AdminCashierPaymentSettingsCardProps) {
  const [cashapp, setCashapp] = useState(initialSettings?.cashier_cashapp ?? "$AnthonyCastro80");
  const [chime, setChime] = useState(initialSettings?.cashier_chime ?? "$Anthony-Castro-208");
  const [paypal, setPaypal] = useState(initialSettings?.cashier_paypal ?? "@AnthonyCastro909");
  const [venmo, setVenmo] = useState(initialSettings?.cashier_venmo ?? "@Anthony-Castro-414");
  const [zelle, setZelle] = useState(initialSettings?.cashier_zelle ?? "support@spinoracasinos.com");
  const [usdtAddress, setUsdtAddress] = useState(initialSettings?.cashier_usdt_address ?? "TRX...YourUSDTAddress");
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const res = await updateCashierPaymentHandlesAction({
        cashapp,
        chime,
        paypal,
        venmo,
        zelle,
        usdt_address: usdtAddress,
      });

      if (!res.ok) {
        toast.error(res.error || "Failed to save payment handles.");
      } else {
        toast.success(res.message || "✅ Payment Handles Saved Successfully!");
      }
    });
  }

  return (
    <GlassCard className="p-5 sm:p-6 space-y-4 border-2 border-emerald-500/30 bg-[#061019]/90 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <DollarSign className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white">Deposit Cashier Payment Handles</h3>
            <p className="text-xs text-muted-foreground">
              Set your Cash App, Chime, PayPal, Venmo, Zelle, and USDT wallet addresses shown to players.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          <ShieldCheck className="size-3 inline mr-1" /> Live Cashier
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 bg-black/40 p-3 rounded-xl border border-white/10">
          <label className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
            <span>💚 Cash App $tag</span>
          </label>
          <Input
            value={cashapp}
            onChange={(e) => setCashapp(e.target.value)}
            placeholder="$YourCashAppTag"
            className="bg-black/60 border-emerald-500/30 text-white font-mono text-xs"
          />
        </div>

        <div className="space-y-1.5 bg-black/40 p-3 rounded-xl border border-white/10">
          <label className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
            <span>🟢 Chime $tag</span>
          </label>
          <Input
            value={chime}
            onChange={(e) => setChime(e.target.value)}
            placeholder="$YourChimeTag"
            className="bg-black/60 border-teal-500/30 text-white font-mono text-xs"
          />
        </div>

        <div className="space-y-1.5 bg-black/40 p-3 rounded-xl border border-white/10">
          <label className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
            <span>🔷 PayPal @username</span>
          </label>
          <Input
            value={paypal}
            onChange={(e) => setPaypal(e.target.value)}
            placeholder="@YourPayPalUsername"
            className="bg-black/60 border-blue-500/30 text-white font-mono text-xs"
          />
        </div>

        <div className="space-y-1.5 bg-black/40 p-3 rounded-xl border border-white/10">
          <label className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
            <span>🔹 Venmo @username</span>
          </label>
          <Input
            value={venmo}
            onChange={(e) => setVenmo(e.target.value)}
            placeholder="@YourVenmoUsername"
            className="bg-black/60 border-sky-500/30 text-white font-mono text-xs"
          />
        </div>

        <div className="space-y-1.5 bg-black/40 p-3 rounded-xl border border-white/10">
          <label className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
            <span>🟣 Zelle Email / Phone</span>
          </label>
          <Input
            value={zelle}
            onChange={(e) => setZelle(e.target.value)}
            placeholder="zelle@yourdomain.com or phone"
            className="bg-black/60 border-purple-500/30 text-white font-mono text-xs"
          />
        </div>

        <div className="space-y-1.5 bg-black/40 p-3 rounded-xl border border-white/10">
          <label className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
            <QrCode className="size-3.5" />
            <span>🪙 Direct USDT (TRC20 / ERC20) Wallet Address</span>
          </label>
          <Input
            value={usdtAddress}
            onChange={(e) => setUsdtAddress(e.target.value)}
            placeholder="T...YourUSDTAddress"
            className="bg-black/60 border-amber-500/30 text-white font-mono text-xs"
          />
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={pending}
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black text-xs uppercase tracking-wider shadow-lg hover:scale-[1.01] transition-all"
      >
        <Save className="size-4 mr-1.5" />
        {pending ? "Saving Changes…" : "1-Click Save Cashier Payment Handles"}
      </Button>
    </GlassCard>
  );
}
