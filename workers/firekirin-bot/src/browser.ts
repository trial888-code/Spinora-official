import { chromium, type BrowserContext, type Page } from "playwright";
import { findPanelTab } from "../../shared/find-panel-tab.js";

export const vpnHint = "FIREKIRIN agent panel requiring US IP VPN";

export async function openBrowserSession(): Promise<{
  context: BrowserContext;
  page: Page;
  close: () => Promise<void>;
}> {
  const cdpUrl = process.env.FIREKIRIN_CDP_URL ?? process.env.CDP_URL ?? "http://127.0.0.1:9222";
  const browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0] ?? (await browser.newContext());

  const page = await findPanelTab(context, {
    urlMatch: (url) => url.includes("firekirin"),
    panelName: "Fire Kirin",
    fallbackUrl: process.env.FIREKIRIN_ADMIN_URL || "http://agent.firekirin.xyz:8580/admin/login",
  });

  return {
    context,
    page,
    close: async () => {},
  };
}
