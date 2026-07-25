import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {}
}

loadEnv();

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const userId = "c1931a25-745b-42aa-a3d4-857d267cdf31";

async function testAdjustCoins() {
  console.log("=== Testing Bonus Wallet & VIP Points Adjustment ===");

  const { data: before } = await db.from("profiles").select("bonus_wallet, vip_points").eq("id", userId).single();
  console.log("Before:", before);

  const { error: err1 } = await db.from("profiles").update({ bonus_wallet: Number(before?.bonus_wallet ?? 0) + 20 }).eq("id", userId);
  if (err1) console.error("❌ Bonus wallet error:", err1.message);
  else console.log("✅ Bonus wallet updated (+20) successfully!");

  const { error: err2 } = await db.from("profiles").update({ vip_points: Number(before?.vip_points ?? 0) + 100 }).eq("id", userId);
  if (err2) console.error("❌ VIP points error:", err2.message);
  else console.log("✅ VIP points updated (+100) successfully!");

  // Revert back for clean state
  await db.from("profiles").update({ bonus_wallet: before?.bonus_wallet ?? 0, vip_points: before?.vip_points ?? 0 }).eq("id", userId);
  console.log("Reverted back for clean state.");
}

testAdjustCoins();
