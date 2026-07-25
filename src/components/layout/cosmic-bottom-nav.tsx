"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gamepad2,
  Wallet,
  ShoppingCart,
  User,
  HelpCircle,
  Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Games", href: "/dashboard", icon: Gamepad2 },
  { label: "Cash", href: "/dashboard/wallet", icon: Banknote },
  { label: "Wallets", href: "/dashboard/deposits", icon: Wallet },
  { label: "Account", href: "/dashboard", icon: User },
  { label: "Help", href: "/dashboard/messages", icon: HelpCircle },
];

export function CosmicBottomNav() {
  const pathname = usePathname();
  const left = NAV.slice(0, 2);
  const right = NAV.slice(2);

  function active(href: string) {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  }

  return (
    <nav className="cosmic-foot-bar lg:pl-[220px] pb-[env(safe-area-inset-bottom)]">
      <div className="flex w-full max-w-5xl mx-auto items-center justify-between">
        <div className="flex gap-6 sm:gap-10">
          {left.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide",
                active(href) ? "text-amber-400" : "text-purple-300/55 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>

        <Link href="/dashboard/deposit" className="relative -mt-6 shrink-0" aria-label="Deposit">
          <div className="absolute inset-0 bg-amber-400/35 blur-xl rounded-full scale-150" />
          <div className="relative w-14 h-14 rounded-full cosmic-gold-btn flex items-center justify-center border-2 border-amber-100">
            <ShoppingCart className="h-6 w-6 text-amber-950" strokeWidth={2.5} />
          </div>
        </Link>

        <div className="flex gap-6 sm:gap-10">
          {right.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-wide",
                active(href) ? "text-amber-400" : "text-purple-300/55 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
