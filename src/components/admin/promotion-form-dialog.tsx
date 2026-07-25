"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Loader2, Pencil, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { upsertPromotionAction } from "@/lib/actions/admin/promotions";
import type { Promotion } from "@/lib/database.types";

type Props = { promotion?: Promotion };

const STATUSES = ["active", "draft", "scheduled", "expired", "archived"] as const;

const PRESET_BANNERS = [
  { label: "🎁 Welcome Bonus", url: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=800&q=80" },
  { label: "💎 VIP High Roller", url: "https://images.unsplash.com/photo-1511193311914-0346f16efe90?auto=format&fit=crop&w=800&q=80" },
  { label: "⚡ Double Deposit", url: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=800&q=80" },
];

export function PromotionFormDialog({ promotion }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const editing = Boolean(promotion);

  const [title, setTitle] = React.useState(promotion?.title ?? "");
  const [slug, setSlug] = React.useState(promotion?.slug ?? "");
  const [imageUrl, setImageUrl] = React.useState(
    (promotion as { image_url?: string | null })?.image_url ?? ""
  );

  function handleTitleChange(val: string) {
    setTitle(val);
    if (!editing) {
      const auto = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/[\s_-]+/g, "-");
      setSlug(auto);
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await upsertPromotionAction({
        id: promotion?.id,
        slug: slug || String(fd.get("slug") ?? ""),
        title: title || String(fd.get("title") ?? ""),
        summary: String(fd.get("summary") ?? ""),
        description: String(fd.get("description") ?? ""),
        badge_text: String(fd.get("badge_text") ?? "HOT BONUS"),
        image_url: imageUrl || String(fd.get("image_url") ?? "") || null,
        coins_bonus: Number(fd.get("coins_bonus") ?? 5),
        xp_bonus: Number(fd.get("xp_bonus") ?? 10),
        code: String(fd.get("code") ?? "") || null,
        status: (fd.get("status") as (typeof STATUSES)[number]) || "active",
        is_featured: fd.get("is_featured") === "on",
        priority: Number(fd.get("priority") ?? 100),
        starts_at: String(fd.get("starts_at") ?? "") || null,
        ends_at: String(fd.get("ends_at") ?? "") || null,
        max_claims: fd.get("max_claims") ? Number(fd.get("max_claims")) : null,
        max_claims_per_user: Number(fd.get("max_claims_per_user") ?? 1),
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Saved successfully!");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="ghost" size="icon-sm" aria-label="Edit promotion">
            <Pencil className="size-4" aria-hidden />
          </Button>
        ) : (
          <Button className="bg-gradient-to-r from-amber-500 to-amber-600 font-bold hover:brightness-110">
            <Plus className="size-4 mr-1" aria-hidden />
            Create New Promotion
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="glass-strong max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="size-5 text-amber-400" />
            {editing ? "Edit Promotion" : "Easy Create Promotion"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          {/* Main Title & Auto Slug */}
          <div className="space-y-2">
            <Label htmlFor="p-title" className="font-bold text-sm">
              Promotion Title <span className="text-rose-400">*</span>
            </Label>
            <Input
              id="p-title"
              name="title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. Freeplay $20 Deposit Match"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="p-slug" className="text-xs text-muted-foreground">
                URL Slug (Auto-generated)
              </Label>
              <Input
                id="p-slug"
                name="slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="freeplay-deposit-match"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-badge" className="text-xs text-muted-foreground">
                Badge Tag
              </Label>
              <Input
                id="p-badge"
                name="badge_text"
                defaultValue={promotion?.badge_text ?? "HOT BONUS"}
                placeholder="FREEPLAY / LIMITED"
              />
            </div>
          </div>

          {/* Image Banner Holder Field */}
          <div className="space-y-2 border border-amber-500/30 bg-amber-500/10 p-3.5 rounded-xl">
            <Label htmlFor="p-image" className="font-bold text-xs flex items-center gap-1.5 text-amber-300">
              <ImageIcon className="size-4" />
              Promotion Poster Image (Banner URL)
            </Label>
            <Input
              id="p-image"
              name="image_url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/promo-banner.jpg"
            />
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[11px] text-muted-foreground">Quick Presets:</span>
              {PRESET_BANNERS.map((b) => (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => setImageUrl(b.url)}
                  className="text-[11px] bg-background/60 hover:bg-amber-500/20 text-foreground px-2 py-0.5 rounded border border-border/60 transition-all"
                >
                  {b.label}
                </button>
              ))}
            </div>

            {imageUrl && (
              <div className="mt-2 relative h-28 rounded-lg overflow-hidden border border-border/50 bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="Promotion Preview"
                  className="w-full h-full object-cover"
                  onError={() => setImageUrl("")}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="p-summary" className="text-xs font-semibold">
              Short Description / Offer
            </Label>
            <Textarea
              id="p-summary"
              name="summary"
              rows={2}
              defaultValue={promotion?.summary ?? "Claim freeplay coins instantly when depositing today!"}
              placeholder="Instant bonus credited upon deposit"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="p-coins" className="text-xs font-semibold">
                Bonus Coins Reward
              </Label>
              <Input
                id="p-coins"
                name="coins_bonus"
                type="number"
                min={0}
                defaultValue={promotion?.coins_bonus ?? 20}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-code" className="text-xs font-semibold">
                Promo Code (Optional)
              </Label>
              <Input
                id="p-code"
                name="code"
                defaultValue={promotion?.code ?? ""}
                placeholder="e.g. FREE20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="p-status" className="text-xs font-semibold">
                Status
              </Label>
              <Select name="status" defaultValue={promotion?.status ?? "active"}>
                <SelectTrigger id="p-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="p-per-user" className="text-xs font-semibold">
                Max Claims / User
              </Label>
              <Input
                id="p-per-user"
                name="max_claims_per_user"
                type="number"
                min={1}
                defaultValue={promotion?.max_claims_per_user ?? 1}
              />
            </div>
          </div>

          <label className="flex items-center gap-3 pt-2">
            <Checkbox
              name="is_featured"
              defaultChecked={promotion?.is_featured ?? true}
            />
            <span className="text-sm font-semibold">Feature live on site promotions page</span>
          </label>

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              disabled={pending}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2.5"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin mr-2" aria-hidden />
              ) : editing ? (
                "Save Changes"
              ) : (
                "✨ Create Live Promotion Now"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
