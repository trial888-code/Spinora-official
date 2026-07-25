"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { CosmicSidebar } from "@/components/layout/cosmic-sidebar";
import { CosmicTopBar } from "@/components/layout/cosmic-top-bar";
import { CosmicBottomNav } from "@/components/layout/cosmic-bottom-nav";
import { CosmicUiScope } from "@/components/layout/cosmic-ui-scope";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: ReactNode;
  sidebarWalletSlot?: ReactNode;
  className?: string;
}

/** Mockup-matching Cosmic Arcade Glow shell — sidebar, top bar, bottom nav, nebula bg */
export function AppLayout({ children, sidebarWalletSlot, className }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    document.body.classList.add("cosmic-app-mode");
    return () => document.body.classList.remove("cosmic-app-mode");
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  return (
    <div className="cosmic-app-shell min-h-screen flex flex-col">
      <CosmicUiScope />
      <div className="flex flex-1 min-h-0">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-[220px] shrink-0 border-r border-purple-500/20 bg-[#0a0418]/40 backdrop-blur-sm">
          <CosmicSidebar walletSlot={sidebarWalletSlot} className="w-full" />
        </aside>

        {/* Main column */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <CosmicTopBar onMenuClick={() => setMobileOpen(true)} />
          <main
            className={cn(
              "flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide px-3 sm:px-5 pt-3 pb-28",
              className
            )}
          >
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>

      <CosmicBottomNav />

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="lg:hidden fixed inset-0 z-[60] bg-black/75 backdrop-blur-sm" onClick={closeMobile} aria-hidden />
          <aside className="lg:hidden fixed left-0 top-0 bottom-0 z-[70] w-[min(19rem,90vw)] cosmic-app-sidebar border-r border-purple-500/30 shadow-2xl">
            <div className="flex justify-end p-2 border-b border-purple-500/20">
              <button type="button" onClick={closeMobile} className="w-9 h-9 rounded-lg text-purple-300 hover:text-white" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <CosmicSidebar walletSlot={sidebarWalletSlot} />
          </aside>
        </>
      )}
    </div>
  );
}
