import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { Ban, Search } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { UserActions } from "@/components/admin/user-actions";
import { GlassCard } from "@/components/shared/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminDb } from "@/lib/actions/admin/core";
import {
  ADMIN_PROFILE_SELECT,
  type SpinoraProfileRow,
  profileDisplayName,
  profileHandle,
  profileIsBanned,
  profileNum,
} from "@/lib/admin/spinora-profile";
import { requirePermission } from "@/lib/data/admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Users & Profiles Management" };

const PAGE_SIZE = 20;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requirePermission("users.manage");
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const db = adminDb();
  let query = db.from("profiles").select(ADMIN_PROFILE_SELECT, { count: "exact" });

  if (q) {
    query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`);
  }

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  const users = (data ?? []) as unknown as SpinoraProfileRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <AdminPageHeader
        title="Users & Members"
        description={`${total.toLocaleString()} members registered. 1-Click Ban, Role assignment, and Account Deletion controls.`}
      />

      <form className="flex gap-2" action="/admin/users">
        <div className="relative flex-1">
          <Search
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            name="q"
            defaultValue={q}
            placeholder="Search member by email or name..."
            className="pl-9"
            aria-label="Search users"
          />
        </div>
        <Button type="submit" variant="outline" className="font-bold">
          Search
        </Button>
      </form>

      <GlassCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead>Member</TableHead>
                <TableHead className="text-right">Level</TableHead>
                <TableHead className="text-right">Wallet</TableHead>
                <TableHead className="text-right">Joined</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-56 text-right pr-4">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No members match "{q}".
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => {
                  const banned = profileIsBanned(u);
                  const roleStr: string = String(u.role ?? "customer").toLowerCase();

                  return (
                    <TableRow key={u.id || "user"} className="border-border/40 hover:bg-white/5 transition-colors">
                      <TableCell>
                        <Link
                          href={`/admin/users/${u.id}`}
                          className="font-bold text-foreground hover:text-cyan-400"
                        >
                          {profileDisplayName(u)}
                        </Link>
                        <p className="text-xs text-muted-foreground">{profileHandle(u)}</p>
                      </TableCell>
                      <TableCell className="tnum text-right font-bold text-amber-400">
                        Lv. {Math.max(1, Math.floor(profileNum(u.vip_points) / 500) + 1)}
                      </TableCell>
                      <TableCell className="tnum text-right font-bold text-emerald-400">
                        ${profileNum(u.wallet_balance).toFixed(2)}
                      </TableCell>
                      <TableCell className="tnum text-right text-xs text-muted-foreground">
                        {u.created_at ? format(new Date(u.created_at), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        {banned ? (
                          <Badge className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px]">
                            <Ban className="size-3 mr-1" aria-hidden />
                            Banned
                          </Badge>
                        ) : roleStr === "admin" ? (
                          <Badge className="bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 text-[10px]">
                            Admin
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px]">
                            Active
                          </Badge>
                        )}
                      </TableCell>

                      {/* 1-Click Ban, Role, and Delete Actions */}
                      <TableCell className="text-right pr-4">
                        <UserActions
                          userId={u.id || ""}
                          role={roleStr}
                          isSuspended={banned}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </GlassCard>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            asChild
            variant="outline"
            size="sm"
            className={cn(page <= 1 && "pointer-events-none opacity-50")}
          >
            <Link href={`/admin/users?q=${encodeURIComponent(q)}&page=${page - 1}`}>
              Previous
            </Link>
          </Button>
          <p className="tnum text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <Button
            asChild
            variant="outline"
            size="sm"
            className={cn(page >= totalPages && "pointer-events-none opacity-50")}
          >
            <Link href={`/admin/users?q=${encodeURIComponent(q)}&page=${page + 1}`}>
              Next
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
