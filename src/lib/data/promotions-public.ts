import "server-only";

import { createClient } from "@/lib/supabase/server";

export type PublicPromotion = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  image_url: string | null;
  badge_text: string | null;
  code: string | null;
  is_featured: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

export async function getActivePromotions(): Promise<PublicPromotion[]> {
  const supabase = await createClient();
  let { data, error } = await supabase
    .from("promotions")
    .select("*")
    .eq("is_active", true);

  if (error || !data || data.length === 0) {
    const res = await supabase.from("promotions").select("*");
    data = res.data ?? [];
  }

  const raw = (data ?? []) as Record<string, unknown>[];
  return raw.map((p) => ({
    id: String(p.id ?? ""),
    slug: String(p.code ?? p.title ?? "promo").toLowerCase().replace(/\s+/g, "-"),
    title: String(p.title ?? "Special Promotion"),
    summary: String(p.description ?? "Exclusive offer from Spinora."),
    description: String(p.description ?? ""),
    image_url: (p.image_url as string) || null,
    badge_text: p.bonus_percent ? `+${p.bonus_percent}% EXTRA` : "HOT OFFER",
    code: (p.code as string) || null,
    is_featured: true,
    starts_at: null,
    ends_at: null,
  }));
}
