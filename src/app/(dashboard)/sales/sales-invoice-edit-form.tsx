"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SalesInvoiceEditFormProps {
  defaultValues: {
    invoiceDate: string;
    notes: string;
    paidAmount: string;
  };
  updateAction: (formData: FormData) => Promise<{ error?: Record<string, string[]> } | void>;
}

export function SalesInvoiceEditForm({
  defaultValues,
  updateAction,
}: SalesInvoiceEditFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    setSubmitting(true);
    const result = await updateAction(formData);
    setSubmitting(false);
    if (result?.error) {
      const err = result.error as Record<string, string[]>;
      setError(err.invoiceDate?.[0] || err.paidAmount?.[0] || err._form?.[0] || "Validation failed");
      return;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="invoiceDate">Invoice Date</Label>
          <Input
            id="invoiceDate"
            name="invoiceDate"
            type="date"
            defaultValue={defaultValues.invoiceDate}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="paidAmount">Paid Amount</Label>
          <Input
            id="paidAmount"
            name="paidAmount"
            type="number"
            step="0.01"
            min={0}
            defaultValue={defaultValues.paidAmount}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" defaultValue={defaultValues.notes} placeholder="Optional" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Update Invoice"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href="/sales">Cancel</a>
        </Button>
      </div>
    </form>
  );
}
