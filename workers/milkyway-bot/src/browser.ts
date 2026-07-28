import { chromium, type BrowserContext, type Page } from "playwright";
import { findPanelTab } from "../../shared/find-panel-tab.js";

export async function openBrowserSession(): Promise<{
  context: BrowserContext;
  page: Page;
  close: () => Promise<void>;
}> {
  const cdpUrl = process.env.MILKYWAY_CDP_URL ?? process.env.CDP_URL ?? "http://127.0.0.1:9222";
  const browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0] ?? (await browser.newContext());

  const page = await findPanelTab(context, {
    urlMatch: (url) => url.includes("milkyway"),
    panelName: "Milky Way",
    fallbackUrl: process.env.MILKYWAY_ADMIN_URL || "https://agent.milkywayapp.xyz/admin/login",
  });

  return {
    context,
    page,
    close: async () => {},
  };
}
