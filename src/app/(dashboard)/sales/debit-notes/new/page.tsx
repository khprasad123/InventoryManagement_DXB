import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getApprovedSalesInvoicesForDebitNotes, createSalesDebitNote } from "../actions";
import { DebitNoteForm } from "../debit-note-form";
import { redirect } from "next/navigation";

export default async function NewSalesDebitNotePage() {
  const invoices = await getApprovedSalesInvoicesForDebitNotes();
  if (!invoices.length) {
    redirect("/sales/debit-notes");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">New Debit Note</h1>
        <p className="text-muted-foreground">Create a simplified debit note and post AR + Revenue to GL.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Debit Note Details</CardTitle>
        </CardHeader>
        <CardContent>
          <DebitNoteForm
            action={createSalesDebitNote}
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

