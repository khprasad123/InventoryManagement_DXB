"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPurchaseInvoice } from "./actions";
import { useRouter } from "next/navigation";
import type { Supplier, Grn } from "@prisma/client";

type GrnWithSupplier = Grn & { supplier: Supplier };

type CurrencyOption = { id: string; code: string; name: string; symbol: string | null; isDefault: boolean };

interface PurchaseInvoiceFormProps {
  suppliers: Supplier[];
  grns: GrnWithSupplier[];
  defaultInvoiceNo: string;
  currencies: CurrencyOption[];
  defaultCurrencyCode: string;
}

export function PurchaseInvoiceForm({
  suppliers,
  grns,
  defaultInvoiceNo,
  currencies,
  defaultCurrencyCode,
}: PurchaseInvoiceFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [grnId, setGrnId] = useState("");
  const [dueDatePreview, setDueDatePreview] = useState<string | null>(null);

  const supplier = suppliers.find((s) => s.id === supplierId);

  useEffect(() => {
    if (!supplier?.defaultPaymentTerms) {
      setDueDatePreview(null);
      return;
    }
    const invDate = (document.getElementById("invoiceDate") as HTMLInputElement)
      ?.value || new Date().toISOString().slice(0, 10);
    const d = new Date(invDate);
    d.setDate(d.getDate() + supplier.defaultPaymentTerms);
    setDueDatePreview(d.toLocaleDateString());
  }, [supplierId, supplier?.defaultPaymentTerms]);

  useEffect(() => {
    const el = document.getElementById("invoiceDate");
    const handler = () => {
      if (supplier?.defaultPaymentTerms) {
        const invDate = (el as HTMLInputElement)?.value || new Date().toISOString().slice(0, 10);
        const d = new Date(invDate);
        d.setDate(d.getDate() + supplier.defaultPaymentTerms);
        setDueDatePreview(d.toLocaleDateString());
      }
    };
    el?.addEventListener("change", handler);
    return () => el?.removeEventListener("change", handler);
  }, [supplier?.defaultPaymentTerms]);

  useEffect(() => {
    if (grnId) {
      const grn = grns.find((g) => g.id === grnId);
      if (grn) setSupplierId(grn.supplierId);
    }
  }, [grnId, grns]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    setSubmitting(true);
    const result = await createPurchaseInvoice(formData);
    setSubmitting(false);
    if (result?.error) {
      const err = result.error as Record<string, string[]>;
      setError(err.invoiceNo?.[0] || err._form?.[0] || "Validation failed");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="invoiceNo">Invoice Number</Label>
          <Input
            id="invoiceNo"
            name="invoiceNo"
            defaultValue={defaultInvoiceNo}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invoiceDate">Invoice Date</Label>
          <Input
            id="invoiceDate"
            name="invoiceDate"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="grnId">Link to GRN (optional)</Label>
          <select
            id="grnId"
            name="grnId"
            value={grnId}
            onChange={(e) => setGrnId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">None</option>
            {grns.map((g) => (
              <option key={g.id} value={g.id}>
                {g.grnNo} - {g.supplier.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplierId">Supplier *</Label>
          <select
            id="supplierId"
            name="supplierId"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {dueDatePreview && (
        <p className="text-sm text-muted-foreground">
          Due date will be: <strong>{dueDatePreview}</strong> (Invoice date + {supplier?.defaultPaymentTerms} days)
        </p>
      )}

      {currencies.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="currencyCode">Currency</Label>
          <select
            id="currencyCode"
            name="currencyCode"
            defaultValue={defaultCurrencyCode}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {currencies.map((c) => (
              <option key={c.id} value={c.code}>
                {c.code} – {c.name}{c.isDefault ? " (default)" : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="subtotal">Subtotal</Label>
          <Input
            id="subtotal"
            name="subtotal"
            type="number"
            step="0.01"
            min={0}
            defaultValue={0}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="taxAmount">Tax Amount</Label>
          <Input
            id="taxAmount"
            name="taxAmount"
            type="number"
            step="0.01"
            min={0}
            defaultValue={0}
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
            defaultValue={0}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" placeholder="Optional" />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create Invoice"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href="/purchases">Cancel</a>
        </Button>
      </div>
    </form>
  );
}
