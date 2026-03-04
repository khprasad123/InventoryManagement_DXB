import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getPurchaseInvoiceById } from "../actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function PurchaseInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const { id } = await params;
  const invoice = await getPurchaseInvoiceById(id);
  if (!invoice) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/purchases">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Purchases
          </Link>
        </Button>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          {invoice.invoiceNo}
        </h1>
        <p className="text-muted-foreground">
          {invoice.supplier.name} • {new Date(invoice.invoiceDate).toLocaleDateString()}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Supplier</span>
              <p className="font-medium">{invoice.supplier.name}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Invoice Date</span>
              <p className="font-medium">
                {new Date(invoice.invoiceDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Due Date</span>
              <p className="font-medium">
                {invoice.dueDate
                  ? new Date(invoice.dueDate).toLocaleDateString()
                  : "-"}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Payment Status</span>
              <p className="font-medium">{invoice.paymentStatus}</p>
            </div>
            {invoice.grn && (
              <div>
                <span className="text-sm text-muted-foreground">Linked GRN</span>
                <p className="font-medium">
                  <Link
                    href={`/purchases/grn/${invoice.grn.id}`}
                    className="text-primary hover:underline"
                  >
                    {invoice.grn.grnNo}
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Amounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{Number(invoice.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{Number(invoice.taxAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span>{Number(invoice.totalAmount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid</span>
              <span>{Number(invoice.paidAmount).toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {invoice.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell>{it.item.name}</TableCell>
                      <TableCell>{it.item.sku}</TableCell>
                      <TableCell className="text-right">{it.quantity}</TableCell>
                      <TableCell className="text-right">
                        {Number(it.unitPrice).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(it.total).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
