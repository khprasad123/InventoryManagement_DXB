import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSalesInvoiceById, updateSalesInvoice } from "../../actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect, notFound } from "next/navigation";
import { SalesInvoiceEditForm } from "../../sales-invoice-edit-form";

export default async function EditSalesInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const { id } = await params;
  const invoice = await getSalesInvoiceById(id);
  if (!invoice) notFound();
  if (invoice.status !== "DRAFT") notFound();

  const defaultValues = {
    invoiceDate: new Date(invoice.invoiceDate).toISOString().slice(0, 10),
    notes: invoice.notes ?? "",
    paidAmount: Number(invoice.paidAmount).toString(),
    taxPercent: Number(invoice.defaultTaxPercent ?? 5),
  };

  async function updateAction(formData: FormData) {
    "use server";
    return updateSalesInvoice(id, formData);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Sales Invoice</h1>
        <p className="text-muted-foreground">
          Update {invoice.invoiceNo}. Line items cannot be changed here; use
          payments to update paid amount.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <SalesInvoiceEditForm
            defaultValues={defaultValues}
            updateAction={updateAction}
          />
        </CardContent>
      </Card>
    </div>
  );
}
