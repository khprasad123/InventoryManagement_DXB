import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSalesInvoices } from "./actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, FileText, FileSignature } from "lucide-react";

export default async function SalesPage() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const invoices = await getSalesInvoices();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales</h1>
          <p className="text-muted-foreground">
            Quotations, invoices, and sales tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/sales/quotations">
              <FileSignature className="mr-2 h-4 w-4" />
              Quotations
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/sales/quotations/add">
              <Plus className="mr-2 h-4 w-4" />
              New Quotation
            </Link>
          </Button>
          <Button asChild>
            <Link href="/sales/add">
              <FileText className="mr-2 h-4 w-4" />
              New Invoice
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No sales invoices yet. Create a quotation or invoice directly.
              </p>
              <div className="mt-4 flex gap-2">
                <Button asChild variant="outline">
                  <Link href="/sales/quotations/add">Create Quotation</Link>
                </Button>
                <Button asChild>
                  <Link href="/sales/add">Create Invoice</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Quotation</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/sales/${inv.id}`}
                          className="text-primary hover:underline"
                        >
                          {inv.invoiceNo}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {new Date(inv.invoiceDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{inv.client.name}</TableCell>
                      <TableCell>
                        {inv.quotation ? (
                          <Link
                            href={`/sales/quotations/${inv.quotation.id}`}
                            className="text-primary hover:underline"
                          >
                            {inv.quotation.quotationNo}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(inv.totalAmount).toFixed(2)} {inv.currencyCode}
                      </TableCell>
                      <TableCell>{inv.paymentStatus}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
