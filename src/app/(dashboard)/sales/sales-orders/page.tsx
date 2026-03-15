import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSalesOrders } from "../actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, FileText } from "lucide-react";
import { CreateInvoiceFromSoButton } from "../create-invoice-from-so-button";

export default async function SalesOrdersPage() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const orders = await getSalesOrders();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/sales">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sales
            </Link>
          </Button>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Sales Orders</h1>
          <p className="text-muted-foreground">
            Created from approved quotations. Create Invoice from a Sales Order to complete the sale.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Sales Orders</CardTitle>
          <p className="text-sm text-muted-foreground">
            Flow: Quotation → Approval → Sales Order → Invoice → Payment
          </p>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No sales orders yet. Approve a quotation, then create a Sales Order from the quotation detail.
              </p>
              <Button asChild className="mt-4">
                <Link href="/sales/quotations">View Quotations</Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Quotation</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((so) => {
                    const total = so.items.reduce((s, i) => s + Number(i.total), 0);
                    const hasInvoice = so.salesInvoices?.length > 0;
                    const invoice = hasInvoice ? so.salesInvoices[0] : null;
                    return (
                      <TableRow key={so.id}>
                        <TableCell className="font-medium">{so.orderNo}</TableCell>
                        <TableCell>{new Date(so.orderDate).toLocaleDateString()}</TableCell>
                        <TableCell>{so.quotation?.client?.name ?? "-"}</TableCell>
                        <TableCell>
                          {so.quotation ? (
                            <Link
                              href={`/sales/quotations/${so.quotation.id}`}
                              className="text-primary hover:underline"
                            >
                              {so.quotation.quotationNo}
                            </Link>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">{total.toFixed(2)}</TableCell>
                        <TableCell>
                          {invoice ? (
                            <Link
                              href={`/sales/${invoice.id}`}
                              className="text-primary hover:underline"
                            >
                              {invoice.invoiceNo}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {!hasInvoice && so.quotation && (
                              <CreateInvoiceFromSoButton salesOrderId={so.id} />
                            )}
                            <Button variant="ghost" size="icon" asChild title="View quotation">
                              <Link href={`/sales/quotations/${so.quotation?.id ?? "#"}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
