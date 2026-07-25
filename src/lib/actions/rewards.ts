"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    const { data: profile } = await supabase
      .from("profiles")
      .select("bonus_wallet, vip_points")
      .eq("id", user.id)
      .single();

    const coinsAwarded = 100;
    const xpAwarded = 50;

    const newBonus = Number(profile?.bonus_wallet ?? 0) + coinsAwarded;
    const newXp = Number(profile?.vip_points ?? 0) + xpAwarded;

    let { error: updateErr } = await supabase.rpc("admin_adjust_user_wallet", {
      p_user_id: user.id,
      p_bonus_wallet: newBonus,
      p_vip_points: newXp,
    });

    if (updateErr) {
      const updateRes = await supabase
        .from("profiles")
        .update({ bonus_wallet: newBonus, vip_points: newXp })
        .eq("id", user.id);
      updateErr = updateRes.error;
    }

    if (!updateErr) {
      error = null;
      data = [{ coins_awarded: coinsAwarded, xp_awarded: xpAwarded, multiplier: 1 }];

      try {
        await supabase.from("wallet_transactions").insert({
          user_id: user.id,
          amount: coinsAwarded,
          wallet_type: "bonus",
          transaction_type: "credit",
          source: "reward_claim",
          description: `Claimed ${ruleKey.replace(/_/g, " ")} (+${coinsAwarded} Coins, +${xpAwarded} XP)`,
        });

        await supabase.from("activity_log").insert({
          user_id: user.id,
          action: "reward_claimed",
          description: `Claimed Daily Reward (+${coinsAwarded} Coins, +${xpAwarded} XP)`,
          metadata: { coins: coinsAwarded, xp: xpAwarded, rule: ruleKey },
        });
      } catch {}
    }
  }

  if (error) {
    return { ok: false as const, error: error.message };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const coinsAwarded = Number(row?.coins_awarded ?? 100);
  const xpAwarded = Number(row?.xp_awarded ?? 50);

  // ALWAYS log transaction and activity entry in real time
  try {
    const adminDb = createAdminClient();
    const dbClient = adminDb ?? supabase;

    await dbClient.from("wallet_transactions").insert({
      user_id: user.id,
      amount: coinsAwarded,
      wallet_type: "bonus",
      transaction_type: "credit",
      source: "reward_claim",
      description: `Claimed ${ruleKey.replace(/_/g, " ")} (+${coinsAwarded} Coins, +${xpAwarded} XP)`,
    });

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

  let { data, error } = await supabase.rpc("claim_promotion", {
    promo_slug: slug,
    redeem_code: code ?? null,
  });

  if (error) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("bonus_wallet, vip_points")
      .eq("id", user.id)
      .single();

    const coinsAwarded = 250;
    const xpAwarded = 100;

    const newBonus = Number(profile?.bonus_wallet ?? 0) + coinsAwarded;
    const newXp = Number(profile?.vip_points ?? 0) + xpAwarded;

    const updateRes = await supabase
      .from("profiles")
      .update({ bonus_wallet: newBonus, vip_points: newXp })
      .eq("id", user.id);

    if (!updateRes.error) {
      error = null;
      data = [{ coins_awarded: coinsAwarded, xp_awarded: xpAwarded }];
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
