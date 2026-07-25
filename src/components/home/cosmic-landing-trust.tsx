import { Headphones, Shield, Wallet } from "lucide-react";
import Image from "next/image";

const CRYPTO = [
  { label: "USDT", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/40" },
  { label: "BTC", color: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/40" },
  { label: "ETH", color: "text-violet-400", bg: "bg-violet-500/15 border-violet-500/40" },
  { label: "SOL", color: "text-cyan-400", bg: "bg-cyan-500/15 border-cyan-500/40" },
];

export function CosmicLandingTrust() {
  return (
    <section className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="cosmic-glass-card p-5 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-purple-300/70 mb-4">Trust &amp; Safety</p>
          <ul className="space-y-4">
            {[
              { icon: Shield, title: "Secure & Fair Play", color: "text-amber-400" },
              { icon: Wallet, title: "Instant Withdraws", color: "text-emerald-400" },
              { icon: Headphones, title: "24/7 Support", color: "text-cyan-400" },
            ].map(({ icon: Icon, title, color }) => (
              <li key={title} className="flex items-center gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl cosmic-glass-card ${color}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <p className="font-black text-white text-sm uppercase tracking-wide">{title}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="cosmic-glass-card p-5 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-purple-300/70 mb-4">NOWPayments Crypto Deposit</p>
          <div className="grid grid-cols-2 gap-3">
            {CRYPTO.map(({ label, color, bg }) => (
              <div key={label} className={`flex items-center justify-center gap-2 rounded-xl border py-4 ${bg}`}>
                <span className={`text-xl font-black ${color}`}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="cosmic-glass-card p-5 flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
            <Headphones className="h-7 w-7" />
          </span>
          <div>
            <p className="font-black text-white text-lg">24/7 Live Support</p>
            <p className="text-xs text-purple-200/60 mt-1">Real humans ready to help with deposits, loads, and cashouts anytime.</p>
          </div>
        </div>
        <div className="cosmic-glass-card relative overflow-hidden min-h-[120px] p-4">
          <Image src="/images/promos/spinora_model_five.jpg" alt="" fill className="object-cover object-top opacity-40" />
          <div className="relative z-10 flex items-end h-full">
            <p className="font-black text-amber-400 text-sm uppercase tracking-wider">Spinora Mobile · Crypto Ready</p>
          </div>
        </div>
      </div>
    </section>
  );
}
