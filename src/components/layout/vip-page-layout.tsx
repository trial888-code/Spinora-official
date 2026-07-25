"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { AppLayout } from "@/components/layout/app-layout";
import { CosmicUiScope } from "@/components/layout/cosmic-ui-scope";
import { useLobbyProfile } from "@/components/home/lobby/use-lobby-profile";

const AUTH_PREFIXES = ["/login", "/register", "/reset-password"];
const SKIP_VIP_SHELL_PREFIXES = ["/", "/dashboard", "/admin"];

function shouldSkipVipShell(pathname: string) {
  return SKIP_VIP_SHELL_PREFIXES.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(`${p}/`))
  );
}

function isAuthRoute(pathname: string) {
  return AUTH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

interface VipPageLayoutProps {
  children: ReactNode;
  contentClassName?: string;
}

/** Public pages: cosmic landing chrome. Logged-in: Cosmic AppLayout (mockup shell). */
export function VipPageLayout({ children, contentClassName }: VipPageLayoutProps) {
  const pathname = usePathname();
  const { isLoggedIn, ready } = useLobbyProfile();

  if (!ready) {
    return (
      <div className="cosmic-app-shell min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-purple-600 border-t-amber-400 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (!isLoggedIn || isAuthRoute(pathname) || shouldSkipVipShell(pathname)) {
    return (
      <div className="min-h-screen cosmic-nebula-page text-foreground">
        <CosmicUiScope />
        <Navbar variant="cosmic" />
        <main className="pt-16 max-w-7xl mx-auto px-4 sm:px-6 pb-12">
          <div className={contentClassName}>{children}</div>
        </main>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className={contentClassName ?? "vip-page-content"}>{children}</div>
    </AppLayout>
  );
}

export { shouldSkipVipShell, isAuthRoute };
