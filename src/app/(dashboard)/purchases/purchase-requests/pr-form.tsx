"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPurchaseRequest, updatePurchaseRequest } from "../actions";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { Item } from "@prisma/client";

type PrItemRow = { itemId: string; quantity: number };

type SalesOrderWithItems = {
  id: string;
  orderNo: string;
  jobId: string;
  quotation?: { client?: { name: string } };
  items: Array<{ itemId: string; quantity: number; item: { sku: string; name: string } }>;
};

type InitialPr = {
  id: string;
  prNo: string;
  notes: string | null;
  salesOrderId: string | null;
  jobId: string | null;
  items: Array<{ itemId: string; quantity: number }>;
};

export function PrForm({
  items,
  salesOrders = [],
  defaultPrNo,
  initialPr,
}: {
  items: Item[];
  salesOrders?: SalesOrderWithItems[];
  defaultPrNo: string;
  initialPr?: InitialPr;
}) {
  const router = useRouter();
  const NONE_SO_VALUE = "__none__";
  const [salesOrderId, setSalesOrderId] = useState(
    initialPr?.salesOrderId && initialPr.salesOrderId !== "" ? initialPr.salesOrderId : NONE_SO_VALUE
  );
  const [rows, setRows] = useState<PrItemRow[]>(
    initialPr?.items?.length
      ? initialPr.items.map((i) => ({ itemId: i.itemId, quantity: i.quantity }))
      : [{ itemId: "", quantity: 1 }]
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSo = salesOrders.find((s) => s.id === salesOrderId);
  const isLocked = salesOrderId !== NONE_SO_VALUE && Boolean(salesOrderId);

  useEffect(() => {
    if (initialPr) return;
    if (selectedSo && selectedSo.items.length > 0) {
      setRows(
        selectedSo.items.map((i) => ({
          itemId: i.itemId,
          quantity: i.quantity,
        }))
      );
    } else if (salesOrderId === NONE_SO_VALUE) {
      setRows([{ itemId: "", quantity: 1 }]);
    }
  }, [salesOrderId, selectedSo, initialPr]);

  const addRow = () => setRows((r) => [...r, { itemId: "", quantity: 1 }]);
  const removeRow = (i: number) =>
    setRows((r) => r.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof PrItemRow, value: string | number) =>
    setRows((r) =>
      r.map((row, idx) =>
        idx === i ? { ...row, [field]: value } : row
      )
    );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    formData.set("prNo", (form.querySelector("#prNo") as HTMLInputElement)?.value || defaultPrNo);
    formData.set("notes", (form.querySelector("#notes") as HTMLInputElement)?.value || "");
    if (salesOrderId && salesOrderId !== NONE_SO_VALUE) formData.set("salesOrderId", salesOrderId);
    formData.set("jobId", (form.querySelector("#jobId") as HTMLInputElement)?.value || "");

    const validRows = rows.filter((r) => r.itemId && r.quantity > 0);
    if (validRows.length === 0) {
      setError("Add at least one item with quantity");
      return;
    }
    const merged = validRows.reduce(
      (acc, r) => {
        const existing = acc.find((x) => x.itemId === r.itemId);
        if (existing) existing.quantity += r.quantity;
        else acc.push({ ...r });
        return acc;
      },
      [] as { itemId: string; quantity: number }[]
    );
    formData.set("items", JSON.stringify(merged));

    setSubmitting(true);
    const result = initialPr
      ? await updatePurchaseRequest(initialPr.id, formData)
      : await createPurchaseRequest(formData);
    setSubmitting(false);
    if (result?.error) {
      const err = result.error as Record<string, string[]>;
      setError(err.prNo?.[0] || err.items?.[0] || err._form?.[0] || "Validation failed");
      return;
    }
    router.push("/purchases/purchase-requests");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="prNo">PR Number</Label>
          <Input id="prNo" name="prNo" defaultValue={initialPr?.prNo ?? defaultPrNo} required />
        </div>
        <div className="space-y-2">
          <Label>Tag Sales Order (optional)</Label>
          <Select value={salesOrderId} onValueChange={setSalesOrderId}>
            <SelectTrigger>
              <SelectValue placeholder="None – manual items" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_SO_VALUE}>None – manual items</SelectItem>
              {salesOrders.map((so) => (
                <SelectItem key={so.id} value={so.id}>
                  {so.orderNo} – {so.jobId || "—"} ({so.quotation?.client?.name || "—"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isLocked && (
            <p className="text-xs text-amber-600">Items locked when Sales Order is tagged</p>
          )}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="jobId">Job ID (optional)</Label>
          <Input
            id="jobId"
            name="jobId"
            placeholder="Job reference"
            defaultValue={selectedSo?.jobId}
            disabled={isLocked}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" placeholder="Optional" defaultValue={initialPr?.notes ?? ""} />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Items (no prices at PR stage)</Label>
            <p className="text-xs text-muted-foreground">
              {isLocked
                ? "Items from Sales Order – cannot edit."
                : "One item per line. Duplicate items merged automatically."}
            </p>
          </div>
          {!isLocked && (
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Button>
          )}
        </div>
        <div className="mt-2 rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left">Item</th>
                <th className="px-4 py-2 text-right w-24">Qty</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const soItem = selectedSo?.items.find((x) => x.itemId === row.itemId);
                return (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-4 py-2">
                      {isLocked && soItem ? (
                        <span className="text-sm">
                          {soItem.item.sku} - {soItem.item.name}
                        </span>
                      ) : (
                        <select
                          value={row.itemId}
                          onChange={(e) => updateRow(i, "itemId", e.target.value)}
                          className="flex h-9 w-full rounded border border-input bg-background px-2 text-sm"
                        >
                          <option value="">Select item</option>
                          {items.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.sku} - {it.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {isLocked ? (
                        <span className="text-sm">{row.quantity}</span>
                      ) : (
                        <Input
                          type="number"
                          min={1}
                          value={row.quantity}
                          onChange={(e) =>
                            updateRow(i, "quantity", parseInt(e.target.value, 10) || 0)
                          }
                        />
                      )}
                    </td>
                    <td>
                      {!isLocked && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(i)}
                          disabled={rows.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : initialPr ? "Update PR" : "Create PR"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href="/purchases/purchase-requests">Cancel</a>
        </Button>
      </div>
    </form>
  );
}
