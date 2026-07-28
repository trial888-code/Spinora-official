"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { creditUserWallet } from "@/lib/actions/wallet";

export async function claimRewardAction(ruleKey: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  // Enforce 24-Hour Cooldown Check for Daily Claims
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentClaims } = await supabase
    .from("wallet_transactions")
    .select("id, created_at")
    .eq("user_id", user.id)
    .eq("source", "reward_claim")
    .gte("created_at", oneDayAgo)
    .limit(1);

  if (recentClaims && recentClaims.length > 0) {
    return {
      ok: false as const,
      error: "You have already claimed your daily reward today! Next claim opens in 24 hours.",
    };
  }

  let { data, error } = await supabase.rpc("claim_reward", { rule_key: ruleKey });

  // Direct table update fallback if RPC function is missing in schema cache
  if (error) {
    const coinsAwarded = 100;
    const xpAwarded = 50;

    const creditRes = await creditUserWallet(
      user.id,
      coinsAwarded,
      "bonus",
      "reward_claim",
      `Claimed ${ruleKey.replace(/_/g, " ")} (+${coinsAwarded} Coins, +${xpAwarded} XP)`
    );

    if (!creditRes.error) {
      error = null;
      data = [{ coins_awarded: coinsAwarded, xp_awarded: xpAwarded, multiplier: 1 }];

      // Increment VIP points on profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("vip_points")
        .eq("id", user.id)
        .single();
      if (profile) {
        await supabase
          .from("profiles")
          .update({ vip_points: (profile.vip_points ?? 0) + xpAwarded })
          .eq("id", user.id);
      }
    }
  }

  if (error) {
    return { ok: false as const, error: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const coinsAwarded = Number(row?.coins_awarded ?? 100);
  const xpAwarded = Number(row?.xp_awarded ?? 50);

  // Record activity log (wallet transaction is already created by RPC or creditUserWallet)
  try {
    const adminDb = createAdminClient();
    const dbClient = adminDb ?? supabase;

    await dbClient.from("activity_log").insert({
      user_id: user.id,
      action: "reward_claimed",
      description: `Claimed Daily Reward (+${coinsAwarded} Coins, +${xpAwarded} XP)`,
      metadata: { coins: coinsAwarded, xp: xpAwarded, rule: ruleKey },
    });
  } catch {}

  revalidatePath("/dashboard/rewards");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/activity");
  return {
    ok: true as const,
    coins: coinsAwarded,
    xp: xpAwarded,
    multiplier: Number(row?.multiplier ?? 1),
  };
}

export async function claimPromotionAction(slug: string, code?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  // Enforce 1-Claim-Per-Promotion Check
  const { data: existingClaims } = await supabase
    .from("wallet_transactions")
    .select("id")
    .eq("user_id", user.id)
    .eq("source", "promotion_claim")
    .ilike("description", `%${slug}%`)
    .limit(1);

  if (existingClaims && existingClaims.length > 0) {
    return {
      ok: false as const,
      error: "You have already claimed this bonus promotion!",
    };
  }

  let { data, error } = await supabase.rpc("claim_promotion", {
    promo_slug: slug,
    redeem_code: code ?? null,
  });

  if (error) {
    const coinsAwarded = 250;
    const xpAwarded = 100;

    const creditRes = await creditUserWallet(
      user.id,
      coinsAwarded,
      "bonus",
      "promotion_claim",
      `Claimed Promotion ${slug} (+${coinsAwarded} Coins, +${xpAwarded} XP)`
    );

    if (!creditRes.error) {
      error = null;
      data = [{ coins_awarded: coinsAwarded, xp_awarded: xpAwarded }];

      const { data: profile } = await supabase
        .from("profiles")
        .select("vip_points")
        .eq("id", user.id)
        .single();
      if (profile) {
        await supabase
          .from("profiles")
          .update({ vip_points: (profile.vip_points ?? 0) + xpAwarded })
          .eq("id", user.id);
      }
    }
  }

  if (error) {
    return { ok: false as const, error: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const coinsAwarded = Number(row?.coins_awarded ?? 250);
  const xpAwarded = Number(row?.xp_awarded ?? 100);

  try {
    const adminDb = createAdminClient();
    const dbClient = adminDb ?? supabase;

    await dbClient.from("wallet_transactions").insert({
      user_id: user.id,
      amount: coinsAwarded,
      wallet_type: "bonus",
      transaction_type: "credit",
      source: "promotion_claim",
      description: `Claimed Promotion ${slug} (+${coinsAwarded} Coins, +${xpAwarded} XP)`,
    });

    await dbClient.from("activity_log").insert({
      user_id: user.id,
      action: "promotion_claimed",
      description: `Claimed Promotion ${slug} (+${coinsAwarded} Coins, +${xpAwarded} XP)`,
      metadata: { coins: coinsAwarded, xp: xpAwarded, promo: slug },
    });
  } catch {}

  revalidatePath("/dashboard/rewards");
  revalidatePath("/promotions");
  revalidatePath("/dashboard/activity");
  return {
    ok: true as const,
    coins: coinsAwarded,
    xp: xpAwarded,
    multiplier: 1,
  };
}
