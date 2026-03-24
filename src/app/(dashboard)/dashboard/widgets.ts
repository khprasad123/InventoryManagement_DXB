import { PERMISSIONS, type PermissionCode, canUser } from "@/lib/permissions";

export type DashboardWidgetId =
  | "approvals_purchase_requests"
  | "approvals_quotations"
  | "approvals_sales_invoices"
  | "kpi_stock_value"
  | "kpi_monthly_sales"
  | "kpi_monthly_expenses"
  | "kpi_net_profit"
  | "profit_breakdown"
  | "monthly_progress"
  | "revenue_expense_chart"
  | "inventory_movement"
  | "outstanding_summary"
  | "due_soon_receivables"
  | "due_soon_payables"
  | "top_selling_items"
  | "high_value_items"
  | "low_stock_items";

type SessionUser = {
  role?: string;
  permissions?: string[];
  isSuperAdmin?: boolean;
} | null;

export type DashboardWidgetDef = {
  id: DashboardWidgetId;
  title: string;
  priority: number;
  requiredAny: PermissionCode[];
};

export const DASHBOARD_WIDGETS: DashboardWidgetDef[] = [
  { id: "approvals_purchase_requests", title: "Pending PR Approvals", priority: 10, requiredAny: [PERMISSIONS.PURCHASES_APPROVE, PERMISSIONS.APPROVE_PURCHASE_REQUEST] },
  { id: "approvals_quotations", title: "Pending Quotation Approvals", priority: 11, requiredAny: [PERMISSIONS.APPROVE_QUOTATION] },
  { id: "approvals_sales_invoices", title: "Pending Sales Invoice Approvals", priority: 12, requiredAny: [PERMISSIONS.APPROVE_QUOTATION] },
  { id: "kpi_stock_value", title: "Total Stock Value", priority: 20, requiredAny: [PERMISSIONS.INVENTORY_READ] },
  { id: "kpi_monthly_sales", title: "Monthly Sales", priority: 21, requiredAny: [PERMISSIONS.SALES_READ] },
  { id: "kpi_monthly_expenses", title: "Monthly Expenses", priority: 22, requiredAny: [PERMISSIONS.EXPENSES_READ] },
  { id: "kpi_net_profit", title: "Net Profit", priority: 23, requiredAny: [PERMISSIONS.SALES_READ, PERMISSIONS.EXPENSES_READ, PERMISSIONS.PURCHASES_READ] },
  { id: "profit_breakdown", title: "Profit Breakdown", priority: 24, requiredAny: [PERMISSIONS.SALES_READ, PERMISSIONS.EXPENSES_READ, PERMISSIONS.PURCHASES_READ] },
  { id: "monthly_progress", title: "Monthly Progress", priority: 25, requiredAny: [PERMISSIONS.SALES_READ, PERMISSIONS.EXPENSES_READ] },
  { id: "revenue_expense_chart", title: "Revenue vs Expenses", priority: 30, requiredAny: [PERMISSIONS.SALES_READ, PERMISSIONS.EXPENSES_READ] },
  { id: "inventory_movement", title: "Inventory Movement", priority: 31, requiredAny: [PERMISSIONS.INVENTORY_READ] },
  { id: "outstanding_summary", title: "Outstanding", priority: 40, requiredAny: [PERMISSIONS.SALES_READ, PERMISSIONS.PURCHASES_READ] },
  { id: "due_soon_receivables", title: "Receivables Due Soon", priority: 41, requiredAny: [PERMISSIONS.SALES_READ] },
  { id: "due_soon_payables", title: "Payables Due Soon", priority: 42, requiredAny: [PERMISSIONS.PURCHASES_READ] },
  { id: "top_selling_items", title: "Top Selling Items", priority: 50, requiredAny: [PERMISSIONS.SALES_READ] },
  { id: "high_value_items", title: "High Value Items", priority: 51, requiredAny: [PERMISSIONS.INVENTORY_READ] },
  { id: "low_stock_items", title: "Low Stock Alert", priority: 52, requiredAny: [PERMISSIONS.INVENTORY_READ] },
];

export function getAllowedWidgets(user: SessionUser): DashboardWidgetId[] {
  return DASHBOARD_WIDGETS.filter((w) => w.requiredAny.some((p) => canUser(user, p)))
    .sort((a, b) => a.priority - b.priority)
    .map((w) => w.id);
}
