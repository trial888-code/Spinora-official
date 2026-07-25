"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Send, ShieldAlert, ShieldCheck, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/shared/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  approvePaymentOrderAction,
  rejectPaymentOrderAction,
  sendTelegramBroadcastAction,
} from "@/lib/actions/admin/payment-verification";

export interface PaymentOrderRow {
  id: string;
  amount: number;
  platform: string;
  status: string;
  memo: string | null;
  created_at: string;
}

const TEMPLATES = [
  "🔥 <b>WEEKEND SPECIAL!</b> Get 50% Bonus Coins on your next deposit. Limited time only!",
  "🎁 <b>CLAIM YOUR DAILY REWARD!</b> Check in on Spinora now to keep your streak multiplier active!",
  "⚡ <b>INSTANT CASHOUT ACTIVE!</b> Play Juwa, Game Vault, & Orion Stars with 24/7 instant cashouts!",
];

export function PaymentVerificationPanel({ orders }: { orders: PaymentOrderRow[] }) {
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"all" | "pending" | "paid" | "rejected">("all");
  const [broadcastMsg, setBroadcastMsg] = useState("");

  const filteredOrders = orders.filter((o) => {
    if (filter === "pending") return o.status === "pending" || o.status === "pending_admin_review";
    if (filter === "paid") return o.status === "paid" || o.status === "completed";
    if (filter === "rejected") return o.status === "rejected";
    return true;
  });

  function approveOrder(id: string) {
    startTransition(async () => {
      const res = await approvePaymentOrderAction(id);
      if (res.ok) toast.success(res.message);
      else toast.error(res.error);
    });
  }

  function rejectOrder(id: string) {
    startTransition(async () => {
      const res = await rejectPaymentOrderAction(id);
      if (res.ok) toast.success(res.message);
      else toast.error(res.error);
    });
  }

  function sendBroadcast() {
    if (!broadcastMsg.trim()) {
      toast.error("Please enter a broadcast message");
      return;
    }

    startTransition(async () => {
      const res = await sendTelegramBroadcastAction({ message: broadcastMsg });
      if (res.ok) {
        toast.success(res.message);
        setBroadcastMsg("");
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* 📡 Telegram Broadcast Control */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-3">
          <Send className="h-5 w-5 text-cyan-400" />
          <h3 className="text-lg font-bold text-foreground">Telegram Marketing Broadcast</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Broadcast promotional offers directly to all registered Telegram chat IDs.
        </p>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 mb-2">
            <span className="text-xs font-semibold text-muted-foreground self-center">1-Click Templates:</span>
            {TEMPLATES.map((tmpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setBroadcastMsg(tmpl)}
                className="text-[11px] bg-foreground/8 hover:bg-foreground/15 text-cyan-300 px-2.5 py-1 rounded-full border border-cyan-500/20 transition-colors"
              >
                Template #{idx + 1}
              </button>
            ))}
          </div>

          <Textarea
            rows={3}
            placeholder="Type your HTML marketing campaign message here..."
            value={broadcastMsg}
            onChange={(e) => setBroadcastMsg(e.target.value)}
            className="bg-background/50 font-mono text-sm"
          />

          <Button onClick={sendBroadcast} disabled={pending} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold">
            {pending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Send Telegram Broadcast
          </Button>
        </div>
      </GlassCard>

      {/* 🔍 AI Payment Orders Verification Table */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["all", "pending", "paid", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize transition-colors ${
                filter === f ? "bg-amber-500 text-black" : "bg-foreground/8 text-muted-foreground hover:text-white"
              }`}
            >
              {f === "pending" ? "Pending Review" : f}
            </button>
          ))}
        </div>
      </div>

      <GlassCard className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-foreground/8 hover:bg-transparent">
              <TableHead>Order ID</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Sender / Memo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">1-Click Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No payment verification orders in this view.
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((o) => {
                const isPaid = o.status === "paid" || o.status === "completed";
                const isRejected = o.status === "rejected";
                const isPending = !isPaid && !isRejected;

                return (
                  <TableRow key={o.id} className="border-foreground/8">
                    <TableCell className="font-mono text-xs font-bold text-cyan-300">
                      #{o.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase font-bold text-[10px]">
                        {o.platform}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-bold text-amber-400 tnum">
                      ${o.amount.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {o.memo || "Direct transfer"}
                    </TableCell>
                    <TableCell>
                      {isPaid ? (
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                          <ShieldCheck className="h-3 w-3 mr-1" /> Paid
                        </Badge>
                      ) : isRejected ? (
                        <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                          <ShieldAlert className="h-3 w-3 mr-1" /> Rejected
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse">
                          Pending Review
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isPending ? (
                        <div className="flex justify-end gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => approveOrder(o.id)}
                            disabled={pending}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-7 text-xs px-2.5"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectOrder(o.id)}
                            disabled={pending}
                            className="h-7 text-xs px-2.5"
                          >
                            <X className="h-3.5 w-3.5 mr-1" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </GlassCard>
    </div>
  );
}
