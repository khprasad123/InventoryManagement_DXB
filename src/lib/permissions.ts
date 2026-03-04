/**
 * Permission-based access. Permissions are stored in DB and assigned to roles.
 * Session includes user.permissions (codes) and user.isSuperAdmin.
 */

export const ROLES = {
  ADMIN: "ADMIN",
  INVENTORY: "INVENTORY",
  FINANCE: "FINANCE",
  SALES: "SALES",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
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
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

type SessionUser = { permissions?: string[]; isSuperAdmin?: boolean } | null;

/** Check if user has a permission (from session) */
export function hasPermission(user: SessionUser, code: string): boolean {
  if (!user?.permissions) return false;
  return user.permissions.includes(code);
}

/** Is the current user the org super admin (only they can edit/remove other super admins) */
export function isSuperAdmin(user: SessionUser): boolean {
  return Boolean(user?.isSuperAdmin);
}

/** Can record supplier/client payments */
export function canRecordPayments(user: SessionUser): boolean {
  return hasPermission(user, PERMISSIONS.RECORD_PAYMENTS);
}

/** Can adjust stock (ADJUSTMENT movement type) */
export function canAdjustStock(user: SessionUser): boolean {
  return hasPermission(user, PERMISSIONS.ADJUST_STOCK);
}

/** Can access user management (list, add, edit, remove org users) */
export function canManageUsers(user: SessionUser): boolean {
  return hasPermission(user, PERMISSIONS.MANAGE_USERS);
}

/** Can access role management (edit role permissions) */
export function canManageRoles(user: SessionUser): boolean {
  return hasPermission(user, PERMISSIONS.MANAGE_ROLES);
}
