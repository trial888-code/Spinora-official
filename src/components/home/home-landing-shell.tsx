"use client";

import { useState, useEffect, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useLobbyProfile } from "@/components/home/lobby/use-lobby-profile";
import { LobbyMissionsPanel } from "@/components/home/lobby/lobby-missions-panel";
import { AppLayout } from "@/components/layout/app-layout";
import type { Game } from "@/lib/games";

const ActivityToast = dynamic(
  () => import("@/components/ui/ActivityToast").then((m) => m.ActivityToast),
  { ssr: false, loading: () => null }
);

function DeferredActivityToast() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 3000);
    return () => clearTimeout(timer);
  }, []);
  if (!ready) return null;
  return <ActivityToast />;
}

interface HomeLandingShellProps {
  initialLoggedIn?: boolean;
  linkedGameSlugs?: string[];
  lobbyCatalog?: Game[];
  loggedInHub?: ReactNode;
}

/** Logged-in home only — mockup dashboard shell (image 5). Public uses CosmicPublicShell. */
export function HomeLandingShell({
  initialLoggedIn = false,
  loggedInHub,
}: HomeLandingShellProps) {
  const { isLoggedIn, ready: authReady } = useLobbyProfile();
  const loggedIn = authReady ? isLoggedIn : initialLoggedIn;
  const [lobbyMenu, setLobbyMenu] = useState<"lobby" | "missions">("lobby");

  useEffect(() => {
    function syncFromHash() {
      if (window.location.pathname !== "/") return;
      if (window.location.hash === "#missions") setLobbyMenu("missions");
      else if (!window.location.hash || window.location.hash === "#games") setLobbyMenu("lobby");
    }
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  if (!authReady) {
    return (
      <div className="cosmic-app-shell min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-purple-600 border-t-amber-400 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (!loggedIn) return null;

  return (
    <AppLayout>
      {lobbyMenu === "missions" ? (
        <section id="missions">
          <LobbyMissionsPanel />
        </section>
      ) : (
        loggedInHub
      )}
      <DeferredActivityToast />
    </AppLayout>
  );
}
