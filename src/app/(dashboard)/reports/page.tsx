import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getReportsData } from "./actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { canUser, PERMISSIONS, getAllowedReportTypes } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/auth-utils";
import { ReportsWorkspace } from "./reports-workspace";

export default async function ReportsPage() {
  const data = await getReportsData({});
  const user = await getCurrentUser();
  const canDeleteReportFiles = !!user && canUser(user, PERMISSIONS.SETTINGS_USERS_MANAGE);
  const allowedReportTypes = getAllowedReportTypes(user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Sales, inventory, and finance insights
        </p>
      </div>

      <ReportsWorkspace
        initialFiles={data.generatedFiles.map((f) => ({
          ...f,
          createdAt: new Date(f.createdAt).toISOString(),
          expiresAt: new Date(f.expiresAt).toISOString(),
        }))}
        canDelete={canDeleteReportFiles}
        defaultFrom={data.filters.from}
        defaultTo={data.filters.to}
        allowedReportTypes={allowedReportTypes}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader><CardTitle className="text-sm">Sales Total</CardTitle></CardHeader>
          <CardContent className="text-xl font-semibold">{data.summary.salesTotal.toFixed(2)} {data.currencyCode}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Purchases Total</CardTitle></CardHeader>
          <CardContent className="text-xl font-semibold">{data.summary.purchasesTotal.toFixed(2)} {data.currencyCode}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Receivables</CardTitle></CardHeader>
          <CardContent className="text-xl font-semibold">{data.summary.receivables.toFixed(2)} {data.currencyCode}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Payables</CardTitle></CardHeader>
          <CardContent className="text-xl font-semibold">{data.summary.payables.toFixed(2)} {data.currencyCode}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Inventory Value</CardTitle></CardHeader>
          <CardContent className="text-xl font-semibold">{data.summary.inventoryTotalValue.toFixed(2)} {data.currencyCode}</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top Customers (Revenue)</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topCustomers.length === 0 ? (
                    <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground">No data</TableCell></TableRow>
                  ) : data.topCustomers.map((row) => (
                    <TableRow key={row.clientName}>
                      <TableCell>{row.clientName}</TableCell>
                      <TableCell className="text-right">{row.revenue.toFixed(2)} {data.currencyCode}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top Items (Revenue)</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topItems.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No data</TableCell></TableRow>
                  ) : data.topItems.map((row) => (
                    <TableRow key={`${row.sku}-${row.name}`}>
                      <TableCell>{row.sku}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell className="text-right">{row.qty}</TableCell>
                      <TableCell className="text-right">{row.revenue.toFixed(2)} {data.currencyCode}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
