import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApprovedSalesInvoicesForCreditNotes, createSalesCreditNote } from "../actions";
import { CreditNoteForm } from "../credit-note-form";
import { redirect } from "next/navigation";

export default async function NewSalesCreditNotePage() {
  const invoices = await getApprovedSalesInvoicesForCreditNotes();
  if (!invoices.length) {
    // No approved sales invoices to credit yet.
    redirect("/sales/credit-notes");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Credit Note</h1>
        <p className="text-muted-foreground">Create a simplified credit note and post AR + Revenue to GL.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Credit Note Details</CardTitle>
        </CardHeader>
        <CardContent>
          <CreditNoteForm
            action={createSalesCreditNote}
            invoices={invoices.map((inv) => ({
              id: inv.id,
              invoiceNo: inv.invoiceNo,
              clientName: inv.client?.name ?? "Unknown",
              currencyCode: inv.currencyCode ?? "AED",
              outstanding: Math.max(0, Number(inv.totalAmount) - Number(inv.paidAmount ?? 0)),
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

