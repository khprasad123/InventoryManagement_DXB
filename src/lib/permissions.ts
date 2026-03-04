/**
 * Role-based permissions.
 * Roles: ADMIN, INVENTORY, FINANCE, SALES
 */

export const ROLES = {
  ADMIN: "ADMIN",
  INVENTORY: "INVENTORY",
  FINANCE: "FINANCE",
  SALES: "SALES",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

/** Only Finance can record supplier/client payments */
export function canRecordPayments(role: string | undefined): boolean {
  if (!role) return false;
  return role === ROLES.FINANCE || role === ROLES.ADMIN;
}

/** Only Inventory can adjust stock (ADJUSTMENT movement type) */
export function canAdjustStock(role: string | undefined): boolean {
  if (!role) return false;
  return role === ROLES.INVENTORY || role === ROLES.ADMIN;
}

/** Only Admin can manage users */
export function canManageUsers(role: string | undefined): boolean {
  if (!role) return false;
  return role === ROLES.ADMIN;
}
