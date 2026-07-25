"use client";

import { useEffect } from "react";

/** Activates cosmic theme + hides global chat/ticker/footer chrome from root layout */
export function CosmicUiScope() {
  useEffect(() => {
    document.body.classList.add("cosmic-ui-active");
    return () => document.body.classList.remove("cosmic-ui-active");
  }, []);
  return null;
}
