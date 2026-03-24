import test from "node:test";
import assert from "node:assert/strict";
import { APP_ROLES, can, canUser, PERMISSIONS } from "@/lib/permissions";

test("role-permission matrix: settings/users management", () => {
  assert.equal(can(APP_ROLES.OWNER, PERMISSIONS.SETTINGS_USERS_MANAGE), true);
  assert.equal(can(APP_ROLES.MANAGER, PERMISSIONS.SETTINGS_USERS_MANAGE), true);
  assert.equal(can(APP_ROLES.OPERATOR, PERMISSIONS.SETTINGS_USERS_MANAGE), false);
  assert.equal(can(APP_ROLES.VIEWER, PERMISSIONS.SETTINGS_USERS_MANAGE), false);
});

test("purchase approvals restricted to manager/owner", () => {
  assert.equal(can(APP_ROLES.OWNER, PERMISSIONS.PURCHASES_APPROVE), true);
  assert.equal(can(APP_ROLES.MANAGER, PERMISSIONS.PURCHASES_APPROVE), true);
  assert.equal(can(APP_ROLES.OPERATOR, PERMISSIONS.PURCHASES_APPROVE), false);
  assert.equal(can(APP_ROLES.VIEWER, PERMISSIONS.PURCHASES_APPROVE), false);
});

test("sales approvals restricted to manager/owner", () => {
  assert.equal(can(APP_ROLES.OWNER, PERMISSIONS.APPROVE_QUOTATION), true);
  assert.equal(can(APP_ROLES.MANAGER, PERMISSIONS.APPROVE_QUOTATION), true);
  assert.equal(can(APP_ROLES.OPERATOR, PERMISSIONS.APPROVE_QUOTATION), false);
  assert.equal(can(APP_ROLES.VIEWER, PERMISSIONS.APPROVE_QUOTATION), false);
});

test("viewer is read-only on critical purchase flow", () => {
  const viewerUser = { role: APP_ROLES.VIEWER, permissions: [PERMISSIONS.PURCHASES_READ], isSuperAdmin: false };
  assert.equal(canUser(viewerUser, PERMISSIONS.PURCHASES_READ), true);
  assert.equal(canUser(viewerUser, PERMISSIONS.PURCHASES_CREATE), false);
  assert.equal(canUser(viewerUser, PERMISSIONS.PURCHASES_UPDATE), false);
  assert.equal(canUser(viewerUser, PERMISSIONS.PURCHASES_DELETE), false);
});

test("legacy ADMIN role keeps full access via normalization", () => {
  const legacyAdmin = { role: "ADMIN", isSuperAdmin: false };
  assert.equal(canUser(legacyAdmin, PERMISSIONS.PURCHASES_APPROVE), true);
  assert.equal(canUser(legacyAdmin, PERMISSIONS.SETTINGS_ROLES_MANAGE), true);
});

test("explicit permission list is enforced over static role fallback", () => {
  const managerWithoutPurchasePerms = {
    role: APP_ROLES.MANAGER,
    permissions: [PERMISSIONS.CLIENTS_READ],
    isSuperAdmin: false,
  };
  assert.equal(canUser(managerWithoutPurchasePerms, PERMISSIONS.PURCHASES_READ), false);
  assert.equal(canUser(managerWithoutPurchasePerms, PERMISSIONS.CLIENTS_READ), true);
});

test("super admin bypasses permission checks", () => {
  const superAdminViewer = { role: APP_ROLES.VIEWER, permissions: [], isSuperAdmin: true };
  assert.equal(canUser(superAdminViewer, PERMISSIONS.PURCHASES_DELETE), true);
  assert.equal(canUser(superAdminViewer, PERMISSIONS.SETTINGS_ROLES_MANAGE), true);
});

test("legacy manage_users/manage_roles grant settings visibility", () => {
  const adminLikeUser = {
    role: APP_ROLES.OPERATOR,
    permissions: [PERMISSIONS.MANAGE_USERS, PERMISSIONS.MANAGE_ROLES],
    isSuperAdmin: false,
  };
  assert.equal(canUser(adminLikeUser, PERMISSIONS.SETTINGS_USERS_MANAGE), true);
  assert.equal(canUser(adminLikeUser, PERMISSIONS.SETTINGS_ROLES_MANAGE), true);
});
