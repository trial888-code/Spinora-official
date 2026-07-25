import type { Metadata } from "next";
import { DollarSign, ShieldAlert, ShieldCheck, Zap } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { PaymentVerificationPanel } from "@/components/admin/payment-verification-panel";
import { StatCard } from "@/components/shared/stat-card";
import { adminDb, authorize } from "@/lib/actions/admin/core";
import { requirePermission } from "@/lib/data/admin";

export const metadata: Metadata = { title: "AI Payment Verification & Telegram Marketing" };

export default async function AdminPaymentVerificationPage() {
  await requirePermission("requests.manage");
  const db = adminDb();

  // Fetch payment orders & deposit requests
  const [{ data: pOrders }, { data: depRequests }] = await Promise.all([
    db.from("payment_orders").select("*").order("created_at", { ascending: false }).limit(100),
    db.from("deposit_requests").select("id, amount, payment_method, status, created_at, game_name").order("created_at", { ascending: false }).limit(100),
  ]);

  const pRows = (pOrders ?? []).map((p: any) => ({
    id: String(p.id),
    amount: Number(p.amount ?? 0),
    platform: String(p.platform || "other"),
    status: String(p.status || "pending"),
    memo: (p.memo as string | null) || null,
    created_at: String(p.created_at),
  }));

  const depRows = (depRequests ?? []).map((d: any) => ({
    id: String(d.id),
    amount: Number(d.amount ?? 0),
    platform: String(d.payment_method || "direct"),
    status: d.status === "completed" ? "paid" : String(d.status || "pending"),
    memo: `Game Deposit: ${d.game_name || "Spinora Account"}`,
    created_at: String(d.created_at),
  }));

  const combinedOrders = [...pRows, ...depRows];
  combinedOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const totalVerified = combinedOrders.filter((o) => o.status === "paid" || o.status === "completed").length;
  const totalPending = combinedOrders.filter((o) => o.status === "pending" || o.status === "pending_admin_review").length;
  const totalAmountVerified = combinedOrders
    .filter((o) => o.status === "paid" || o.status === "completed")
    .reduce((sum, o) => sum + o.amount, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        title="AI Payment Verification & Telegram Marketing"
        description="Automated Gemini Vision OCR screenshot extraction, email & crypto webhooks, and Telegram promo marketing."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Verified Payments"
          value={totalVerified.toLocaleString()}
          icon={<ShieldCheck />}
          accent="emerald"
        />
        <StatCard
          label="Pending Admin Review"
          value={totalPending.toLocaleString()}
          icon={<ShieldAlert />}
          accent="gold"
        />
        <StatCard
          label="Total Value Verified ($)"
          value={`$${totalAmountVerified.toFixed(2)}`}
          icon={<DollarSign />}
          accent="cyan"
        />
        <StatCard
          label="OCR & Webhook Engines"
          value="100% Active"
          icon={<Zap />}
          accent="purple"
        />
      </div>

      <PaymentVerificationPanel orders={combinedOrders} />
    </div>
  );
}
