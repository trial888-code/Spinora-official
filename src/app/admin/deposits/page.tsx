import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DepositActions } from "@/components/admin/deposit-actions";
import { DepositsLiveRefresh } from "@/components/deposits/deposits-live-refresh";
import { DepositProofImage } from "@/components/deposits/deposit-proof-image";
import { getDepositMethod } from "@/lib/payments/methods";
import { cn, formatDate } from "@/lib/utils";
import type { RequestStatus } from "@/types/database";

const statusVariant: Record<RequestStatus, "default" | "warning" | "success" | "destructive"> = {
  pending: "warning",
  processing: "default",
  completed: "success",
  rejected: "destructive",
};

const FILTER_TABS: { id: string; label: string; href: string }[] = [
  { id: "pending", label: "Pending", href: "/admin/deposits?status=pending" },
  { id: "processing", label: "Processing", href: "/admin/deposits?status=processing" },
  { id: "all", label: "All", href: "/admin/deposits" },
  { id: "completed", label: "Completed", href: "/admin/deposits?status=completed" },
  { id: "rejected", label: "Rejected", href: "/admin/deposits?status=rejected" },
];

export default async function AdminDepositsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeFilter = status ?? "all";
  const supabase = await createClient();
  const db = createAdminClient() ?? supabase;

  let query = db
    .from("deposit_requests")
    .select("*, user:profiles!deposit_requests_user_id_fkey(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data: deposits } = await query;

  const pendingCount = deposits?.filter(d => d.status === "pending").length ?? 0;
  const completedSum = deposits?.filter(d => d.status === "completed").reduce((acc, d) => acc + (d.amount || 0), 0) ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <DepositsLiveRefresh />

      {/* 🚨 Non-Tech Admin Operations Live Attention Bar */}
      <div className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-orange-600/10 to-purple-950/40 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-[0_0_30px_rgba(251,191,36,0.15)]">
        <div>
          <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-400/30 mb-1">
            ⚡ Admin Operations Center
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Deposit Requests Cashier</h1>
          <p className="text-xs text-amber-200/80">
            Review screenshots and tap 1-Click Confirm &amp; Credit to update user balances in 1 second.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-amber-500/30 bg-black/50 px-4 py-2 text-center min-w-[120px]">
            <span className="text-[10px] font-bold text-amber-300 uppercase block">Pending Orders</span>
            <span className="text-xl font-black text-white">{pendingCount}</span>
          </div>
          <div className="rounded-xl border border-emerald-500/30 bg-black/50 px-4 py-2 text-center min-w-[120px]">
            <span className="text-[10px] font-bold text-emerald-400 uppercase block">Total Processed</span>
            <span className="text-xl font-black text-emerald-300">${completedSum.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm transition-colors",
              activeFilter === tab.id
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="space-y-4">
        {!deposits?.length ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No deposit requests{status && status !== "all" ? ` with status "${status}"` : ""}.
            </CardContent>
          </Card>
        ) : (
          deposits.map((dep) => {
            const user = dep.user as { full_name?: string; email?: string };
            const method = getDepositMethod(dep.payment_method);
            return (
              <Card key={dep.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{dep.game_name}</h3>
                        <Badge variant={statusVariant[dep.status as RequestStatus]}>{dep.status}</Badge>
                        <Badge variant="outline">{method?.label ?? dep.payment_method}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {user?.full_name} ({user?.email})
                        {dep.amount != null && dep.amount > 0 && (
                          <span className="text-emerald-400 font-semibold"> · ${Number(dep.amount).toFixed(2)}</span>
                        )}
                      </p>
                      <DepositProofImage path={dep.proof_url} />
                      {dep.admin_notes && (
                        <p className="text-sm text-primary">Admin: {dep.admin_notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground">{formatDate(dep.created_at)}</p>
                    </div>
                    <DepositActions
                      depositId={dep.id}
                      currentStatus={dep.status as RequestStatus}
                      amount={dep.amount != null ? Number(dep.amount) : null}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
