import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { getPurchasesReportData } from "../actions";

export default async function PurchasesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const data = await getPurchasesReportData(params);
  const xlsxHref = `/api/reports/purchases?format=xlsx&from=${encodeURIComponent(data.filters.from)}&to=${encodeURIComponent(data.filters.to)}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Report</h1>
          <p className="text-muted-foreground">Detailed purchase invoices with drill-down links</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild><Link href="/reports">Back to Reports</Link></Button>
          <Button asChild><Link href={xlsxHref}>Export XLSX</Link></Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
        <CardContent>
          <form className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label htmlFor="from" className="text-sm text-muted-foreground">From</label>
              <Input id="from" name="from" type="date" defaultValue={data.filters.from} />
            </div>
            <div className="space-y-1">
              <label htmlFor="to" className="text-sm text-muted-foreground">To</label>
              <Input id="to" name="to" type="date" defaultValue={data.filters.to} />
            </div>
            <Button type="submit">Apply</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
        <CardContent className="text-sm">
          <div className="flex justify-between"><span>Invoices</span><span>{data.summary.count}</span></div>
          <div className="flex justify-between"><span>Total</span><span>{data.summary.totalBase.toFixed(2)} {data.currencyCode}</span></div>
          <div className="flex justify-between"><span>Outstanding</span><span>{data.summary.outstandingBase.toFixed(2)} {data.currencyCode}</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Invoices</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total ({data.currencyCode})</TableHead>
                  <TableHead className="text-right">Outstanding ({data.currencyCode})</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No data</TableCell></TableRow>
                ) : data.rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell><Link className="text-primary hover:underline" href={`/purchases/${r.id}`}>{r.invoiceNo}</Link></TableCell>
                    <TableCell>{r.invoiceDate}</TableCell>
                    <TableCell><Link className="text-primary hover:underline" href={`/suppliers/${r.supplierId}`}>{r.supplierName}</Link></TableCell>
                    <TableCell>{r.paymentStatus}</TableCell>
                    <TableCell className="text-right">{r.totalBase.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{r.outstandingBase.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
