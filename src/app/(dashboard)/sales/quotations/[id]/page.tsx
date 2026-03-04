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
import { getQuotationById } from "../../actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConvertToInvoiceButton } from "../../convert-to-invoice-button";
import { ApproveQuotationButton } from "../../approve-quotation-button";

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const { id } = await params;
  const quotation = await getQuotationById(id);
  if (!quotation) notFound();

  const total = quotation.items.reduce((s, i) => s + Number(i.total), 0);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/sales/quotations">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Quotations
          </Link>
        </Button>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">
            {quotation.quotationNo}
          </h1>
          {quotation.status === "DRAFT" && !quotation.salesInvoice && (
            <Button asChild size="sm" variant="outline">
              <Link href={`/sales/quotations/${quotation.id}/edit`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </Button>
          )}
          <Badge
            variant={
              quotation.status === "APPROVED" ? "default" : "secondary"
            }
          >
            {quotation.status}
          </Badge>
          {quotation.salesInvoice && (
            <Link
              href={`/sales/${quotation.salesInvoice.id}`}
              className="text-sm text-primary hover:underline"
            >
              → Invoice {quotation.salesInvoice.invoiceNo}
            </Link>
          )}
        </div>
        <p className="text-muted-foreground">
          {quotation.client.name} •{" "}
          {new Date(quotation.quotationDate).toLocaleDateString()}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotation.items.map((qi) => (
                  <TableRow key={qi.id}>
                    <TableCell>
                      {qi.item.sku} - {qi.item.name}
                    </TableCell>
                    <TableCell className="text-right">
                      {qi.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(qi.unitPrice).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(qi.total).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex justify-end">
            <p className="text-lg font-medium">Total: {total.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>

      {quotation.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{quotation.notes}</p>
          </CardContent>
        </Card>
      )}

      {quotation.status === "DRAFT" && !quotation.salesInvoice && (
        <ApproveQuotationButton quotationId={quotation.id} />
      )}

      {!quotation.salesInvoice && quotation.status === "APPROVED" && (
        <div className="flex gap-4">
          <ConvertToInvoiceButton quotationId={quotation.id} />
        </div>
      )}

      {quotation.status === "DRAFT" && !quotation.salesInvoice && (
        <p className="text-sm text-muted-foreground">
          Approve this quotation to enable &quot;Convert to Invoice&quot;.
        </p>
      )}
    </div>
  );
}
