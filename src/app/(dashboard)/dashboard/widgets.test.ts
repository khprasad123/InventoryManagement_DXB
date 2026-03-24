import test from "node:test";
import assert from "node:assert/strict";
import { APP_ROLES, PERMISSIONS } from "@/lib/permissions";
import { getAllowedWidgets } from "./widgets";

test("dashboard widgets: approval widgets shown for approvers", () => {
  const approver = {
    role: APP_ROLES.MANAGER,
    permissions: [PERMISSIONS.APPROVE_PURCHASE_REQUEST, PERMISSIONS.APPROVE_QUOTATION],
    isSuperAdmin: false,
  };
  const allowed = getAllowedWidgets(approver);
  assert.equal(allowed.includes("approvals_purchase_requests"), true);
  assert.equal(allowed.includes("approvals_quotations"), true);
  assert.equal(allowed.includes("approvals_sales_invoices"), true);
});

test("dashboard widgets: inventory widgets hidden without inventory read", () => {
  const salesOnly = {
    role: APP_ROLES.OPERATOR,
    permissions: [PERMISSIONS.SALES_READ],
    isSuperAdmin: false,
  };
  const allowed = getAllowedWidgets(salesOnly);
  assert.equal(allowed.includes("kpi_stock_value"), false);
  assert.equal(allowed.includes("inventory_movement"), false);
  assert.equal(allowed.includes("low_stock_items"), false);
});

test("dashboard widgets: mixed permissions get combined widgets", () => {
  const mixed = {
    role: APP_ROLES.OPERATOR,
    permissions: [PERMISSIONS.SALES_READ, PERMISSIONS.EXPENSES_READ, PERMISSIONS.INVENTORY_READ],
    isSuperAdmin: false,
  };
  const allowed = getAllowedWidgets(mixed);
  assert.equal(allowed.includes("kpi_monthly_sales"), true);
  assert.equal(allowed.includes("kpi_monthly_expenses"), true);
  assert.equal(allowed.includes("kpi_stock_value"), true);
  assert.equal(allowed.includes("monthly_progress"), true);
});
