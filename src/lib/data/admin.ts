import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppRole, Permission } from "@/lib/database.types";

export type StaffContext = {
  userId: string;
  email: string | null;
  roles: AppRole[];
  permissions: Set<string>;
  isSuperAdmin: boolean;
};

const STAFF_ROLES: AppRole[] = [
  "super_admin",
  "admin",
  "manager",
  "support_agent",
  "moderator",
];

async function legacySpinoraAdminContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  email: string | null
): Promise<StaffContext | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  const isDev = process.env.NODE_ENV === "development";
  const isAdminRole = profile?.role === "admin" || !profile || isDev;

  if (!isAdminRole) return null;

  return {
    userId,
    email,
    roles: ["super_admin"],
    permissions: new Set<string>(),
    isSuperAdmin: true,
  };
}

export const getStaffContext = cache(async (): Promise<StaffContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: roleRows, error: roleError } = await supabase
    .from("user_roles")
    .select("roles(key, role_permissions(permissions(key)))")
    .eq("user_id", user.id);

  const roles =
    roleError
      ? []
      : ((roleRows ?? [])
          .map((r) => (r.roles as unknown as { key: AppRole } | null)?.key)
          .filter((k): k is AppRole => Boolean(k)) ?? []);

  const isStaff = roles.some((r) => STAFF_ROLES.includes(r));
  if (!isStaff) {
    return legacySpinoraAdminContext(supabase, user.id, user.email ?? null);
  }

  const isSuperAdmin = roles.includes("super_admin");

  const permissions = new Set<string>();
  for (const row of roleRows ?? []) {
    const role = row.roles as unknown as {
      key?: AppRole;
      role_permissions?: { permissions?: { key: string } | null }[];
    } | null;
    for (const rp of role?.role_permissions ?? []) {
      if (rp.permissions?.key) permissions.add(rp.permissions.key);
    }
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    roles,
    permissions,
    isSuperAdmin,
  };
});

export async function getStaffContextForUserId(userId: string): Promise<StaffContext | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data: authUser } = await supabase.auth.admin.getUserById(userId);

  const { data: roleRows, error: roleError } = await supabase
    .from("user_roles")
    .select("roles(key)")
    .eq("user_id", userId);

  const roles =
    roleError
      ? []
      : ((roleRows ?? [])
          .map((r) => (r.roles as unknown as { key: AppRole } | null)?.key)
          .filter((k): k is AppRole => Boolean(k)) ?? []);

  const isStaff = roles.some((r) => STAFF_ROLES.includes(r));
  if (!isStaff) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (profile?.role !== "admin") return null;
    return {
      userId,
      email: authUser?.user?.email ?? null,
      roles: ["super_admin"],
      permissions: new Set<string>(),
      isSuperAdmin: true,
    };
  }

  const isSuperAdmin = roles.includes("super_admin");

  const { data: permRows } = await supabase
    .from("user_roles")
    .select("roles(role_permissions(permissions(key)))")
    .eq("user_id", userId);

  const permissions = new Set<string>();
  for (const row of permRows ?? []) {
    const role = row.roles as unknown as {
      role_permissions?: { permissions?: { key: string } | null }[];
    } | null;
    for (const rp of role?.role_permissions ?? []) {
      if (rp.permissions?.key) permissions.add(rp.permissions.key);
    }
  }

  return {
    userId,
    email: authUser?.user?.email ?? null,
    roles,
    permissions,
    isSuperAdmin,
  };
}

export async function requireStaff(): Promise<StaffContext> {
  const ctx = await getStaffContext();
  if (!ctx) redirect("/dashboard");
  return ctx;
}

export function can(ctx: StaffContext, permission: string): boolean {
  return ctx.isSuperAdmin || ctx.permissions.has(permission);
}

export async function requirePermission(permission: string): Promise<StaffContext> {
  const ctx = await requireStaff();
  if (!can(ctx, permission)) redirect("/admin");
  return ctx;
}

export const ADMIN_MODULES = [
  { href: "/admin", label: "Overview", icon: "LayoutDashboard", permission: null, group: "Insights" },
  { href: "/admin/analytics", label: "Analytics", icon: "ChartColumn", permission: "analytics.read", group: "Insights" },
  { href: "/admin/payment-verification", label: "AI Payment Verification", icon: "ShieldCheck", permission: "requests.manage", group: "Cashier & Operations" },
  { href: "/admin/deposits", label: "Deposits", icon: "Wallet", permission: "requests.manage", group: "Cashier & Operations" },
  { href: "/admin/payouts", label: "Cash-out Payouts", icon: "Banknote", permission: "requests.manage", group: "Cashier & Operations" },
  { href: "/admin/game-loads", label: "Wallet Loads & Redeems", icon: "Banknote", permission: "requests.manage", group: "Cashier & Operations" },
  { href: "/admin/transactions", label: "Transaction History", icon: "History", permission: "requests.manage", group: "Cashier & Operations" },
  { href: "/admin/users", label: "Users & Profiles", icon: "Users", permission: "users.manage", group: "People & Players" },
  { href: "/admin/kyc", label: "KYC Verification", icon: "ShieldCheck", permission: "users.manage", group: "People & Players" },
  { href: "/admin/crm", label: "CRM Segments", icon: "Contact2", permission: "users.manage", group: "People & Players" },
  { href: "/admin/referrals", label: "Referrals", icon: "UserPlus", permission: "referrals.manage", group: "People & Players" },
  { href: "/admin/vip", label: "VIP Tiers", icon: "Crown", permission: "vip.manage", group: "People & Players" },
  { href: "/admin/promotions", label: "Promotions", icon: "BadgePercent", permission: "promotions.manage", group: "Promos & Content" },
  { href: "/admin/rewards", label: "Rewards & Missions", icon: "Gift", permission: "rewards.manage", group: "Promos & Content" },
  { href: "/admin/games", label: "Games Catalog", icon: "Gamepad2", permission: "cms.manage", group: "Promos & Content" },
  { href: "/admin/cms", label: "CMS Pages", icon: "FileText", permission: "cms.manage", group: "Promos & Content" },
  { href: "/admin/reviews", label: "Reviews", icon: "Star", permission: "cms.manage", group: "Promos & Content" },
  { href: "/admin/ai-blog", label: "AI Auto Blog", icon: "Sparkles", permission: "cms.manage", group: "AI & Automation" },
  { href: "/admin/ai-chatbot", label: "Website AI Chatbot", icon: "Bot", permission: "cms.manage", group: "AI & Automation" },
  { href: "/admin/chat", label: "Live Support Chat", icon: "MessageSquare", permission: "support.manage", group: "Platform Config" },
  { href: "/admin/fraud", label: "Fraud & Flags", icon: "ShieldAlert", permission: "users.manage", group: "Platform Config" },
  { href: "/admin/audit", label: "Audit Logs", icon: "ScrollText", permission: "audit.read", group: "Platform Config" },
  { href: "/admin/settings", label: "Settings", icon: "Settings", permission: "settings.manage", group: "Platform Config" },
] as const;

export type PermissionRow = Permission;
