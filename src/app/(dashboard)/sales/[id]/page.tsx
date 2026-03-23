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
import { Badge } from "@/components/ui/badge";
import { getSalesInvoiceById, getOrgForInvoice } from "../actions";
import { getOrganizationId, getCurrentUser } from "@/lib/auth-utils";
import { canRecordPayments } from "@/lib/permissions";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintInvoiceButton } from "../print-invoice-button";
import { InvoicePrintLayout } from "../invoice-print-layout";
import { RecordClientPaymentDialog } from "../record-client-payment-dialog";
import { DocumentSection } from "@/app/(dashboard)/documents/document-section";
import { SubmitInvoiceButton } from "../submit-invoice-button";
import { ApproveRejectInvoice } from "../approve-reject-invoice";
import { DeleteSalesInvoiceButton } from "../delete-sales-invoice-button";
import { formatInTimezone, formatDateTimeInTimezone } from "@/lib/date-utils";

export default async function SalesInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const { id } = await params;
  const [invoice, org] = await Promise.all([
    getSalesInvoiceById(id),
    getOrgForInvoice(),
  ]);
  if (!invoice) notFound();

  const tz = org?.timezone ?? "UTC";
  const user = await getCurrentUser();
  const canRecord = canRecordPayments(user);
  const total = Number(invoice.totalAmount);
  const paid = Number(invoice.paidAmount);
  const outstanding = total - paid;

  return (
    <>
      <div className="space-y-6 print:hidden">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/sales">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sales
          </Link>
        </Button>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {invoice.invoiceNo}
            </h1>
            <p className="text-muted-foreground">
              {invoice.client.name} •{" "}
              {formatInTimezone(invoice.invoiceDate, tz)}
            </p>
          </div>
          <PrintInvoiceButton invoice={invoice} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Client</span>
              <p className="font-medium">{invoice.client.name}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Invoice Date</span>
              <p className="font-medium">
                {formatInTimezone(invoice.invoiceDate, tz)}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Due Date</span>
              <p className="font-medium">
                {invoice.dueDate
                  ? formatInTimezone(invoice.dueDate, tz)
                  : "-"}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Payment Status</span>
              <Badge
                className={
                  invoice.paymentStatus === "PAID"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                    : invoice.paymentStatus === "PARTIAL"
                    ? "bg-amber-100 text-amber-800 border-amber-200"
                    : "bg-red-100 text-red-800 border-red-200"
                }
              >
                {invoice.paymentStatus}
              </Badge>
            </div>
            {invoice.salesOrder?.quotation && (
              <div>
                <span className="text-sm text-muted-foreground">
                  From Quotation
                </span>
                <p className="font-medium">
                  <Link
                    href={`/sales/quotations/${invoice.salesOrder?.quotation.id}`}
                    className="text-primary hover:underline"
                  >
                    {invoice.salesOrder?.quotation.quotationNo}
                  </Link>
                </p>
              </div>
            )}
            <div>
              <span className="text-sm text-muted-foreground">Prepared by</span>
              <p className="font-medium">{invoice.createdBy?.name ?? "—"}</p>
            </div>
            {invoice.status === "APPROVED" && invoice.approvedBy && (
              <div>
                <span className="text-sm text-muted-foreground">Approved by</span>
                <p className="font-medium">{invoice.approvedBy.name}</p>
                {invoice.approvedAt && (
                  <p className="text-xs text-muted-foreground">
                    {formatDateTimeInTimezone(invoice.approvedAt, tz)}
                  </p>
                )}
              </div>
            )}
            {invoice.status === "REJECTED" && invoice.approvalRemarks && (
              <div>
                <span className="text-sm text-muted-foreground">Rejection reason</span>
                <p className="text-sm">{invoice.approvalRemarks}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Amounts ({invoice.currencyCode})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{Number(invoice.subtotal).toFixed(2)} {invoice.currencyCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax</span>
              <span>{Number(invoice.taxAmount).toFixed(2)} {invoice.currencyCode}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span>{Number(invoice.totalAmount).toFixed(2)} {invoice.currencyCode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid</span>
              <span>{Number(invoice.paidAmount).toFixed(2)} {invoice.currencyCode}</span>
            </div>
            {canRecord && (
              <div className="mt-4 pt-4 border-t">
                <RecordClientPaymentDialog
                  invoiceId={invoice.id}
                  invoiceNo={invoice.invoiceNo}
                  outstanding={outstanding}
                />
              </div>
            )}
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
                    <TableHead className="text-right">VAT %</TableHead>
                    <TableHead className="text-right">VAT Amount</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Gross Amount</TableHead>
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
                      {(() => {
                        const netAmount = Number(it.total ?? it.quantity * Number(it.unitPrice));
                        const taxPct = Number(it.taxPercent ?? invoice.defaultTaxPercent ?? 5);
                        const taxAmt = (netAmount * taxPct) / 100;
                        const gross = netAmount + taxAmt;
                        return (
                          <>
                            <TableCell className="text-right">
                              {taxPct.toFixed(2)}%
                            </TableCell>
                            <TableCell className="text-right">
                              {taxAmt.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              {netAmount.toFixed(2)}
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
          </CardContent>
        </Card>
      )}

      {/* Actions / approval flow (hidden during print) */}
      {invoice.status === "DRAFT" && (
        <>
          <SubmitInvoiceButton invoiceId={invoice.id} />
          <p className="text-sm text-muted-foreground">
            Submit for approval. Only Pending Approval can be approved or rejected (reject requires remarks).
          </p>
        </>
      )}

      {invoice.status === "PENDING_APPROVAL" && (
        <>
          <ApproveRejectInvoice invoiceId={invoice.id} />
          <p className="text-sm text-muted-foreground">
            Approve (optional remarks) or Reject (remarks required). Once rejected, this invoice cannot be amended.
          </p>
        </>
      )}

      {invoice.status === "REJECTED" && invoice.approvalRemarks && (
        <Card>
          <CardHeader>
            <CardTitle>Rejection reason</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{invoice.approvalRemarks}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Rejected invoices cannot be amended.
            </p>
          </CardContent>
        </Card>
      )}

      {invoice.status === "APPROVED" && invoice.approvalRemarks && (
        <Card>
          <CardHeader>
            <CardTitle>Approval remarks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{invoice.approvalRemarks}</p>
          </CardContent>
        </Card>
      )}

      {/* Optional admin action */}
      {invoice.status === "DRAFT" && (
        <DeleteSalesInvoiceButton
          invoiceId={invoice.id}
          invoiceNo={invoice.invoiceNo}
          canDelete={invoice.paymentStatus !== "PAID"}
        />
      )}
      </div>

      {/* Printable invoice - shown only when printing */}
      <div className="hidden print:block">
        <InvoicePrintLayout invoice={invoice} org={org} />
      </div>

      <div className="print:hidden">
        <DocumentSection
          documentableType="SalesInvoice"
          documentableId={invoice.id}
        />
      </div>
    </>
  );
}

