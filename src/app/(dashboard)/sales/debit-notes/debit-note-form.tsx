"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";

type InvoiceOption = {
  id: string;
  invoiceNo: string;
  clientName: string;
  currencyCode: string;
  outstanding: number;
};

export function DebitNoteForm({
  action,
  invoices,
}: {
  action: (formData: FormData) => Promise<{ error?: Record<string, string[]> } | void>;
  invoices: InvoiceOption[];
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await action(formData);

    setSubmitting(false);
    if (result && "error" in result && result.error) {
      const err = result.error as Record<string, string[]>;
      setError(err.debitNoteNo?.[0] || err.salesInvoiceId?.[0] || err._form?.[0] || "Validation failed");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="debitNoteNo">Debit Note Number *</Label>
        <Input id="debitNoteNo" name="debitNoteNo" required maxLength={50} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="salesInvoiceId">Sales Invoice *</Label>
        <select
          id="salesInvoiceId"
          name="salesInvoiceId"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
          defaultValue=""
        >
          <option value="" disabled>
            Select an approved invoice...
          </option>
          {invoices.map((inv) => (
            <option key={inv.id} value={inv.id}>
              {inv.invoiceNo} - {inv.clientName} (Outstanding {inv.outstanding.toFixed(2)} {inv.currencyCode})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="noteDate">Date *</Label>
        <Input id="noteDate" name="noteDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount *</Label>
        <Input id="amount" name="amount" type="number" step="0.01" min="0" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="memo">Memo</Label>
        <Textarea id="memo" name="memo" placeholder="Optional" />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Posting..." : "Create Debit Note"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/sales/debit-notes">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}

