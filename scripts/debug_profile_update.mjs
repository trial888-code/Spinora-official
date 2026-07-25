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

async function debugProfileUpdate() {
  console.log("=== Debugging Profile Update ===");

  const { data: updated, error } = await db
    .from("profiles")
    .update({ wallet_balance: 15 })
    .eq("id", userId)
    .select();

  if (error) {
    console.error("❌ Update error:", error.message);
  } else {
    console.log("✅ Updated row:", updated);

    // Revert back to 5
    await db.from("profiles").update({ wallet_balance: 5 }).eq("id", userId);
  }
}

debugProfileUpdate();
