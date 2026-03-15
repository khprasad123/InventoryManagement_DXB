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
import { createPurchaseOrder } from "@/app/(dashboard)/purchases/actions";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import type { Supplier } from "@prisma/client";

type PrWithItems = {
  id: string;
  prNo: string;
  items: Array<{
    id: string;
    itemId: string;
    quantity: number;
    item: { id: string; name: string; sku: string };
  }>;
};

type PoItemRow = { itemId: string; quantity: number; unitPrice: number };

export function PoForm({
  prs,
  suppliers,
  defaultPoNo,
  defaultPrId,
}: {
  prs: PrWithItems[];
  suppliers: Supplier[];
  defaultPoNo: string;
  defaultPrId?: string;
}) {
  const NONE_PR = "__none__";
  const NONE_SUPPLIER = "__none__";
  const router = useRouter();
  const [prId, setPrId] = useState(defaultPrId && prs.some((p) => p.id === defaultPrId) ? defaultPrId : NONE_PR);
  const [supplierId, setSupplierId] = useState(NONE_SUPPLIER);
  const [rows, setRows] = useState<PoItemRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPr = prId && prId !== NONE_PR ? prs.find((p) => p.id === prId) : undefined;

  useEffect(() => {
    if (selectedPr) {
      setRows(
        selectedPr.items.map((i) => ({
          itemId: i.itemId,
          quantity: i.quantity,
          unitPrice: 0,
        }))
      );
    } else {
      setRows([]);
    }
  }, [selectedPr]);

  const removeRow = (i: number) =>
    setRows((r) => r.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof PoItemRow, value: number) =>
    setRows((r) =>
      r.map((row, idx) =>
        idx === i ? { ...row, [field]: value } : row
      )
    );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.target as HTMLFormElement;
    const formData = new FormData();
    formData.set("purchaseRequestId", prId === NONE_PR ? "" : prId);
    formData.set("supplierId", supplierId);
    formData.set("poNo", (form.querySelector("#poNo") as HTMLInputElement)?.value || defaultPoNo);
    formData.set("orderDate", (form.querySelector("#orderDate") as HTMLInputElement)?.value || new Date().toISOString().slice(0, 10));
    formData.set("notes", (form.querySelector("#notes") as HTMLInputElement)?.value || "");

    const validRows = rows.filter((r) => r.itemId && r.quantity > 0 && r.unitPrice >= 0);
    if (validRows.length === 0) {
      setError("Select a PR and ensure all items have valid quantity and price");
      return;
    }
    if (!prId || prId === NONE_PR || !supplierId || supplierId === NONE_SUPPLIER) {
      setError("Select PR and supplier");
      return;
    }
    formData.set("items", JSON.stringify(validRows));

    setSubmitting(true);
    const result = await createPurchaseOrder(formData);
    setSubmitting(false);
    if (result?.error) {
      const err = result.error as Record<string, string[]>;
      setError(err.poNo?.[0] || err.items?.[0] || err._form?.[0] || "Validation failed");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pr">Purchase Request *</Label>
          <Select value={prId} onValueChange={setPrId} required>
            <SelectTrigger>
              <SelectValue placeholder="Select PR" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_PR}>Select PR</SelectItem>
              {prs.map((pr) => (
                <SelectItem key={pr.id} value={pr.id}>
                  {pr.prNo} ({pr.items.length} items)
                </SelectItem>
              ))}
              {prs.length === 0 && (
                <div className="px-2 py-4 text-sm text-muted-foreground">
                  No approved PRs. Approve a PR first.
                </div>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplier">Supplier *</Label>
          <Select value={supplierId} onValueChange={setSupplierId} required>
            <SelectTrigger>
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_SUPPLIER}>Select supplier</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="poNo">PO Number</Label>
          <Input id="poNo" name="poNo" defaultValue={defaultPoNo} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="orderDate">Order Date</Label>
          <Input
            id="orderDate"
            name="orderDate"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" placeholder="Optional" />
      </div>

      {selectedPr && rows.length > 0 && (
        <div>
          <div className="flex items-center justify-between">
            <Label>Items (from PR – edit qty/price, remove to fulfill via another PO)</Label>
          </div>
          <div className="mt-2 rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2 text-left">Item</th>
                  <th className="px-4 py-2 text-right w-24">Qty</th>
                  <th className="px-4 py-2 text-right w-32">Unit Price</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const prItem = selectedPr.items.find((it) => it.itemId === row.itemId);
                  return (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-4 py-2">
                        {prItem?.item.sku} - {prItem?.item.name}
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          min={1}
                          value={row.quantity}
                          onChange={(e) =>
                            updateRow(i, "quantity", parseInt(e.target.value, 10) || 0)
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
                            updateRow(i, "unitPrice", parseFloat(e.target.value) || 0)
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
                          title="Remove – fulfill via another PO"
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
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-4">
        <Button type="submit" disabled={submitting || prs.length === 0}>
          {submitting ? "Saving..." : "Create PO"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href="/purchases/purchase-orders">Cancel</a>
        </Button>
      </div>
    </form>
  );
}
