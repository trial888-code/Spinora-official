"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shield, ShieldAlert, Trash2, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmActionButton } from "@/components/admin/confirm-action-button";
import {
  setBanAction,
  setUserRolesAction,
  deleteUserAccountAction,
} from "@/lib/actions/admin/users";

interface UserActionsProps {
  userId: string;
  role: string;
  isSuspended: boolean;
}

export function UserActions({ userId, role, isSuspended }: UserActionsProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleRoleToggle() {
    startTransition(async () => {
      const targetRole = role === "admin" ? ["customer"] : ["admin"];
      const result = await setUserRolesAction({ userId, roleKeys: targetRole });
      if (!result.ok) {
        toast.error(result.error);
      } else {
        toast.success(result.message ?? "Role updated!");
        router.refresh();
      }
    });
  }

  function handleBanToggle() {
    startTransition(async () => {
      const result = await setBanAction({
        userId,
        banned: !isSuspended,
        reason: isSuspended ? "Admin reinstated" : "Admin manual ban",
      });
      if (!result.ok) {
        toast.error(result.error);
      } else {
        toast.success(result.message ?? "Ban status updated!");
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-1.5 justify-end">
      {/* 1. Role Assignment Button */}
      <Button
        size="sm"
        variant="outline"
        onClick={handleRoleToggle}
        disabled={pending}
        className="text-xs h-8 px-2.5 font-bold border-indigo-500/40 hover:bg-indigo-500/10 text-indigo-300"
        title={role === "admin" ? "Demote to Customer" : "Promote to Admin"}
      >
        <Shield className="size-3.5 mr-1" />
        {role === "admin" ? "Demote Customer" : "Make Admin"}
      </Button>

      {/* 2. Ban / Unban Button */}
      <Button
        size="sm"
        variant={isSuspended ? "default" : "destructive"}
        onClick={handleBanToggle}
        disabled={pending}
        className={`text-xs h-8 px-2.5 font-bold ${
          isSuspended
            ? "bg-emerald-600 hover:bg-emerald-500 text-white"
            : "bg-amber-600 hover:bg-amber-500 text-white"
        }`}
        title={isSuspended ? "Reinstate Member" : "Ban Member"}
      >
        {isSuspended ? (
          <>
            <UserCheck className="size-3.5 mr-1" />
            Unban
          </>
        ) : (
          <>
            <UserX className="size-3.5 mr-1" />
            Ban Member
          </>
        )}
      </Button>

      {/* 3. Delete Account Button */}
      <ConfirmActionButton
        action={deleteUserAccountAction.bind(null, userId)}
        title="Permanently Delete Account?"
        description="This action cannot be undone. All wallet balance, activity log, and account data will be permanently removed."
        confirmLabel="Delete Account"
      />
    </div>
  );
}
