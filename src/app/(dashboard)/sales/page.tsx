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
import { Plus, FileText, FileSignature, Eye, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DeleteSalesInvoiceButton } from "./delete-sales-invoice-button";

export default async function SalesPage() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const invoices = await getSalesInvoices();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales</h1>
          <p className="text-muted-foreground">
            Flow: Quotation (cost, margin) → Approval → Sales Order (price) → Invoice → Payment
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/sales/quotations">
              <FileSignature className="mr-2 h-4 w-4" />
              Quotations
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/sales/sales-orders">
              <FileText className="mr-2 h-4 w-4" />
              Sales Orders
            </Link>
          </Button>
          <Button asChild>
            <Link href="/sales/quotations/add">
              <Plus className="mr-2 h-4 w-4" />
              New Quotation
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/sales/add">
              <FileText className="mr-2 h-4 w-4" />
              Direct Invoice
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales Invoices</CardTitle>
          <p className="text-sm text-muted-foreground">
            Invoices from Sales Orders (or create direct). Record payments to close jobs.
          </p>
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
                    <TableHead>Due Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Quotation</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                      <TableCell>
                        {inv.dueDate
                          ? new Date(inv.dueDate).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>{inv.client.name}</TableCell>
                      <TableCell>
                        {inv.salesOrder?.quotation ? (
                          <Link
                            href={`/sales/quotations/${inv.salesOrder?.quotation.id}`}
                            className="text-primary hover:underline"
                          >
                            {inv.salesOrder?.quotation.quotationNo}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(inv.totalAmount).toFixed(2)} {inv.currencyCode}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            inv.paymentStatus === "PAID"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : inv.paymentStatus === "PARTIAL"
                              ? "bg-amber-100 text-amber-800 border-amber-200"
                              : "bg-red-100 text-red-800 border-red-200"
                          }
                        >
                          {inv.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" asChild title="View details & documents">
                            <Link href={`/sales/${inv.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild title="Edit">
                            <Link href={`/sales/${inv.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <DeleteSalesInvoiceButton
                            invoiceId={inv.id}
                            invoiceNo={inv.invoiceNo}
                            canDelete={inv.paymentStatus !== "PAID" && Number(inv.paidAmount) < Number(inv.totalAmount)}
                          />
                        </div>
                      </TableCell>
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
