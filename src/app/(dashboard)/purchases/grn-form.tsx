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
import { createGrn } from "./actions";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { Supplier, Item } from "@prisma/client";

type PurchaseOrderWithItems = {
  id: string;
  poNo: string;
  supplierId: string;
  supplier: Supplier;
  items: Array<{
    itemId: string;
    quantity: number;
    unitPrice: { toString: () => string } | number;
    item: Item;
  }>;
};

interface GrnFormProps {
  suppliers: Supplier[];
  items: Item[];
  purchaseOrders: PurchaseOrderWithItems[];
  defaultGrnNo: string;
  defaultPoId?: string;
}

type GrnItemRow = { itemId: string; quantity: number; purchasePrice: number };

export function GrnForm({
  suppliers,
  items,
  purchaseOrders,
  defaultGrnNo,
  defaultPoId,
}: GrnFormProps) {
  const router = useRouter();
  const [poId, setPoId] = useState(defaultPoId || "");
  const [supplierId, setSupplierId] = useState("");
  const [rows, setRows] = useState<GrnItemRow[]>([
    { itemId: "", quantity: 1, purchasePrice: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPo = purchaseOrders.find((p) => p.id === poId);

  useEffect(() => {
    if (selectedPo) {
      setSupplierId(selectedPo.supplierId);
      setRows(
        selectedPo.items.map((i) => ({
          itemId: i.itemId,
          quantity: i.quantity,
          purchasePrice: Number(i.unitPrice),
        }))
      );
    } else {
      setSupplierId("");
    }
  }, [selectedPo]);

  const addRow = () =>
    setRows((r) => [...r, { itemId: "", quantity: 1, purchasePrice: 0 }]);
  const removeRow = (i: number) =>
    setRows((r) => r.filter((_, idx) => idx !== i));
  const updateRow = (i: number, field: keyof GrnItemRow, value: string | number) =>
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
    formData.set("grnNo", (form.querySelector("#grnNo") as HTMLInputElement)?.value || defaultGrnNo);
    formData.set("receivedDate", (form.querySelector("#receivedDate") as HTMLInputElement)?.value || new Date().toISOString().slice(0, 10));
    formData.set("supplierId", supplierId);
    if (poId) formData.set("purchaseOrderId", poId);

    const validRows = rows.filter((r) => r.itemId && r.quantity > 0);
    if (validRows.length === 0) {
      setError("Add at least one item with quantity");
      return;
    }
    formData.set("items", JSON.stringify(validRows));

    setSubmitting(true);
    const result = await createGrn(formData);
    setSubmitting(false);
    if (result?.error) {
      const err = result.error as Record<string, string[]>;
      setError(err.grnNo?.[0] || err.items?.[0] || err._form?.[0] || "Validation failed");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="grnNo">GRN Number</Label>
          <Input
            id="grnNo"
            name="grnNo"
            defaultValue={defaultGrnNo}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="receivedDate">Received Date</Label>
          <Input
            id="receivedDate"
            name="receivedDate"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            required
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="poId">From Purchase Order (optional)</Label>
          <Select value={poId} onValueChange={setPoId}>
            <SelectTrigger>
              <SelectValue placeholder="Standalone or from PO" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Standalone GRN</SelectItem>
              {purchaseOrders.map((po) => (
                <SelectItem key={po.id} value={po.id}>
                  {po.poNo} - {po.supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="supplierId">Supplier *</Label>
          <select
            id="supplierId"
            name="supplierId"
            required
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {selectedPo && (
            <p className="text-xs text-muted-foreground">Pre-filled from PO</p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" placeholder="Optional" />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label>Items</Label>
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
        <div className="mt-2 rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2 text-left">Item</th>
                <th className="px-4 py-2 text-right w-24">Qty</th>
                <th className="px-4 py-2 text-right w-32">Price</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-4 py-2">
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
                      value={row.purchasePrice}
                      onChange={(e) =>
                        updateRow(i, "purchasePrice", parseFloat(e.target.value) || 0)
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Create GRN"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href="/purchases/grn">Cancel</a>
        </Button>
      </div>
    </form>
  );
}
