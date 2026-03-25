"use server";

import { prisma } from "@/lib/prisma";
import { getOrganizationId, getCurrentUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { canManageRoles } from "@/lib/permissions";

function hasAnyPermission(user: unknown, codes: string[]) {
  const perms = (user as { permissions?: string[] } | null)?.permissions ?? [];
  return codes.some((code) => perms.includes(code));
}

async function ensureRoleManagementPermissionCatalog() {
  const required = [
    { code: "settings_users_manage", name: "Settings - Users Manage", description: "Manage users in settings" },
    { code: "settings_roles_manage", name: "Settings - Roles Manage", description: "Manage roles in settings" },
    { code: "settings_users_read", name: "Settings - Users Read", description: "View users in settings" },
    { code: "settings_users_create", name: "Settings - Users Create", description: "Create users in settings" },
    { code: "settings_users_update", name: "Settings - Users Update", description: "Update users in settings" },
    { code: "settings_users_delete", name: "Settings - Users Delete", description: "Remove users in settings" },
    { code: "settings_users_reset_password", name: "Settings - Users Reset Password", description: "Reset user passwords" },
    { code: "settings_roles_create", name: "Settings - Roles Create", description: "Create roles in settings" },
    { code: "settings_roles_update", name: "Settings - Roles Update", description: "Update role permissions" },
    { code: "settings_roles_delete", name: "Settings - Roles Delete", description: "Delete roles in settings" },
    { code: "manage_journals", name: "Accounting - Manage Journals", description: "Access General Journal (all journal actions)" },
    { code: "gl_journals_read", name: "Journals - Read", description: "View journal entries" },
    { code: "gl_journals_create", name: "Journals - Create", description: "Create manual journal entries" },
    { code: "gl_journals_delete", name: "Journals - Delete/Reversal", description: "Reverse/undo posted journal entries" },
    { code: "gl_accounts_read", name: "GL Accounts - Read", description: "View GL chart of accounts for journal entry" },
    { code: "manage_banking", name: "Banking - Manage Accounts", description: "Access bank accounts, statements, and reconciliation matching" },
    { code: "bank_accounts_read", name: "Bank Accounts - Read", description: "View bank accounts" },
    { code: "bank_accounts_create", name: "Bank Accounts - Create", description: "Create bank accounts" },
    { code: "bank_accounts_update", name: "Bank Accounts - Update", description: "Update bank accounts" },
    { code: "bank_accounts_delete", name: "Bank Accounts - Delete", description: "Delete bank accounts" },
    { code: "bank_statements_import", name: "Bank Statements - Import", description: "Import bank statements / transactions (CSV)" },
    { code: "bank_reconciliations_read", name: "Bank Reconciliations - Read", description: "View reconciliation matches" },
    { code: "bank_reconciliations_match", name: "Bank Reconciliations - Match", description: "Create/update reconciliation matches" },
    { code: "reports_overview", name: "Reports - Overview", description: "Generate overview reports" },
    { code: "reports_sales", name: "Reports - Sales", description: "Generate sales reports" },
    { code: "reports_purchases", name: "Reports - Purchases", description: "Generate purchase reports" },
    { code: "reports_profit_loss", name: "Reports - Profit & Loss", description: "Generate P&L reports" },
    { code: "reports_suppliers", name: "Reports - Suppliers", description: "Generate supplier reports" },
    { code: "reports_inventory", name: "Reports - Inventory", description: "Generate inventory reports" },
    { code: "reports_trial_balance", name: "Reports - Trial Balance", description: "Generate trial balance reports" },
    { code: "reports_balance_sheet", name: "Reports - Balance Sheet", description: "Generate balance sheet reports" },
    { code: "reports_receivables_aging", name: "Reports - Receivables Aging", description: "Generate AR aging reports" },
    { code: "reports_payables_aging", name: "Reports - Payables Aging", description: "Generate AP aging reports" },
  ];

  await Promise.all(
    required.map((p) =>
      prisma.permission.upsert({
        where: { code: p.code },
        update: { name: p.name, description: p.description },
        create: p,
      })
    )
  );
}

function expandPermissionCodes(codes: Set<string>, allCodes: string[]): Set<string> {
  const expanded = new Set(codes);

  const addByPrefix = (prefix: string) => {
    for (const code of allCodes) {
      if (code.startsWith(prefix)) expanded.add(code);
    }
  };

  if (expanded.has("manage_inventory")) {
    addByPrefix("inventory_");
    expanded.add("adjust_stock");
  }
  if (expanded.has("manage_suppliers")) addByPrefix("suppliers_");
  if (expanded.has("manage_clients")) addByPrefix("clients_");
  if (expanded.has("manage_purchases")) {
    addByPrefix("purchases_");
    expanded.add("approve_purchase_request");
  }
  if (expanded.has("manage_sales")) {
    addByPrefix("sales_");
    // Explicitly bind approval workflow to managed sales if selected.
    expanded.add("approve_quotation");
  }
  if (expanded.has("manage_expenses")) addByPrefix("expenses_");
  if (expanded.has("manage_journals")) {
    addByPrefix("gl_journals_");
    expanded.add("gl_accounts_read");
  }
  if (expanded.has("manage_banking")) addByPrefix("bank_");
  if (expanded.has("manage_users")) {
    expanded.add("settings_users_manage");
    expanded.add("settings_users_read");
    expanded.add("settings_users_create");
    expanded.add("settings_users_update");
    expanded.add("settings_users_delete");
    expanded.add("settings_users_reset_password");
  }
  if (expanded.has("manage_roles")) {
    expanded.add("settings_roles_manage");
    expanded.add("settings_roles_create");
    expanded.add("settings_roles_update");
    expanded.add("settings_roles_delete");
  }
  if (expanded.has("view_reports")) {
    expanded.add("reports_overview");
    expanded.add("reports_sales");
    expanded.add("reports_purchases");
    expanded.add("reports_profit_loss");
    expanded.add("reports_suppliers");
    expanded.add("reports_inventory");
    expanded.add("reports_trial_balance");
    expanded.add("reports_balance_sheet");
    expanded.add("reports_receivables_aging");
    expanded.add("reports_payables_aging");
  }

  return expanded;
}

export async function getRolesWithPermissions() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await getCurrentUser();
  if (!canManageRoles(user)) redirect("/settings");

  const roles = await prisma.role.findMany({
    where: { organizationId: orgId, deletedAt: null },
    include: {
      permissions: {
        where: { deletedAt: null },
        include: { permission: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return roles;
}

const PAGE_SIZE = 10;
const searchMode = "insensitive" as const;

export async function getRolesWithPermissionsPaginated(page: number, search?: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await getCurrentUser();
  if (!canManageRoles(user)) redirect("/settings");

  const currentPage = Math.max(1, page);
  const q = (search ?? "").trim();
  const where = {
    organizationId: orgId,
    deletedAt: null,
    ...(q ? { name: { contains: q, mode: searchMode } } : {}),
  };

  const total = await prisma.role.count({ where });

  const roles = await prisma.role.findMany({
    where,
    include: {
      permissions: {
        where: { deletedAt: null },
        include: { permission: true },
      },
    },
    orderBy: { name: "asc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return {
    roles,
    total,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE) || 1,
    currentPage,
  };
}

export async function getAllPermissions() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await getCurrentUser();
  if (!canManageRoles(user)) redirect("/settings");

  await ensureRoleManagementPermissionCatalog();
  return prisma.permission.findMany({
    orderBy: { code: "asc" },
  });
}

export async function updateRolePermissions(
  roleId: string,
  permissionIds: string[]
) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await getCurrentUser();
  if (!canManageRoles(user)) {
    return { error: "You do not have permission to manage roles." };
  }
  if (
    !hasAnyPermission(user, [
      "settings_roles_update",
      "settings_roles_manage",
      "manage_roles",
    ])
  ) {
    return { error: "Missing permission: settings_roles_update" };
  }

  const role = await prisma.role.findFirst({
    where: { id: roleId, organizationId: orgId, deletedAt: null },
  });

  if (!role) {
    return { error: "Role not found." };
  }

  await ensureRoleManagementPermissionCatalog();
  const allPermissions = await prisma.permission.findMany({
    select: { id: true, code: true },
  });
  const selectedById = new Map(allPermissions.map((p) => [p.id, p.code]));
  const selectedCodes = new Set(
    permissionIds
      .map((id) => selectedById.get(id))
      .filter((code): code is string => Boolean(code))
  );
  const expandedCodes = expandPermissionCodes(
    selectedCodes,
    allPermissions.map((p) => p.code)
  );
  const expandedPermissionIds = allPermissions
    .filter((p) => expandedCodes.has(p.code))
    .map((p) => p.id);

  await prisma.$transaction(async (tx) => {
    const now = new Date();
    const currentUserId = (user as { id?: string } | null)?.id ?? null;
    await tx.rolePermission.updateMany({
      where: { roleId },
      data: { deletedAt: now, deletedById: currentUserId ?? undefined },
    });
    for (const permissionId of expandedPermissionIds) {
      const existing = await tx.rolePermission.findUnique({
        where: {
          roleId_permissionId: { roleId, permissionId },
        },
      });
      if (existing) {
        await tx.rolePermission.update({
          where: { roleId_permissionId: { roleId, permissionId } },
          data: { deletedAt: null, deletedById: null },
        });
      } else {
        await tx.rolePermission.create({
          data: { roleId, permissionId },
        });
      }
    }
  });

  revalidatePath("/settings/roles");
  return { success: true };
}

export async function createRole(formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await getCurrentUser();
  if (!canManageRoles(user)) {
    return { error: "You do not have permission to manage roles." };
  }
  if (
    !hasAnyPermission(user, [
      "settings_roles_create",
      "settings_roles_manage",
      "manage_roles",
    ])
  ) {
    return { error: "Missing permission: settings_roles_create" };
  }

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Role name is required." };

  const existing = await prisma.role.findFirst({
    where: { name, organizationId: orgId, deletedAt: null },
  });
  if (existing) return { error: "A role with this name already exists." };

  await prisma.role.create({
    data: { name, organizationId: orgId },
  });

  revalidatePath("/settings/roles");
  return { success: true };
}

export async function deleteRole(roleId: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await getCurrentUser();
  if (!canManageRoles(user)) {
    return { error: "You do not have permission to manage roles." };
  }
  if (
    !hasAnyPermission(user, [
      "settings_roles_delete",
      "settings_roles_manage",
      "manage_roles",
    ])
  ) {
    return { error: "Missing permission: settings_roles_delete" };
  }

  const role = await prisma.role.findFirst({
    where: { id: roleId, organizationId: orgId, deletedAt: null },
    include: {
      userOrganizations: {
        where: { deletedAt: null },
      },
    },
  });
  if (!role) return { error: "Role not found." };
  if (role.userOrganizations?.length) {
    return { error: "Cannot delete role: users are assigned to it. Reassign users first." };
  }

  await prisma.role.update({
    where: { id: roleId },
    data: {
      deletedAt: new Date(),
      deletedById: (user as { id?: string }).id ?? undefined,
    },
  });

  revalidatePath("/settings/roles");
  return { success: true };
}
