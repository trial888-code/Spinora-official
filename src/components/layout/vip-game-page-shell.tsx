"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AppLayout } from "@/components/layout/app-layout";
import { CosmicUiScope } from "@/components/layout/cosmic-ui-scope";
import { Navbar } from "@/components/layout/navbar";

interface VipGamePageShellProps {
  children: React.ReactNode;
}

/** Game pages: Cosmic AppLayout when logged in; cosmic public chrome when logged out. */
export function VipGamePageShell({ children }: VipGamePageShellProps) {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setLoggedIn(false);
      return;
    }
    void supabase.auth.getUser().then(({ data: { user } }) => setLoggedIn(!!user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setLoggedIn(false);
      else if (event === "SIGNED_IN") setLoggedIn(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loggedIn === null) {
    return (
      <div className="cosmic-app-shell min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-purple-600 border-t-amber-400 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (loggedIn) {
    return (
      <AppLayout>
        <div className="vip-page-content">{children}</div>
      </AppLayout>
    );
  }

  return (
    <div className="min-h-screen cosmic-nebula-page text-foreground">
      <CosmicUiScope />
      <Navbar variant="cosmic" onSearchClick={() => router.push("/#games")} />
      <main className="pt-16 max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        <div className="vip-page-content">{children}</div>
      </main>
    </div>
  );
}

export function VipGamePageShellAuthed({ children }: VipGamePageShellProps) {
  return (
    <AppLayout>
      <div className="vip-page-content">{children}</div>
    </AppLayout>
  );
}

export function VipGamePageShellWithWallet({ children }: VipGamePageShellProps) {
  return <VipGamePageShell>{children}</VipGamePageShell>;
}
