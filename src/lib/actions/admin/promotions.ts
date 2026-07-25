"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  AdminActionResult,
  adminDb,
  authorize,
  writeAudit,
} from "@/lib/actions/admin/core";

const promoSchema = z.object({
  slug: z.string().trim().optional().default(""),
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(120),
  summary: z.string().trim().max(280).optional().default(""),
  description: z.string().trim().max(2000).optional().default(""),
  badge_text: z.string().trim().max(30).optional().nullable(),
  image_url: z.string().trim().optional().nullable(),
  coins_bonus: z.number().int().min(0).max(1_000_000).default(0),
  xp_bonus: z.number().int().min(0).max(1_000_000).default(0),
  code: z.string().trim().max(40).optional().nullable(),
  status: z.enum(["draft", "scheduled", "active", "expired", "archived"]).default("active"),
  is_featured: z.boolean().default(true),
  priority: z.number().int().min(0).max(9999).default(100),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
  max_claims: z.number().int().positive().optional().nullable(),
  max_claims_per_user: z.number().int().positive().max(100).default(1),
});

export type PromoFormInput = z.infer<typeof promoSchema>;

function slugify(text: string): string {
  const clean = text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return clean || `promo-${Date.now()}`;
}

export async function upsertPromotionAction(
  input: PromoFormInput & { id?: string }
): Promise<AdminActionResult> {
  const auth = await authorize("promotions.manage");
  if ("error" in auth) return { ok: false, error: auth.error };

  const parsed = promoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const rawData = parsed.data;
  const finalSlug = rawData.slug && /^[a-z0-9-]+$/.test(rawData.slug)
    ? rawData.slug
    : slugify(rawData.title);

  const db = adminDb();

  // Primary Extended Payload
  const fullPayload = {
    title: rawData.title,
    slug: finalSlug,
    summary: rawData.summary || rawData.title,
    description: rawData.description || rawData.title,
    badge_text: rawData.badge_text || null,
    image_url: rawData.image_url || null,
    coins_bonus: rawData.coins_bonus,
    xp_bonus: rawData.xp_bonus,
    code: rawData.code ? rawData.code.toUpperCase() : null,
    status: rawData.status,
    is_featured: rawData.is_featured,
    priority: rawData.priority,
    starts_at: rawData.starts_at || null,
    ends_at: rawData.ends_at || null,
    max_claims: rawData.max_claims ?? null,
    max_claims_per_user: rawData.max_claims_per_user,
  };

  // Base Schema Fallback Payload
  const basePayload = {
    title: rawData.title,
    description: rawData.description || rawData.title,
    code: rawData.code ? rawData.code.toUpperCase() : null,
    bonus_percent: rawData.coins_bonus || 20,
    is_active: rawData.status === "active",
  };

  if (input.id) {
    let { error } = await db.from("promotions").update(fullPayload).eq("id", input.id);

    if (error && /column.*schema cache|does not exist/i.test(error.message)) {
      console.warn("Falling back to base schema update for promotions...");
      const res = await db.from("promotions").update(basePayload).eq("id", input.id);
      error = res.error;
    }

    if (error) {
      return {
        ok: false,
        error: /duplicate|unique/.test(error.message)
          ? "That promo title or code is already in use."
          : `Could not save promotion: ${error.message}`,
      };
    }

    revalidatePath("/admin/promotions");
    revalidatePath("/promotions");
    return { ok: true, message: "Promotion updated successfully!", id: input.id };
  }

  // Insertion logic with automatic schema adaptation
  let { data, error } = await db
    .from("promotions")
    .insert(fullPayload)
    .select("id")
    .maybeSingle();

  if (error && /column.*schema cache|does not exist/i.test(error.message)) {
    console.warn("Extended columns missing in DB table. Inserting with base schema fallback...");
    const res = await db.from("promotions").insert(basePayload).select("id").single();
    data = res.data;
    error = res.error;
  }

  if (error || !data) {
    return {
      ok: false,
      error: /duplicate|unique/.test(error?.message ?? "")
        ? "That promo title or code already exists."
        : `Could not create promotion: ${error?.message || "Database insert error"}`,
    };
  }

  await writeAudit({
    actorId: auth.staff.userId,
    action: "promotion.create",
    entityType: "promotion",
    entityId: data.id,
    after: basePayload,
  });

  revalidatePath("/admin/promotions");
  revalidatePath("/promotions");
  return { ok: true, message: "🎉 Promotion created successfully!", id: data.id };
}

export async function setPromotionStatusAction(input: {
  id: string;
  status: "draft" | "scheduled" | "active" | "expired" | "archived";
}): Promise<AdminActionResult> {
  const auth = await authorize("promotions.manage");
  if ("error" in auth) return { ok: false, error: auth.error };

  const db = adminDb();
  let { error } = await db
    .from("promotions")
    .update({ status: input.status, is_active: input.status === "active" })
    .eq("id", input.id);

  if (error && /column.*schema cache/i.test(error.message)) {
    const res = await db.from("promotions").update({ is_active: input.status === "active" }).eq("id", input.id);
    error = res.error;
  }

  if (error) return { ok: false, error: "Could not update status." };

  revalidatePath("/admin/promotions");
  revalidatePath("/promotions");
  return { ok: true, message: `Promotion set to ${input.status}.` };
}

export async function deletePromotionAction(id: string): Promise<AdminActionResult> {
  const auth = await authorize("promotions.manage");
  if ("error" in auth) return { ok: false, error: auth.error };

  const db = adminDb();
  const { error } = await db.from("promotions").delete().eq("id", id);
  if (error) {
    return {
      ok: false,
      error: "Could not delete — members may have already claimed it. Archive it instead.",
    };
  }

  revalidatePath("/admin/promotions");
  revalidatePath("/promotions");
  return { ok: true, message: "Promotion deleted." };
}
