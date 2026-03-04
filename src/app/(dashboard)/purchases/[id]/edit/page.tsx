import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPurchaseInvoiceById, getNextInvoiceNo, updatePurchaseInvoice, getGrns } from "../../actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { getSuppliers } from "@/app/(dashboard)/suppliers/actions";
import { getOrganizationCurrencies, getDefaultCurrencyCodeForOrg } from "@/lib/currency";
import { PurchaseInvoiceForm } from "../../purchase-invoice-form";
import { redirect, notFound } from "next/navigation";

export default async function EditPurchaseInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const { id } = await params;
  const invoice = await getPurchaseInvoiceById(id);
  if (!invoice) notFound();

  const [suppliers, grns, nextInvoiceNo, currencies, defaultCurrencyCode] = await Promise.all([
    getSuppliers(),
    getGrns(),
    getNextInvoiceNo(),
    getOrganizationCurrencies(orgId),
    getDefaultCurrencyCodeForOrg(orgId),
  ]);

  const defaultValues = {
    invoiceNo: invoice.invoiceNo,
    invoiceDate: new Date(invoice.invoiceDate).toISOString().slice(0, 10),
    supplierId: invoice.supplierId,
    grnId: invoice.grnId ?? "",
    subtotal: Number(invoice.subtotal),
    taxAmount: Number(invoice.taxAmount),
    paidAmount: Number(invoice.paidAmount),
    currencyCode: invoice.currencyCode,
    notes: invoice.notes ?? undefined,
  };

  async function updateAction(formData: FormData) {
    "use server";
    return updatePurchaseInvoice(id, formData);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Purchase Invoice</h1>
        <p className="text-muted-foreground">Update {invoice.invoiceNo}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <PurchaseInvoiceForm
            suppliers={suppliers}
            grns={grns}
            defaultInvoiceNo={nextInvoiceNo}
            currencies={currencies}
            defaultCurrencyCode={defaultCurrencyCode}
            mode="edit"
            defaultValues={defaultValues}
            updateAction={updateAction}
          />
        </CardContent>
      </Card>
    </div>
  );
}
