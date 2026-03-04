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
import { requireAuth } from "@/lib/auth-utils";
import { getDashboardData } from "./actions";
import { RevenueExpenseChart } from "./revenue-expense-chart";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await requireAuth();
  const data = await getDashboardData();

  const kpiCards = [
    {
      title: "Total Stock Value",
      value: `${data.totalStockValue.toFixed(2)} ${data.defaultCurrencyCode}`,
      icon: Package,
      description: "Current inventory value (cost)",
    },
    {
      title: "Monthly Sales",
      value: `${data.monthlySalesTotal.toFixed(2)} ${data.defaultCurrencyCode}`,
      icon: TrendingUp,
      description: `Revenue · ${data.currentMonthLabel}`,
    },
    {
      title: "Monthly Expenses",
      value: `${data.monthlyExpensesTotal.toFixed(2)} ${data.defaultCurrencyCode}`,
      icon: CreditCard,
      description: data.currentMonthLabel,
    },
    {
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
          Overview of {user.organizationName}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((stat) => {
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

      <div className="grid gap-6 lg:grid-cols-2">
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
                {data.outstandingReceivables.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm font-medium">Payables</span>
              </div>
              <span className="text-lg font-semibold">
                {data.outstandingPayables.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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
      </div>
    </div>
  );
}
