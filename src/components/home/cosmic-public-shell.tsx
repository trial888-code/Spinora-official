"use client";

import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/navbar";
import { CosmicPublicLanding } from "@/components/home/cosmic-public-landing";
import { CosmicUiScope } from "@/components/layout/cosmic-ui-scope";

type Props = {
  footer?: ReactNode;
};

/** Logged-out public page — mockup Prompt B, no sidebar, no global chat/ticker */
export function CosmicPublicShell({ footer }: Props) {
  return (
    <div className="min-h-screen cosmic-nebula-page text-foreground">
      <CosmicUiScope />
      <Navbar variant="cosmic" />
      <main className="pt-16 max-w-7xl mx-auto px-4 sm:px-6 pb-12">
        <CosmicPublicLanding footer={footer} />
      </main>
    </div>
  );
}
