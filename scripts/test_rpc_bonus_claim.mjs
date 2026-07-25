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

async function testRpcClaim() {
  console.log("=== Testing Reward Claim via admin_adjust_user_wallet RPC ===");

  const { data: before } = await db.from("profiles").select("bonus_wallet, vip_points").eq("id", userId).single();
  console.log("Before Claim:", before);

  const coins = 100;
  const xp = 50;
  const newBonus = Number(before?.bonus_wallet ?? 0) + coins;
  const newXp = Number(before?.vip_points ?? 0) + xp;

  // Use admin_adjust_user_wallet RPC (sets session config to bypass protect_wallet_columns_trigger)
  const { error: rpcErr } = await db.rpc("admin_adjust_user_wallet", {
    p_user_id: userId,
    p_bonus_wallet: newBonus,
    p_vip_points: newXp
  });

  if (rpcErr) {
    console.error("❌ RPC Error:", rpcErr.message);
  } else {
    const { data: after } = await db.from("profiles").select("bonus_wallet, vip_points").eq("id", userId).single();
    console.log("✅ Success! After Claim via RPC:", after);
  }
}

testRpcClaim();
