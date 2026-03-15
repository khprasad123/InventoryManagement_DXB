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
import { getSalesOrderById } from "../../actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CreateInvoiceFromSoButton } from "../../create-invoice-from-so-button";
import { DocumentSection } from "@/app/(dashboard)/documents/document-section";

export default async function SalesOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const { id } = await Promise.resolve(params);
  const so = await getSalesOrderById(id);
  if (!so) notFound();

  const total = so.items.reduce((s, i) => s + Number(i.total), 0);
  const hasInvoice = so.salesInvoices?.length > 0;
  const invoice = hasInvoice ? so.salesInvoices[0] : null;

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/sales/sales-orders">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sales Orders
          </Link>
        </Button>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">{so.orderNo}</h1>
          {invoice && (
            <Link
              href={`/sales/${invoice.id}`}
              className="text-sm text-primary hover:underline"
            >
              → Invoice {invoice.invoiceNo}
            </Link>
          )}
        </div>
        <p className="text-muted-foreground">
          {so.quotation?.client?.name ?? "—"} • Job: {so.jobId || "—"} •{" "}
          {new Date(so.orderDate).toLocaleDateString()}
          {so.quotation && (
            <>
              {" "}
              • Quotation{" "}
              <Link
                href={`/sales/quotations/${so.quotation.id}`}
                className="text-primary hover:underline"
              >
                {so.quotation.quotationNo}
              </Link>
            </>
          )}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Items (final price with margin)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {so.items.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        {line.item.sku} – {line.item.name}
                      </TableCell>
                      <TableCell className="text-right">{line.quantity}</TableCell>
                      <TableCell className="text-right">
                        {Number(line.unitPrice).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(line.total).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="mt-2 text-right font-medium">Total: {total.toFixed(2)}</p>
            {!hasInvoice && so.quotation && (
              <div className="mt-4">
                <CreateInvoiceFromSoButton salesOrderId={so.id} />
              </div>
            )}
          </CardContent>
        </Card>

        <DocumentSection documentableType="SalesOrder" documentableId={so.id} />
      </div>
    </div>
  );
}
