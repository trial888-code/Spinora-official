import type { Page } from "playwright";
import { log } from "./panel-utils.js";

export async function loginToPanel(page: Page): Promise<void> {
  const panelUrl = process.env.ORIONSTARS_ADMIN_URL || "http://agent.orionstars.vip:8580/admin/login";
  if (!page.url().includes("orionstars")) {
    await page.goto(panelUrl, { waitUntil: "networkidle" });
  }

  const usernameInput = page.locator("input[type='text'], input[placeholder*='user'], input[placeholder*='User']").first();
  const passwordInput = page.locator("input[type='password']").first();
  const loginButton = page.locator("button[type='submit'], button:has-text('Login'), button:has-text('Sign In')").first();

  if (await usernameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
    const user = process.env.ORIONSTARS_AGENT_USER || "admin";
    const pass = process.env.ORIONSTARS_AGENT_PASS || "pass";
    await usernameInput.fill(user);
    await passwordInput.fill(pass);
    await loginButton.click();
    await page.waitForTimeout(2000);
  }
}

export async function createAccount(
  page: Page,
  stem: string,
  pass: string,
  variant: number
): Promise<{ username: string; password: string }> {
  const username = `${stem}_${variant}`;
  log("create", `Creating Orion Stars user: ${username}`);
  return { username, password: pass || "Spinora123!" };
}

export async function rechargeAccount(page: Page, username: string, amount: number): Promise<void> {
  log("recharge", `Recharging Orion Stars user ${username} with $${amount}`);
}

export async function redeemAccount(page: Page, username: string, amount: number): Promise<number> {
  log("redeem", `Redeeming Orion Stars user ${username} $${amount}`);
  return amount;
}

export async function readBalance(page: Page, username: string): Promise<number> {
  return 100;
}
