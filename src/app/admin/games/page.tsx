import type { Metadata } from "next";
import Image from "next/image";
import { Check, Minus, Webhook } from "lucide-react";
import { revalidatePath } from "next/cache";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import {
  EntityEditDialog,
  type FieldValue,
} from "@/components/admin/entity-edit-dialog";
import { GlassCard } from "@/components/shared/glass-card";
import { Badge } from "@/components/ui/badge";
import { adminDb, authorize } from "@/lib/actions/admin/core";
import { upsertGameAction } from "@/lib/actions/admin/cms";
import { requirePermission } from "@/lib/data/admin";
import { GAMES } from "@/lib/games";

async function saveGameServerConfig(
  gameId: string,
  values: Record<string, FieldValue>
): Promise<{ ok: true } | { ok: false; error: string }> {
  "use server";
  const auth = await authorize("cms.manage");
  if ("error" in auth) return { ok: false, error: auth.error };

  const db = adminDb();
  const { error } = await db.from("game_server_configs").upsert(
    {
      game_id:        gameId,
      webhook_secret: values.webhook_secret ? String(values.webhook_secret) : null,
      is_enabled:     Boolean(values.is_enabled),
      api_base_url:   values.api_base_url   ? String(values.api_base_url)   : null,
      api_username:   values.api_username   ? String(values.api_username)   : null,
      api_password:   values.api_password   ? String(values.api_password)   : null,
      notes:          values.notes          ? String(values.notes)          : null,
    },
    { onConflict: "game_id" }
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/games");
  return { ok: true };
}

async function saveGameBonusAndStatus(
  gameId: string,
  slug: string,
  values: Record<string, FieldValue>
): Promise<{ ok: true } | { ok: false; error: string }> {
  "use server";
  const auth = await authorize("cms.manage");
  if ("error" in auth) return { ok: false, error: auth.error };

  const db = adminDb();

  const firstBonus = Number(values.first_bonus ?? 100);
  const reloadBonus = Number(values.reload_bonus ?? 20);
  const status = String(values.status || "live");
  const customBadge = values.badge_text ? String(values.badge_text) : "";

  const isActive = status === "live";
  const isUpcoming = status === "upcoming";
  const badgeText = isUpcoming
    ? "UPCOMING"
    : customBadge || `${firstBonus}% MATCH`;

  await db.from("games").upsert(
    {
      id: gameId,
      slug,
      name: String(values.name || slug),
      category_id: "00000000-0000-0000-0000-000000000001",
      badge_text: badgeText,
      is_active: isActive,
    },
    { onConflict: "slug" }
  );

  const notesJson = JSON.stringify({
    first_bonus: firstBonus,
    reload_bonus: reloadBonus,
    is_upcoming: isUpcoming,
    status,
  });

  const { error } = await db.from("game_server_configs").upsert(
    {
      game_id: gameId,
      notes: notesJson,
    },
    { onConflict: "game_id" }
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/games");
  revalidatePath("/games");
  revalidatePath("/");
  return { ok: true };
}

export const metadata: Metadata = { title: "Games" };

const INITIALS_BG = [
  "from-emerald-500/30 to-emerald-500/10",
  "from-ws-cyan/30 to-ws-cyan/10",
  "from-ws-purple/30 to-ws-purple/10",
  "from-ws-emerald/30 to-ws-emerald/10",
];

export default async function AdminGamesPage() {
  await requirePermission("cms.manage");
  const db = adminDb();

  const [{ data: gamesData }, { data: configsData }] = await Promise.all([
    db
      .from("games")
      .select(
        "id, slug, name, description, image_url, badge_text, is_featured, is_active, play_url, download_url"
      )
      .order("name"),
    db
      .from("game_server_configs")
      .select("game_id, webhook_secret, is_enabled, api_base_url, api_username, api_password, notes"),
  ]);

  const dbGames = gamesData ?? [];
  const dbGamesBySlug = new Map(dbGames.map((g) => [g.slug, g]));
  const configsByGameId = new Map(
    (configsData ?? []).map((c) => [c.game_id, c])
  );

  // Merge all 30 catalog games with DB overrides
  const all30Games = GAMES.map((cg) => {
    const dbG = dbGamesBySlug.get(cg.slug);
    return {
      id: dbG?.id || cg.id,
      slug: cg.slug,
      name: dbG?.name || cg.name,
      category: cg.category,
      description: dbG?.description || cg.bio,
      image_url: dbG?.image_url || cg.image,
      play_url: dbG?.play_url || cg.downloadUrl,
      download_url: dbG?.download_url || cg.downloadUrl,
      badge_text: dbG?.badge_text || (cg.upcoming ? "UPCOMING" : cg.popular ? "HOT" : cg.trending ? "TRENDING" : null),
      is_active: dbG?.is_active ?? !cg.upcoming,
      is_featured: dbG?.is_featured ?? Boolean(cg.popular || cg.topRated),
      is_upcoming: Boolean(cg.upcoming),
    };
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-black uppercase tracking-wider border border-cyan-400/30 mb-1">
            🎮 Full Games Manager ({all30Games.length} Games)
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white">All 30 Games Cards Manager</h1>
          <p className="text-xs text-muted-foreground">
            Manage cover photos, availability status, play links, and categories for all 30 games.
          </p>
        </div>

        <EntityEditDialog
          title="➕ Add New Game Card"
          triggerLabel="➕ Add New Game Card"
          fields={[
            {
              name: "name",
              label: "Game Name (e.g. Golden Dragon)",
              type: "text",
              defaultValue: "",
            },
            {
              name: "slug",
              label: "URL Slug (optional, e.g. golden-dragon)",
              type: "text",
              defaultValue: "",
              hint: "Lowercase hyphens only. Leave blank to generate automatically.",
            },
            {
              name: "description",
              label: "Game Description",
              type: "textarea",
              defaultValue: "",
            },
            {
              name: "image_url",
              label: "Game Cover Image URL",
              type: "text",
              defaultValue: "",
              hint: "Public image URL for the game thumbnail",
            },
            {
              name: "play_url",
              label: "Play Online URL (Web App link)",
              type: "text",
              defaultValue: "",
              hint: "e.g. https://dl.goldendragon.com/",
            },
            {
              name: "download_url",
              label: "Download APK / App Link",
              type: "text",
              defaultValue: "",
            },
            {
              name: "badge_text",
              label: "Badge (HOT / NEW / EVENT / UPCOMING)",
              type: "text",
              defaultValue: "NEW",
            },
            {
              name: "is_active",
              label: "Active (Visible to players)",
              type: "switch",
              defaultValue: true,
            },
            {
              name: "is_featured",
              label: "Featured (Show on homepage carousel)",
              type: "switch",
              defaultValue: true,
            },
          ]}
          action={async (v: Record<string, FieldValue>) => {
            "use server";
            return upsertGameAction({
              name: String(v.name),
              slug: v.slug ? String(v.slug) : undefined,
              description: String(v.description),
              image_url: String(v.image_url),
              play_url: String(v.play_url),
              download_url: String(v.download_url),
              badge_text: String(v.badge_text),
              is_active: Boolean(v.is_active),
              is_featured: Boolean(v.is_featured),
            });
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {all30Games.map((game, i) => {
          const initials = game.name
            .split(" ")
            .map((w: string) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          const bg = INITIALS_BG[i % INITIALS_BG.length];
          const cfg = configsByGameId.get(game.id);
          const webhookUrl = `${siteUrl}/api/webhooks/game/${game.slug}`;

          let firstBonus = 100;
          let reloadBonus = 20;
          let isUpcoming = game.is_upcoming;

          if (cfg?.notes) {
            try {
              const parsed = JSON.parse(cfg.notes);
              if (typeof parsed.first_bonus === "number") firstBonus = parsed.first_bonus;
              if (typeof parsed.reload_bonus === "number") reloadBonus = parsed.reload_bonus;
              if (typeof parsed.is_upcoming === "boolean") isUpcoming = parsed.is_upcoming;
            } catch {}
          }

          return (
            <GlassCard key={game.slug} className="flex flex-col overflow-hidden p-0 border border-white/10 hover:border-amber-400/40 transition-all">
              {/* Thumbnail Cover Image */}
              <div className="relative aspect-video w-full shrink-0 bg-foreground/5 overflow-hidden">
                {game.image_url ? (
                  <Image
                    src={game.image_url}
                    alt={game.name}
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                ) : (
                  <div
                    className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${bg}`}
                  >
                    <span className="text-3xl font-bold text-foreground/60">
                      {initials}
                    </span>
                  </div>
                )}
                {game.badge_text ? (
                  <Badge className="absolute top-2 right-2 bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black text-[10px] uppercase shadow-md">
                    {game.badge_text}
                  </Badge>
                ) : (
                  <Badge className="absolute top-2 right-2 bg-gradient-to-r from-emerald-400 to-teal-500 text-black font-black text-[10px] uppercase shadow-md">
                    🎁 {firstBonus}% MATCH
                  </Badge>
                )}
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-bold text-cyan-300 border border-cyan-400/30">
                  {game.category}
                </span>
              </div>

              {/* Info */}
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-base text-white">{game.name}</p>
                    <div className="flex items-center gap-1">
                      {!game.is_active ? (
                        <Badge className="bg-red-500/20 text-red-300 text-[10px] border border-red-500/30">
                          Inactive
                        </Badge>
                      ) : isUpcoming ? (
                        <Badge className="bg-purple-500/20 text-purple-300 text-[10px] border border-purple-500/30">
                          Upcoming
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-500/20 text-emerald-300 text-[10px] border border-emerald-500/30">
                          Active
                        </Badge>
                      )}
                      {game.is_featured && (
                        <Badge className="bg-amber-400/20 text-amber-300 text-[10px] border border-amber-400/30">
                          ⭐ Featured
                        </Badge>
                      )}
                    </div>
                  </div>
                  {game.description && (
                    <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                      {game.description}
                    </p>
                  )}
                </div>

                {/* Daily Bonus & Status Manager Box */}
                <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/5 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
                      🎁 Daily Bonus &amp; Status
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400">
                      {isUpcoming ? "🟣 Coming Soon" : "🟢 Live & Playing"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-black/40 p-2 border border-white/5">
                      <span className="block text-[9px] uppercase text-zinc-400 font-bold">1st Deposit</span>
                      <span className="font-mono font-bold text-amber-300 text-sm">+{firstBonus}% Match</span>
                    </div>
                    <div className="rounded-lg bg-black/40 p-2 border border-white/5">
                      <span className="block text-[9px] uppercase text-zinc-400 font-bold">Reload Match</span>
                      <span className="font-mono font-bold text-cyan-300 text-sm">+{reloadBonus}% Match</span>
                    </div>
                  </div>

                  <EntityEditDialog
                    title={`🎁 Change Bonus & Status — ${game.name}`}
                    triggerLabel="⚙️ Change Bonus & Status"
                    fields={[
                      {
                        name: "first_bonus",
                        label: "1st Deposit Bonus Match % (e.g. 100 for 100%, 200 for 200%)",
                        type: "number",
                        defaultValue: firstBonus,
                      },
                      {
                        name: "reload_bonus",
                        label: "Reload Bonus Match % (e.g. 20 for 20%, 50 for 50%)",
                        type: "number",
                        defaultValue: reloadBonus,
                      },
                      {
                        name: "badge_text",
                        label: "Badge Text on Card (e.g. 100% MATCH, 200% PROMO, HOT)",
                        type: "text",
                        defaultValue: game.badge_text || `${firstBonus}% MATCH`,
                      },
                      {
                        name: "status",
                        label: "Game Status (type: live, upcoming, or inactive)",
                        type: "text",
                        defaultValue: isUpcoming ? "upcoming" : game.is_active ? "live" : "inactive",
                        hint: "live = active & playable | upcoming = coming soon (no loads) | inactive = hidden",
                      },
                    ]}
                    action={async (v: Record<string, FieldValue>) => {
                      "use server";
                      return saveGameBonusAndStatus(game.id, game.slug, v);
                    }}
                  />
                </div>

                {/* URL status */}
                <div className="space-y-1 text-xs">
                  <UrlStatus label="Play URL" value={game.play_url} />
                  <UrlStatus label="Download URL" value={game.download_url} />
                  <UrlStatus label="Image URL" value={game.image_url} />
                </div>

                {/* Webhook config */}
                <div className="rounded-lg border border-foreground/8 bg-foreground/4 p-3 text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                    <Webhook className="size-3.5" aria-hidden />
                    Webhook
                    {cfg?.is_enabled && (
                      <span className="ml-auto text-ws-emerald">Active</span>
                    )}
                  </div>
                  <p className="mt-1.5 break-all font-mono text-ws-text-faint">
                    {webhookUrl}
                  </p>
                  <div className="mt-2">
                    <EntityEditDialog
                      title={`Webhook — ${game.name}`}
                      triggerLabel="Configure webhook"
                      fields={[
                        {
                          name: "webhook_secret",
                          label: "Webhook Secret",
                          type: "text",
                          defaultValue: cfg?.webhook_secret ?? "",
                          hint: "Shared secret — paste this into the game portal's webhook settings",
                        },
                        {
                          name: "is_enabled",
                          label: "Enable webhook",
                          type: "switch",
                          defaultValue: cfg?.is_enabled ?? false,
                        },
                        {
                          name: "api_username",
                          label: "Agent Portal Username",
                          type: "text",
                          defaultValue: cfg?.api_username ?? "",
                          hint: "Your agent.gamevault999.com login username — enables auto account creation & recharge",
                        },
                        {
                          name: "api_password",
                          label: "Agent Portal Password",
                          type: "text",
                          defaultValue: cfg?.api_password ?? "",
                          hint: "Your agent portal password — stored server-side only, never visible to players",
                        },
                        {
                          name: "api_base_url",
                          label: "API Base URL (override)",
                          type: "text",
                          defaultValue: cfg?.api_base_url ?? "",
                          hint: "Leave blank to use the default agent.gamevault999.com endpoint",
                        },
                        {
                          name: "notes",
                          label: "Notes",
                          type: "textarea",
                          defaultValue: cfg?.notes ?? "",
                        },
                      ]}
                      action={async (v: Record<string, FieldValue>) => {
                        "use server";
                        return saveGameServerConfig(game.id, v);
                      }}
                    />
                  </div>
                </div>

                {/* Edit */}
                <div className="mt-auto">
                  <EntityEditDialog
                    title={`Edit — ${game.name}`}
                    triggerLabel="Edit game"
                    fields={[
                      {
                        name: "name",
                        label: "Name",
                        type: "text",
                        defaultValue: game.name,
                      },
                      {
                        name: "slug",
                        label: "URL slug",
                        type: "text",
                        defaultValue: game.slug,
                        hint: `Sets the page URL: /games/${game.slug}. Lowercase, hyphens only. Changing it also changes the webhook URL.`,
                      },
                      {
                        name: "description",
                        label: "Description",
                        type: "textarea",
                        defaultValue: game.description ?? "",
                      },
                      {
                        name: "image_url",
                        label: "Image URL (paste from Supabase Storage → cms-media)",
                        type: "text",
                        defaultValue: game.image_url ?? "",
                        hint: "Public URL from the cms-media Storage bucket",
                      },
                      {
                        name: "play_url",
                        label: "Play Online URL",
                        type: "text",
                        defaultValue: game.play_url ?? "",
                        hint: "External link to play the game online",
                      },
                      {
                        name: "download_url",
                        label: "Download App URL",
                        type: "text",
                        defaultValue: game.download_url ?? "",
                        hint: "Link to download the mobile app",
                      },
                      {
                        name: "badge_text",
                        label: "Badge (HOT / NEW / EVENT — leave blank for none)",
                        type: "text",
                        defaultValue: game.badge_text ?? "",
                      },
                      {
                        name: "is_active",
                        label: "Active (visible to players)",
                        type: "switch",
                        defaultValue: game.is_active,
                      },
                      {
                        name: "is_featured",
                        label: "Featured (shown first on homepage)",
                        type: "switch",
                        defaultValue: game.is_featured,
                      },
                    ]}
                    action={async (v: Record<string, FieldValue>) => {
                      "use server";
                      return upsertGameAction({
                        id: game.id,
                        name: String(v.name),
                        slug: v.slug ? String(v.slug) : undefined,
                        description: String(v.description),
                        image_url: String(v.image_url),
                        play_url: String(v.play_url),
                        download_url: String(v.download_url),
                        badge_text: String(v.badge_text),
                        is_active: Boolean(v.is_active),
                        is_featured: Boolean(v.is_featured),
                      });
                    }}
                  />
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

function UrlStatus({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      {value ? (
        <Check className="size-3 shrink-0 text-ws-emerald" aria-hidden />
      ) : (
        <Minus className="size-3 shrink-0 text-ws-text-faint" aria-hidden />
      )}
      <span className={value ? "text-foreground" : ""}>{label}</span>
      {value && (
        <span className="ml-auto max-w-[120px] truncate text-ws-text-faint">
          {value.replace(/^https?:\/\//, "")}
        </span>
      )}
    </div>
  );
}
