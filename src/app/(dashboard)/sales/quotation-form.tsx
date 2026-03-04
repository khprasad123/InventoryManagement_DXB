"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createQuotation } from "./actions";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { Client } from "@prisma/client";

type ItemWithStock = { id: string; sku: string; name: string; stockQty: number; sellingPrice: number };

interface QuotationFormProps {
  clients: Client[];
  items: ItemWithStock[];
  defaultQuotationNo: string;
}

type QuotationItemRow = { itemId: string; quantity: number; unitPrice: number };

export function QuotationForm({
  clients,
  items,
  defaultQuotationNo,
}: QuotationFormProps) {
  const router = useRouter();
  const [rows, setRows] = useState<QuotationItemRow[]>([
    { itemId: "", quantity: 1, unitPrice: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addRow = () =>
    setRows((r) => [...r, { itemId: "", quantity: 1, unitPrice: 0 }]);
  const removeRow = (i: number) =>
    setRows((r) => r.filter((_, idx) => idx !== i));
  const updateRow = (
    i: number,
    field: keyof QuotationItemRow,
    value: string | number
  ) =>
    setRows((r) =>
      r.map((row, idx) => (idx === i ? { ...row, [field]: value } : row))
    );

  const getItem = (itemId: string) => items.find((it) => it.id === itemId);
  const setUnitPriceFromItem = (i: number, itemId: string) => {
    const item = getItem(itemId);
    if (item) updateRow(i, "unitPrice", item.sellingPrice);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    formData.set(
      "quotationNo",
      (form.querySelector("#quotationNo") as HTMLInputElement)?.value ||
        defaultQuotationNo
    );
    formData.set(
      "quotationDate",
      (form.querySelector("#quotationDate") as HTMLInputElement)?.value ||
        new Date().toISOString().slice(0, 10)
    );
    formData.set(
      "clientId",
      (form.querySelector("#clientId") as HTMLSelectElement)?.value || ""
    );
    formData.set(
      "status",
      (form.querySelector("#status") as HTMLSelectElement)?.value || "DRAFT"
    );

    const validRows = rows.filter((r) => r.itemId && r.quantity > 0);
    if (validRows.length === 0) {
      setError("Add at least one item with quantity");
      return;
    }
    formData.set("items", JSON.stringify(validRows));

    setSubmitting(true);
    const result = await createQuotation(formData);
    setSubmitting(false);
    if (result?.error) {
      const err = result.error as Record<string, string[]>;
      setError(
        err.quotationNo?.[0] ||
          err.items?.[0] ||
          err._form?.[0] ||
          "Validation failed"
      );
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="quotationNo">Quotation Number</Label>
          <Input
            id="quotationNo"
            name="quotationNo"
            defaultValue={defaultQuotationNo}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quotationDate">Quotation Date</Label>
          <Input
            id="quotationDate"
            name="quotationDate"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="clientId">Client</Label>
          <select
            id="clientId"
            name="clientId"
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="DRAFT">Draft</option>
            <option value="APPROVED">Approved</option>
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label>Items</Label>
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
        <div className="mt-2 overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left">Item</th>
                <th className="w-20 px-4 py-2 text-right">Stock</th>
                <th className="w-24 px-4 py-2 text-right">Qty</th>
                <th className="w-32 px-4 py-2 text-right">Price</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const item = getItem(row.itemId);
                const lowStock = item && row.quantity > item.stockQty;
                return (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-4 py-2">
                      <select
                        value={row.itemId}
                        onChange={(e) => {
                          updateRow(i, "itemId", e.target.value);
                          setUnitPriceFromItem(i, e.target.value);
                        }}
                        className="flex h-9 w-full rounded border border-input bg-background px-2 text-sm"
                      >
                        <option value="">Select item</option>
                        {items.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.sku} - {it.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {item ? (
                        <span className={lowStock ? "text-destructive font-medium" : ""}>
                          {item.stockQty}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        min={1}
                        value={row.quantity}
                        onChange={(e) =>
                          updateRow(
                            i,
                            "quantity",
                            parseInt(e.target.value, 10) || 0
                          )
                        }
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={row.unitPrice}
                        onChange={(e) =>
                          updateRow(
                            i,
                            "unitPrice",
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                    </td>
                    <td>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(i)}
                        disabled={rows.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.some((r) => {
          const item = getItem(r.itemId);
          return item && r.quantity > item.stockQty;
        }) && (
          <p className="mt-2 text-sm text-amber-600">
            Some quantities exceed available stock. Convert to invoice will fail
            unless stock is replenished.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" placeholder="Optional" />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Create Quotation"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href="/sales/quotations">Cancel</a>
        </Button>
      </div>
    </form>
  );
}
