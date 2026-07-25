"use client";

import type { ReactNode } from "react";
import { AppLayout } from "@/components/layout/app-layout";

type Props = {
  children: ReactNode;
};

/** Logged-in home — same mockup shell as dashboard (image 5) */
export function CosmicLoggedInShell({ children }: Props) {
  return <AppLayout>{children}</AppLayout>;
}
