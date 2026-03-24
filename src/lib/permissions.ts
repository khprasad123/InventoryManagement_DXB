import { getCurrentUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

export const APP_ROLES = {
  OWNER: "OWNER",
  MANAGER: "MANAGER",
  OPERATOR: "OPERATOR",
  VIEWER: "VIEWER",
} as const;

export type AppRole = (typeof APP_ROLES)[keyof typeof APP_ROLES];

export const PERMISSIONS = {
  SETTINGS_USERS_MANAGE: "settings_users_manage",
  SETTINGS_ROLES_MANAGE: "settings_roles_manage",
  PURCHASES_APPROVE: "purchases_approve",
  HARD_DELETE_ANY_ORG: "hard_delete_any_org",
  MANAGE_USERS: "manage_users",
  MANAGE_ROLES: "manage_roles",
  RECORD_PAYMENTS: "record_payments",
  ADJUST_STOCK: "adjust_stock",
  MANAGE_INVENTORY: "manage_inventory",
  MANAGE_SUPPLIERS: "manage_suppliers",
  MANAGE_CLIENTS: "manage_clients",
  MANAGE_PURCHASES: "manage_purchases",
  MANAGE_SALES: "manage_sales",
  MANAGE_EXPENSES: "manage_expenses",
  VIEW_REPORTS: "view_reports",
  VIEW_AUDIT: "view_audit",
  // Menu + action (granular): menu_action
  INVENTORY_CREATE: "inventory_create",
  INVENTORY_READ: "inventory_read",
  INVENTORY_UPDATE: "inventory_update",
  INVENTORY_DELETE: "inventory_delete",
  SUPPLIERS_CREATE: "suppliers_create",
  SUPPLIERS_READ: "suppliers_read",
  SUPPLIERS_UPDATE: "suppliers_update",
  SUPPLIERS_DELETE: "suppliers_delete",
  CLIENTS_CREATE: "clients_create",
  CLIENTS_READ: "clients_read",
  CLIENTS_UPDATE: "clients_update",
  CLIENTS_DELETE: "clients_delete",
  PURCHASES_CREATE: "purchases_create",
  PURCHASES_READ: "purchases_read",
  PURCHASES_UPDATE: "purchases_update",
  PURCHASES_DELETE: "purchases_delete",
  SALES_CREATE: "sales_create",
  SALES_READ: "sales_read",
  SALES_UPDATE: "sales_update",
  SALES_DELETE: "sales_delete",
  EXPENSES_CREATE: "expenses_create",
  EXPENSES_READ: "expenses_read",
  EXPENSES_UPDATE: "expenses_update",
  EXPENSES_DELETE: "expenses_delete",
  APPROVE_PURCHASE_REQUEST: "approve_purchase_request",
  APPROVE_QUOTATION: "approve_quotation",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

type SessionUser = {
  role?: string;
  permissions?: string[];
  isSuperAdmin?: boolean;
} | null;

const permissionRoleMap: Record<PermissionCode, AppRole[]> = {
  settings_users_manage: [APP_ROLES.OWNER, APP_ROLES.MANAGER],
  settings_roles_manage: [APP_ROLES.OWNER],
  purchases_approve: [APP_ROLES.OWNER, APP_ROLES.MANAGER],
  hard_delete_any_org: [APP_ROLES.OWNER],
  manage_users: [APP_ROLES.OWNER, APP_ROLES.MANAGER],
  manage_roles: [APP_ROLES.OWNER],
  record_payments: [APP_ROLES.OWNER, APP_ROLES.MANAGER, APP_ROLES.OPERATOR],
  adjust_stock: [APP_ROLES.OWNER, APP_ROLES.MANAGER, APP_ROLES.OPERATOR],
  manage_inventory: [APP_ROLES.OWNER, APP_ROLES.MANAGER, APP_ROLES.OPERATOR],
  manage_suppliers: [APP_ROLES.OWNER, APP_ROLES.MANAGER, APP_ROLES.OPERATOR],
  manage_clients: [APP_ROLES.OWNER, APP_ROLES.MANAGER, APP_ROLES.OPERATOR],
  manage_purchases: [APP_ROLES.OWNER, APP_ROLES.MANAGER, APP_ROLES.OPERATOR],
  manage_sales: [APP_ROLES.OWNER, APP_ROLES.MANAGER, APP_ROLES.OPERATOR],
  manage_expenses: [APP_ROLES.OWNER, APP_ROLES.MANAGER, APP_ROLES.OPERATOR],
  view_reports: [APP_ROLES.OWNER, APP_ROLES.MANAGER, APP_ROLES.OPERATOR, APP_ROLES.VIEWER],
  view_audit: [APP_ROLES.OWNER, APP_ROLES.MANAGER],
  inventory_create: [APP_ROLES.OWNER, APP_ROLES.MANAGER, APP_ROLES.OPERATOR],
  inventory_read: [APP_ROLES.OWNER, APP_ROLES.MANAGER, APP_ROLES.OPERATOR, APP_ROLES.VIEWER],
  inventory_update: [APP_ROLES.OWNER, APP_ROLES.MANAGER, APP_ROLES.OPERATOR],
  inventory_delete: [APP_ROLES.OWNER, APP_ROLES.MANAGER],
  suppliers_create: [APP_ROLES.OWNER, APP_ROLES.MANAGER, APP_ROLES.OPERATOR],
  suppliers_read: [APP_ROLES.OWNER, APP_ROLES.MANAGER, APP_ROLES.OPERATOR, APP_ROLES.VIEWER],
  suppliers_update: [APP_ROLES.OWNER, APP_ROLES.MANAGER, APP_ROLES.OPERATOR],
  suppliers_delete: [APP_ROLES.OWNER, APP_ROLES.MANAGER],
  clients_create: [APP_ROLES.OWNER, APP_ROLES.MANAGER, APP_ROLES.OPERATOR],
  clients_read: [APP_ROLES.OWNER, APP_ROLES.MANAGER, APP_ROLES.OPERATOR, APP_ROLES.VIEWER],
  clients_update: [APP_ROLES.OWNER, APP_ROLES.MANAGER, APP_ROLES.OPERATOR],
  clients_delete: [APP_ROLES.OWNER, APP_ROLES.MANAGER],
  purchases_create: [APP_ROLES.OWNER, APP_ROLES.MANAGER, APP_ROLES.OPERATOR],
  purchases_read: [APP_ROLES.OWNER, APP_ROLES.MANAGER, APP_ROLES.OPERATOR, APP_ROLES.VIEWER],
  purchases_update: [APP_ROLES.OWNER, APP_ROLES.MANAGER, APP_ROLES.OPERATOR],
  purchases_delete: [APP_ROLES.OWNER, APP_ROLES.MANAGER],
  sales_create: [APP_ROLES.OWNER, APP_ROLES.MANAGER, APP_ROLES.OPERATOR],
  sales_read: [APP_ROLES.OWNER, APP_ROLES.MANAGER, APP_ROLES.OPERATOR, APP_ROLES.VIEWER],
  sales_update: [APP_ROLES.OWNER, APP_ROLES.MANAGER, APP_ROLES.OPERATOR],
  sales_delete: [APP_ROLES.OWNER, APP_ROLES.MANAGER],
  expenses_create: [APP_ROLES.OWNER, APP_ROLES.MANAGER, APP_ROLES.OPERATOR],
  expenses_read: [APP_ROLES.OWNER, APP_ROLES.MANAGER, APP_ROLES.OPERATOR, APP_ROLES.VIEWER],
  expenses_update: [APP_ROLES.OWNER, APP_ROLES.MANAGER, APP_ROLES.OPERATOR],
  expenses_delete: [APP_ROLES.OWNER, APP_ROLES.MANAGER],
  approve_purchase_request: [APP_ROLES.OWNER, APP_ROLES.MANAGER],
  approve_quotation: [APP_ROLES.OWNER, APP_ROLES.MANAGER],
};

const roleAliasMap: Record<string, AppRole> = {
  OWNER: APP_ROLES.OWNER,
  MANAGER: APP_ROLES.MANAGER,
  OPERATOR: APP_ROLES.OPERATOR,
  VIEWER: APP_ROLES.VIEWER,
  ADMIN: APP_ROLES.OWNER,
  FINANCE: APP_ROLES.OPERATOR,
  INVENTORY: APP_ROLES.OPERATOR,
  SALES: APP_ROLES.OPERATOR,
};

export function normalizeRole(role?: string | null): AppRole {
  if (!role) return APP_ROLES.VIEWER;
  return roleAliasMap[role.toUpperCase()] ?? APP_ROLES.VIEWER;
}

/** Check if user has a permission (from session). Super admin bypasses all checks. */
export function hasPermission(user: SessionUser, code: string): boolean {
  if (user?.isSuperAdmin) return true;
  if (!user?.permissions) return false;
  if (user.permissions.includes(code)) return true;
  // manage_X implies all actions for that menu (backward compat)
  const menuMap: Record<string, string> = {
    inventory_create: "manage_inventory",
    inventory_read: "manage_inventory",
    inventory_update: "manage_inventory",
    inventory_delete: "manage_inventory",
    suppliers_create: "manage_suppliers",
    suppliers_read: "manage_suppliers",
    suppliers_update: "manage_suppliers",
    suppliers_delete: "manage_suppliers",
    clients_create: "manage_clients",
    clients_read: "manage_clients",
    clients_update: "manage_clients",
    clients_delete: "manage_clients",
    purchases_create: "manage_purchases",
    purchases_read: "manage_purchases",
    purchases_update: "manage_purchases",
    purchases_delete: "manage_purchases",
    sales_create: "manage_sales",
    sales_read: "manage_sales",
    sales_update: "manage_sales",
    sales_delete: "manage_sales",
    expenses_create: "manage_expenses",
    expenses_read: "manage_expenses",
    expenses_update: "manage_expenses",
    expenses_delete: "manage_expenses",
  };
  const fallback = menuMap[code];
  return fallback ? user.permissions.includes(fallback) : false;
}

export function can(role: string | null | undefined, permission: PermissionCode): boolean {
  const normalized = normalizeRole(role);
  return (permissionRoleMap[permission] ?? []).includes(normalized);
}

export function canUser(user: SessionUser, permission: PermissionCode): boolean {
  if (user?.isSuperAdmin) return true;
  // If explicit permissions are present (role-permission links), enforce them strictly.
  // Fallback to static role matrix only for legacy sessions without permissions payload.
  if (Array.isArray(user?.permissions)) {
    return hasPermission(user, permission);
  }
  return can(user?.role, permission);
}

export async function requirePermission(
  permission: PermissionCode,
  options?: { redirectTo?: string }
) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canUser(user, permission)) {
    if (options?.redirectTo) redirect(options.redirectTo);
    throw new Error(`Forbidden: missing permission '${permission}'`);
  }
  return user;
}

/** Route/layout helper for permission-protected pages */
export async function requireModulePermission(
  permission: PermissionCode,
  redirectTo = "/dashboard"
) {
  return requirePermission(permission, { redirectTo });
}

/** Route/layout helper for org super-admin-only pages */
export async function requireSuperAdmin(redirectTo = "/settings") {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isSuperAdmin(user)) redirect(redirectTo);
  return user;
}

/** Is the current user the org super admin (only they can edit/remove other super admins) */
export function isSuperAdmin(user: SessionUser): boolean {
  return Boolean(user?.isSuperAdmin);
}

/** Can record supplier/client payments */
export function canRecordPayments(user: SessionUser): boolean {
  return canUser(user, PERMISSIONS.RECORD_PAYMENTS);
}

/** Can adjust stock (ADJUSTMENT movement type) */
export function canAdjustStock(user: SessionUser): boolean {
  return canUser(user, PERMISSIONS.ADJUST_STOCK);
}

/** Can access user management (list, add, edit, remove org users) */
export function canManageUsers(user: SessionUser): boolean {
  return canUser(user, PERMISSIONS.SETTINGS_USERS_MANAGE);
}

/** Can access role management (edit role permissions) */
export function canManageRoles(user: SessionUser): boolean {
  return canUser(user, PERMISSIONS.SETTINGS_ROLES_MANAGE);
}
