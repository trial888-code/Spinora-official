import { chromium, type BrowserContext, type Page } from "playwright";
import { findPanelTab } from "../../shared/find-panel-tab.js";

export async function openBrowserSession(): Promise<{
  context: BrowserContext;
  page: Page;
  close: () => Promise<void>;
}> {
  const cdpUrl = process.env.PANDAMASTER_CDP_URL ?? process.env.CDP_URL ?? "http://127.0.0.1:9222";
  const browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0] ?? (await browser.newContext());

  const page = await findPanelTab(context, {
    urlMatch: (url) => url.includes("pandamaster"),
    panelName: "Panda Master",
    fallbackUrl: process.env.PANDAMASTER_ADMIN_URL || "https://agent.pandamaster.vip:8888/admin/login",
  });

  return {
    context,
    page,
    close: async () => {},
  };
}
