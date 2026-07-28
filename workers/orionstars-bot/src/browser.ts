import { chromium, type BrowserContext, type Page } from "playwright";
import { findPanelTab } from "../../shared/find-panel-tab.js";

export async function openBrowserSession(): Promise<{
  context: BrowserContext;
  page: Page;
  close: () => Promise<void>;
}> {
  const cdpUrl = process.env.ORIONSTARS_CDP_URL ?? process.env.CDP_URL ?? "http://127.0.0.1:9222";
  const browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0] ?? (await browser.newContext());

  const page = await findPanelTab(context, {
    urlMatch: (url) => url.includes("orionstars"),
    panelName: "Orion Stars",
    fallbackUrl: process.env.ORIONSTARS_ADMIN_URL || "http://agent.orionstars.vip:8580/admin/login",
  });

  return {
    context,
    page,
    close: async () => {},
  };
}
