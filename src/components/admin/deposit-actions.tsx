"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateDepositStatus } from "@/lib/actions/deposits";
import type { RequestStatus } from "@/types/database";
import { toast } from "sonner";

interface DepositActionsProps {
  depositId: string;
  currentStatus: RequestStatus;
  amount: number | null;
}

export function DepositActions({ depositId, currentStatus, amount }: DepositActionsProps) {
  const [adminNotes, setAdminNotes] = useState("");
  const [creditAmount, setCreditAmount] = useState(
    amount != null && amount > 0 ? String(amount) : "10"
  );
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleStatus(status: RequestStatus) {
    if (status === "completed") {
      const parsed = parseFloat(creditAmount);
      if (!parsed || parsed <= 0 || Number.isNaN(parsed)) {
        toast.error("Enter or select the deposit amount to credit.");
        return;
      }
    }

    setLoading(true);
    const parsedAmount =
      status === "completed" ? Math.round(parseFloat(creditAmount) * 100) / 100 : undefined;
    const result = await updateDepositStatus(
      depositId,
      status,
      adminNotes || undefined,
      parsedAmount
    );
    setLoading(false);
    if (result.error) toast.error(result.error);
    else if (status === "completed") toast.success(`✅ Successfully Credited $${parsedAmount!.toFixed(2)} to User Wallet!`);
    else toast.success(`Deposit request marked as ${status}`);
    router.refresh();
  }

  if (currentStatus === "completed" || currentStatus === "rejected") {
    return (
      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-lg">
        {currentStatus === "completed" ? "✅ Completed & Credited" : "❌ Rejected"}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 min-w-[260px] bg-black/40 border border-amber-500/30 rounded-2xl p-3.5 shadow-md">
      <p className="text-[10px] font-black uppercase tracking-wider text-amber-300">
        ⚡ 1-Click Admin Cashier Action
      </p>

      {/* Preset Amount Chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[9px] font-bold text-muted-foreground uppercase">Set:</span>
        {[5, 10, 20, 50, 100].map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setCreditAmount(String(preset))}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
              creditAmount === String(preset)
                ? "bg-amber-400 text-black font-extrabold"
                : "bg-white/10 text-white/80 hover:bg-white/20"
            }`}
          >
            ${preset}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Amount"
            value={creditAmount}
            onChange={(e) => setCreditAmount(e.target.value)}
            className="pl-6 h-9 text-xs font-bold text-white bg-black/50 border-white/20"
          />
        </div>

        <Input
          placeholder="Note (optional)"
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          className="h-9 text-xs bg-black/50 border-white/20"
        />
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <Button
          size="sm"
          onClick={() => handleStatus("completed")}
          disabled={loading}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-400 text-black font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:scale-[1.02] transition-transform"
        >
          {loading ? "Processing…" : `✅ 1-CLICK CONFIRM & CREDIT $${parseFloat(creditAmount || "0").toFixed(2)}`}
        </Button>

        <div className="flex gap-2">
          {currentStatus === "pending" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatus("processing")}
              disabled={loading}
              className="flex-1 text-xs border-amber-500/40 text-amber-200 hover:bg-amber-500/10"
            >
              ⏳ Processing
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleStatus("rejected")}
            disabled={loading}
            className="flex-1 text-xs font-bold bg-red-600/80 hover:bg-red-600"
          >
            ❌ Reject
          </Button>
        </div>
      </div>
    </div>
  );
}
