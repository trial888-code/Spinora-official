import type { Page } from "playwright";

export function log(prefix: string, message: string) {
  console.log(`[pandamaster-bot:${prefix}] ${message}`);
}

export async function screenshot(page: Page, name: string) {
  try {
    await page.screenshot({ path: `debug/pandamaster-${name}-${Date.now()}.png` });
  } catch {}
}
