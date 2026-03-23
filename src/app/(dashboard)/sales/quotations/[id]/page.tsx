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
import { getOrgForInvoice, getQuotationById } from "../../actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CreateSalesOrderButton } from "../../create-sales-order-button";
import { CreateInvoiceFromSoButton } from "../../create-invoice-from-so-button";
import { SubmitQuotationButton } from "../../submit-quotation-button";
import { ApproveRejectQuotation } from "../../approve-reject-quotation";
import { DeleteQuotationButton } from "../../delete-quotation-button";
import { formatInTimezone, formatDateTimeInTimezone } from "@/lib/date-utils";
import { PrintQuotationButton } from "../../print-quotation-button";
import { QuotationPrintLayout } from "../../quotation-print-layout";

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const { id } = await Promise.resolve(params);
  const [quotation, org] = await Promise.all([
    getQuotationById(id),
    getOrgForInvoice(),
  ]);
  if (!quotation) notFound();

  const subtotal = quotation.items.reduce((s, i) => s + Number(i.total), 0);
  const vatPct = Number((quotation as any).taxPercent ?? 0);
  const computedTaxAmount = (subtotal * vatPct) / 100;
  const storedTaxAmount = Number((quotation as any).taxAmount ?? 0);
  const taxAmount = storedTaxAmount === 0 ? computedTaxAmount : storedTaxAmount;
  const storedTotalAmount = Number((quotation as any).totalAmount ?? 0);
  const totalAmount =
    storedTotalAmount === 0 ? subtotal + taxAmount : storedTotalAmount;
  const tz = org?.timezone ?? "UTC";

  return (
    <>
      <div className="space-y-6 print:hidden">
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
          {quotation.status === "DRAFT" && !quotation.salesOrder?.salesInvoices?.length && (
            <>
              <Button asChild size="sm" variant="outline">
                <Link href={`/sales/quotations/${quotation.id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <DeleteQuotationButton
                quotationId={quotation.id}
                quotationNo={quotation.quotationNo}
              />
            </>
          )}
          <Badge
            variant={
              quotation.status === "APPROVED"
                ? "default"
                : quotation.status === "REJECTED"
                  ? "danger"
                  : "secondary"
            }
          >
            {quotation.status}
          </Badge>
          {quotation.salesOrder?.salesInvoices?.[0] && (
            <Link
              href={`/sales/${quotation.salesOrder.salesInvoices[0].id}`}
              className="text-sm text-primary hover:underline"
            >
              → Invoice {quotation.salesOrder.salesInvoices[0].invoiceNo}
            </Link>
          )}
          <PrintQuotationButton quotation={{ quotationNo: quotation.quotationNo }} />
        </div>
        <p className="text-muted-foreground">
          {quotation.client.name} • Job ID: {quotation.jobId || "-"} •{" "}
          {formatInTimezone(quotation.quotationDate, tz)}
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
                    <TableHead className="text-right">Purchase (cost)</TableHead>
                    <TableHead className="text-right">Margin %</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">VAT %</TableHead>
                    <TableHead className="text-right">VAT Amount</TableHead>
                    <TableHead className="text-right">Gross Amount</TableHead>
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
                        {Number(qi.purchaseCost).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(qi.margin).toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(qi.unitPrice).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(qi.total).toFixed(2)}
                      </TableCell>
                      {(() => {
                        const netAmount = Number(qi.total ?? 0);
                        const taxAmt = (netAmount * vatPct) / 100;
                        const gross = netAmount + taxAmt;
                        return (
                          <>
                            <TableCell className="text-right">
                              {vatPct.toFixed(2)}%
                            </TableCell>
                            <TableCell className="text-right">
                              {taxAmt.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              {gross.toFixed(2)}
                            </TableCell>
                          </>
                        );
                      })()}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex flex-col items-end gap-1 text-right">
              <p className="text-sm text-muted-foreground">
                Taxable Value: {subtotal.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                VAT ({vatPct}%): {taxAmount.toFixed(2)}
              </p>
              <p className="text-lg font-medium">
                Total: {totalAmount.toFixed(2)}
              </p>
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

      <Card>
        <CardHeader>
          <CardTitle>Prepared By</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-medium">{(quotation as any).preparedByName ?? "—"}</p>
        </CardContent>
      </Card>

      {quotation.status === "APPROVED" && quotation.approvedAt && (
        <Card>
          <CardHeader>
            <CardTitle>Approval</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div>
              <span className="text-sm text-muted-foreground">Approved By</span>
              <p className="font-medium">
                {(quotation as any).approvedByName ?? "—"}
              </p>
            </div>
            {quotation.approvedAt && (
              <div>
                <span className="text-sm text-muted-foreground">
                  Approved At
                </span>
                <p className="text-sm text-muted-foreground">
                  {formatDateTimeInTimezone(quotation.approvedAt, tz)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {quotation.status === "DRAFT" && !quotation.salesOrder?.salesInvoices?.length && (
        <>
          <SubmitQuotationButton quotationId={quotation.id} />
          <p className="text-sm text-muted-foreground">
            Submit for approval. Only Pending Approval can be approved or rejected (reject requires remarks).
          </p>
        </>
      )}

      {quotation.status === "PENDING_APPROVAL" && !quotation.salesOrder?.salesInvoices?.length && (
        <>
          <ApproveRejectQuotation quotationId={quotation.id} />
          <p className="text-sm text-muted-foreground">
            Approve (optional remarks) or Reject (remarks required). Once rejected, this quotation cannot be amended.
          </p>
        </>
      )}

      {quotation.status === "REJECTED" && quotation.approvalRemarks && (
        <Card>
          <CardHeader>
            <CardTitle>Rejection reason</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{quotation.approvalRemarks}</p>
            <p className="mt-2 text-xs text-muted-foreground">Rejected quotations cannot be amended.</p>
          </CardContent>
        </Card>
      )}

      {quotation.status === "APPROVED" && quotation.approvalRemarks && (
        <Card>
          <CardHeader>
            <CardTitle>Approval remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{quotation.approvalRemarks}</p>
          </CardContent>
        </Card>
      )}

      {quotation.status === "APPROVED" && !quotation.salesOrder && (
        <>
          <CreateSalesOrderButton quotationId={quotation.id} />
          <p className="text-sm text-muted-foreground">
            Next: Create Sales Order (price with margin), then create Invoice from Sales Order.
          </p>
        </>
      )}

      {quotation.status === "APPROVED" && quotation.salesOrder && !quotation.salesOrder.salesInvoices?.length && (
        <>
          <CreateInvoiceFromSoButton salesOrderId={quotation.salesOrder.id} />
          <p className="text-sm text-muted-foreground">
            Sales Order created. Create invoice to complete sale and update stock.
          </p>
        </>
      )}

        {/* Printable quotation - shown only when printing */}
        {/* Rendered outside this `print:hidden` wrapper below */}
      </div>

      <div className="hidden print:block">
        <QuotationPrintLayout quotation={quotation} org={org} />
      </div>
    </>
  );
}
