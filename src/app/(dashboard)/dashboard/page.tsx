import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  TrendingUp,
  CreditCard,
  Wallet,
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
} from "lucide-react";
import { requireAuth, getOrgTimezone } from "@/lib/auth-utils";
import { formatInTimezone } from "@/lib/date-utils";
import { getDashboardData } from "./actions";
import { RevenueExpenseChart } from "./revenue-expense-chart";
import Link from "next/link";
import { DASHBOARD_WIDGETS, type DashboardWidgetId } from "./widgets";
import { CustomizeDashboard } from "./customize-dashboard";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ widgets?: string }>;
}) {
  const user = await requireAuth();
  const params = await searchParams;
  const [data, timezone] = await Promise.all([getDashboardData(user), getOrgTimezone()]);
  const tz = timezone ?? "UTC";
  const allowed = data.allowedWidgets;
  const requested = (params.widgets ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as DashboardWidgetId[];
  const visible = requested.length
    ? allowed.filter((id) => requested.includes(id))
    : allowed;
  const has = (id: DashboardWidgetId) => visible.includes(id);
  const allowedDefs = DASHBOARD_WIDGETS.filter((w) => allowed.includes(w.id));

  const kpiCards = [
    {
      id: "kpi_stock_value" as DashboardWidgetId,
      title: "Total Stock Value",
      value: `${data.totalStockValue.toFixed(2)} ${data.defaultCurrencyCode}`,
      icon: Package,
      description: "Current inventory value (cost)",
    },
    {
      id: "kpi_monthly_sales" as DashboardWidgetId,
      title: "Monthly Sales",
      value: `${data.monthlySalesTotal.toFixed(2)} ${data.defaultCurrencyCode}`,
      icon: TrendingUp,
      description: `Revenue · ${data.currentMonthLabel}`,
    },
    {
      id: "kpi_monthly_expenses" as DashboardWidgetId,
      title: "Monthly Expenses",
      value: `${data.monthlyExpensesTotal.toFixed(2)} ${data.defaultCurrencyCode}`,
      icon: CreditCard,
      description: data.currentMonthLabel,
    },
    {
      id: "kpi_net_profit" as DashboardWidgetId,
      title: "Net Profit",
      value: `${data.netProfit.toFixed(2)} ${data.defaultCurrencyCode}`,
      icon: Wallet,
      description: `Revenue − COGS − Expenses · ${data.currentMonthLabel}`,
      valueClass: data.netProfit >= 0 ? "text-emerald-600" : "text-destructive",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Personalized overview of {user.organizationName}
        </p>
        <div className="mt-3">
          <CustomizeDashboard allowedDefs={allowedDefs} selectedWidgets={visible} />
        </div>
      </div>

      {(has("approvals_purchase_requests") || has("approvals_quotations") || has("approvals_sales_invoices")) && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            <p className="text-sm text-muted-foreground">
              Items awaiting your action
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {has("approvals_purchase_requests") && (
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Purchase Requests</p>
                <p className="mt-1 text-2xl font-bold">{data.approvalSummary.purchaseRequests}</p>
                <ul className="mt-3 space-y-2 text-xs">
                  {data.approvalItems.purchaseRequests.slice(0, 3).map((row: any) => (
                    <li key={row.id}>
                      <Link href={row.href} className="text-primary hover:underline">{row.number}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {has("approvals_quotations") && (
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Quotations</p>
                <p className="mt-1 text-2xl font-bold">{data.approvalSummary.quotations}</p>
                <ul className="mt-3 space-y-2 text-xs">
                  {data.approvalItems.quotations.slice(0, 3).map((row: any) => (
                    <li key={row.id}>
                      <Link href={row.href} className="text-primary hover:underline">{row.number}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {has("approvals_sales_invoices") && (
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Sales Invoices</p>
                <p className="mt-1 text-2xl font-bold">{data.approvalSummary.salesInvoices}</p>
                <ul className="mt-3 space-y-2 text-xs">
                  {data.approvalItems.salesInvoices.slice(0, 3).map((row: any) => (
                    <li key={row.id}>
                      <Link href={row.href} className="text-primary hover:underline">{row.number}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.filter((s) => has(s.id)).map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${stat.valueClass ?? ""}`}
                >
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {has("profit_breakdown") && (
      <Card>
        <CardHeader>
          <CardTitle>Profit breakdown</CardTitle>
          <p className="text-sm text-muted-foreground">
            {data.currentMonthLabel} · Net = Revenue − COGS − Expenses ·{" "}
            {data.defaultCurrencyCode}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex justify-between rounded-lg border p-4 sm:flex-col sm:gap-1">
              <span className="text-sm text-muted-foreground">Revenue</span>
              <span className="font-semibold">
                {data.monthlyRevenue.toFixed(2)} {data.defaultCurrencyCode}
              </span>
            </div>
            <div className="flex justify-between rounded-lg border p-4 sm:flex-col sm:gap-1">
              <span className="text-sm text-muted-foreground">COGS</span>
              <span className="font-semibold">
                −{data.monthlyCogs.toFixed(2)} {data.defaultCurrencyCode}
              </span>
            </div>
            <div className="flex justify-between rounded-lg border p-4 sm:flex-col sm:gap-1">
              <span className="text-sm text-muted-foreground">Expenses</span>
              <span className="font-semibold">
                −{data.monthlyExpensesTotal.toFixed(2)} {data.defaultCurrencyCode}
              </span>
            </div>
            <div className="flex justify-between rounded-lg border p-4 sm:flex-col sm:gap-1">
              <span className="text-sm text-muted-foreground">Net profit</span>
              <span
                className={`font-semibold ${
                  data.netProfit >= 0 ? "text-emerald-600" : "text-destructive"
                }`}
              >
                {data.netProfit.toFixed(2)} {data.defaultCurrencyCode}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {has("revenue_expense_chart") && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue vs Expenses</CardTitle>
            <p className="text-sm text-muted-foreground">
              Last 6 months
            </p>
          </CardHeader>
          <CardContent>
            <RevenueExpenseChart data={data.revenueExpenseByMonth} />
          </CardContent>
        </Card>
        )}

        {has("outstanding_summary") && (
        <Card>
          <CardHeader>
            <CardTitle>Outstanding</CardTitle>
            <p className="text-sm text-muted-foreground">
              Receivables and payables
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <ArrowDownCircle className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Receivables</span>
              </div>
              <span className="text-lg font-semibold">
                {data.outstandingReceivables.toFixed(2)} {data.defaultCurrencyCode}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Payables</span>
              </div>
              <span className="text-lg font-semibold">
                {data.outstandingPayables.toFixed(2)} {data.defaultCurrencyCode}
              </span>
            </div>
          </CardContent>
        </Card>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {has("due_soon_receivables") && (
        <Card>
          <CardHeader>
            <CardTitle>Receivables due soon</CardTitle>
            <p className="text-sm text-muted-foreground">
              Next 7 days • Sales invoices not fully paid
            </p>
          </CardHeader>
          <CardContent>
            {data.dueSoonReceivables.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No receivables due in the next 7 days.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.dueSoonReceivables.map((inv: any) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between rounded border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/sales/${inv.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {inv.invoiceNo}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {inv.name} · Due{" "}
                        {inv.dueDate
                          ? new Date(inv.dueDate).toLocaleDateString()
                          : "-"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {Number(inv.outstanding).toFixed(2)} {inv.currencyCode}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        )}

        {has("due_soon_payables") && (
        <Card>
          <CardHeader>
            <CardTitle>Payables due soon</CardTitle>
            <p className="text-sm text-muted-foreground">
              Next 7 days • Purchase invoices not fully paid
            </p>
          </CardHeader>
          <CardContent>
            {data.dueSoonPayables.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No payables due in the next 7 days.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.dueSoonPayables.map((inv: any) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between rounded border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/purchases/${inv.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {inv.invoiceNo}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {inv.name} · Due{" "}
                        {inv.dueDate
                          ? formatInTimezone(inv.dueDate, tz)
                          : "-"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {Number(inv.outstanding).toFixed(2)} {inv.currencyCode}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {has("top_selling_items") && (
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Items</CardTitle>
            <p className="text-sm text-muted-foreground">
              {data.currentMonthLabel} by revenue
            </p>
          </CardHeader>
          <CardContent>
            {data.topSellingItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No sales this month.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.topSellingItems.map((item, i) => (
                  <li
                    key={item.itemId}
                    className="flex items-center justify-between rounded border px-3 py-2 text-sm"
                  >
                    <span className="font-medium">
                      {i + 1}. {item.sku} – {item.name}
                    </span>
                    <span>{item.totalRevenue.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        )}

        {has("low_stock_items") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Low Stock Alert
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Items at or below minimum stock
            </p>
          </CardHeader>
          <CardContent>
            {data.lowStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No low stock items.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.lowStockItems.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/inventory/${item.id}/edit`}
                      className="flex items-center justify-between rounded border px-3 py-2 text-sm hover:bg-muted/50"
                    >
                      <span className="font-medium">
                        {item.sku} – {item.name}
                      </span>
                      <span className="text-amber-600">
                        {item.stockQty} / {item.minStock}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        )}
      </div>

      {(has("inventory_movement") || has("monthly_progress") || has("high_value_items")) && (
        <div className="grid gap-6 lg:grid-cols-3">
          {has("inventory_movement") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Inventory Movement
                </CardTitle>
                <p className="text-sm text-muted-foreground">{data.currentMonthLabel}</p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>IN: <span className="font-semibold">{data.inventoryMovement.inQty}</span></p>
                <p>OUT: <span className="font-semibold">{data.inventoryMovement.outQty}</span></p>
                <p>ADJUST: <span className="font-semibold">{data.inventoryMovement.adjustmentQty}</span></p>
              </CardContent>
            </Card>
          )}
          {has("monthly_progress") && (
            <Card>
              <CardHeader>
                <CardTitle>Monthly Progress</CardTitle>
                <p className="text-sm text-muted-foreground">Performance indicators</p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  Revenue/Expense Ratio:{" "}
                  <span className="font-semibold">{data.monthlyProgress.revenueVsExpenseRatio.toFixed(2)}</span>
                </p>
                <p>
                  Net Margin:{" "}
                  <span className="font-semibold">{data.monthlyProgress.netMarginPercent.toFixed(2)}%</span>
                </p>
              </CardContent>
            </Card>
          )}
          {has("high_value_items") && (
            <Card>
              <CardHeader>
                <CardTitle>High Value Items</CardTitle>
                <p className="text-sm text-muted-foreground">Top inventory value items</p>
              </CardHeader>
              <CardContent>
                {data.highValueItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {data.highValueItems.slice(0, 5).map((item: any) => (
                      <li key={item.id} className="flex justify-between rounded border px-2 py-1">
                        <span>{item.sku} - {item.name}</span>
                        <span className="font-semibold">{item.stockValue.toFixed(2)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
