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
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

type SessionUser = { permissions?: string[]; isSuperAdmin?: boolean } | null;

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
