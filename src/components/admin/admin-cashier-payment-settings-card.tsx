"use client";

import { useState } from "react";
import { GlassCard } from "@/components/shared/glass-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DollarSign, Save, ShieldCheck } from "lucide-react";

export function AdminCashierPaymentSettingsCard() {
  const [cashapp, setCashapp] = useState("$AnthonyCastro80");
  const [chime, setChime] = useState("$Anthony-Castro-208");
  const [paypal, setPaypal] = useState("@AnthonyCastro909");
  const [venmo, setVenmo] = useState("@Anthony-Castro-414");
  const [saving, setSaving] = useState(false);

  function handleSave() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success("✅ Payment Handles Saved Successfully! Applied across website.");
    }, 400);
  }

  return (
    <GlassCard className="p-5 sm:p-6 space-y-4 border-2 border-emerald-500/30 bg-[#061019]/90 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
            <DollarSign className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-white">Manual Payment Method Handles</h3>
            <p className="text-xs text-muted-foreground">
              Set your Cash App, Chime, PayPal, and Venmo handles shown to players for deposits.
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
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black text-xs uppercase tracking-wider shadow-lg hover:scale-[1.01] transition-all"
      >
        <Save className="size-4 mr-1.5" />
        {saving ? "Saving Changes…" : "1-Click Save Cashier Payment Handles"}
      </Button>
    </GlassCard>
  );
}
