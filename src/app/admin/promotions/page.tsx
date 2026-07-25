import type { Metadata } from "next";
import { format } from "date-fns";
import { BadgePercent, CheckCircle, Image as ImageIcon, Power, Trash2 } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import { PromotionFormDialog } from "@/components/admin/promotion-form-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { GlassCard } from "@/components/shared/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deletePromotionAction,
  setPromotionStatusAction,
} from "@/lib/actions/admin/promotions";
import { adminDb } from "@/lib/actions/admin/core";
import { requirePermission } from "@/lib/data/admin";

export const metadata: Metadata = { title: "Promotions & Bonuses - CRUD Manager" };

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-foreground/8 text-muted-foreground border border-border/40",
  scheduled: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30",
  active: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold",
  expired: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
  archived: "bg-foreground/8 text-muted-foreground border border-border/40",
};

export default async function AdminPromotionsPage() {
  await requirePermission("promotions.manage");
  const db = adminDb();

  const { data: promotions } = await db
    .from("promotions")
    .select("*")
    .order("created_at", { ascending: false });

  const list = promotions ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminPageHeader
        title="Promotions & Bonus Offers"
        description="Full CRUD Control: Create, edit, toggle active status, and delete promotional deals."
        action={<PromotionFormDialog />}
      />

      {list.length === 0 ? (
        <EmptyState
          icon={<BadgePercent />}
          title="No promotions created yet"
          description="Click 'Create New Promotion' above to publish your first bonus offer."
        />
      ) : (
        <GlassCard className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Promotion Title & Details</TableHead>
                  <TableHead className="text-center">Promo Code</TableHead>
                  <TableHead className="text-right">Bonus Reward</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="w-36 text-right">CRUD Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((p) => {
                  const currentStatus = p.status || (p.is_active ? "active" : "draft");
                  const bonusText = p.coins_bonus
                    ? `${p.coins_bonus} coins`
                    : p.bonus_percent
                    ? `${p.bonus_percent}% Bonus`
                    : "Bonus Offer";

                  return (
                    <TableRow key={p.id} className="border-border/40 hover:bg-white/5 transition-colors">
                      {/* Image Banner Thumbnail */}
                      <TableCell className="pl-4">
                        <div className="relative size-10 rounded-lg bg-black/40 border border-border/50 overflow-hidden flex items-center justify-center shrink-0">
                          {p.image_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={p.image_url}
                              alt={p.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="size-5 text-muted-foreground/60" />
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{p.title}</span>
                          {(p.is_featured || p.is_active) && (
                            <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px]">
                              Featured
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {p.description || p.summary || `/${p.slug || "promo"}`}
                        </p>
                      </TableCell>

                      <TableCell className="text-center">
                        {p.code ? (
                          <code className="text-xs bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-mono font-bold">
                            {p.code}
                          </code>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell className="tnum text-right text-sm font-bold text-emerald-400">
                        {bonusText}
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge
                          className={`uppercase tracking-wide text-[10px] px-2 py-0.5 ${
                            STATUS_STYLE[currentStatus] || STATUS_STYLE.draft
                          }`}
                        >
                          {currentStatus}
                        </Badge>
                      </TableCell>

                      {/* CRUD Operation Buttons */}
                      <TableCell className="text-right pr-4">
                        <div className="flex justify-end items-center gap-1.5">
                          {/* 1. Quick Status Toggle Action */}
                          <form
                            action={async () => {
                              "use server";
                              const nextStatus = currentStatus === "active" ? "draft" : "active";
                              await setPromotionStatusAction({ id: p.id, status: nextStatus });
                            }}
                          >
                            <Button
                              type="submit"
                              variant="ghost"
                              size="icon-sm"
                              title={currentStatus === "active" ? "Deactivate Promo" : "Activate Promo"}
                              className={currentStatus === "active" ? "text-amber-400 hover:text-amber-300" : "text-emerald-400 hover:text-emerald-300"}
                            >
                              {currentStatus === "active" ? (
                                <Power className="size-4" />
                              ) : (
                                <CheckCircle className="size-4" />
                              )}
                            </Button>
                          </form>

                          {/* 2. Edit Action */}
                          <PromotionFormDialog promotion={p} />

                          {/* 3. Delete Action */}
                          <ConfirmActionButton
                            action={deletePromotionAction.bind(null, p.id)}
                            title="Delete promotion?"
                            description={`"${p.title}" will be permanently deleted.`}
                            confirmLabel="Delete Promo"
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
