"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSalesInvoice, createInvoiceFromSalesOrder } from "./actions";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

type ItemWithStock = {
  id: string;
  sku: string;
  name: string;
  stockQty: number;
  sellingPrice: number;
};

type QuotationOption = {
  id: string;
  quotationNo: string;
  clientId: string;
  items: { itemId: string; quantity: number; unitPrice: number }[];
};

type CurrencyOption = {
  id: string;
  code: string;
  name: string;
  symbol: string | null;
  isDefault: boolean;
};

type SalesOrderOption = {
  id: string;
  orderNo: string;
  clientName: string;
  jobId: string;
  itemCount: number;
};

interface SalesInvoiceFormProps {
  clients: Array<{
    id: string;
    name: string;
    agreedDueDays: number | null;
    defaultPaymentTerms: string | null;
  }>;
  items: ItemWithStock[];
  quotations: QuotationOption[];
  salesOrders: SalesOrderOption[];
  defaultInvoiceNo: string;
  currencies: CurrencyOption[];
  defaultCurrencyCode: string;
  defaultTaxPercent: number;
}

type InvoiceItemRow = { itemId: string; quantity: number; unitPrice: number };

export function SalesInvoiceForm({
  clients,
  items,
  quotations,
  salesOrders,
  defaultInvoiceNo,
  currencies,
  defaultCurrencyCode,
  defaultTaxPercent,
}: SalesInvoiceFormProps) {
  const router = useRouter();
  const [invoiceSource, setInvoiceSource] = useState<"ad_hoc" | "sales_order">("ad_hoc");
  const [salesOrderId, setSalesOrderId] = useState("");
  const [rows, setRows] = useState<InvoiceItemRow[]>([
    { itemId: "", quantity: 1, unitPrice: 0 },
  ]);
  const [quotationId, setQuotationId] = useState("");
  const [clientId, setClientId] = useState("");
  const [sendForApproval, setSendForApproval] = useState(false);
  const [vatPercent, setVatPercent] = useState(defaultTaxPercent);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dueDatePreview, setDueDatePreview] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");

  const filteredClients = clientSearch.trim()
    ? clients.filter((c) => c.name.toLowerCase().includes(clientSearch.trim().toLowerCase()))
    : clients;
  const selectedClient =
    clientId && clientId !== "" ? clients.find((c) => c.id === clientId) : undefined;
  const optionClients =
    selectedClient && clientSearch.trim() && !filteredClients.some((c) => c.id === selectedClient.id)
      ? [selectedClient, ...filteredClients]
      : filteredClients;

  const filteredItems = itemSearch.trim()
    ? items.filter((it) => `${it.sku} ${it.name}`.toLowerCase().includes(itemSearch.trim().toLowerCase()))
    : items;

  const client = clients.find((c) => c.id === clientId);
  const getItem = (itemId: string) => items.find((it) => it.id === itemId);

  const subtotalPreview = rows
    .filter((r) => r.itemId && r.quantity > 0)
    .reduce((s, r) => s + r.quantity * r.unitPrice, 0);
  const taxAmountPreview = (subtotalPreview * vatPercent) / 100;

  useEffect(() => {
    if (quotationId) {
      const q = quotations.find((q) => q.id === quotationId);
      if (q) {
        setClientId(q.clientId);
        setRows(
          q.items.map((i) => ({
            itemId: i.itemId,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
          }))
        );
      }
    }
  }, [quotationId, quotations]);

  useEffect(() => {
    if (!client?.defaultPaymentTerms) {
      setDueDatePreview(null);
      return;
    }
    const invDate =
      (document.getElementById("invoiceDate") as HTMLInputElement)?.value ||
      new Date().toISOString().slice(0, 10);
    const d = new Date(invDate);
    d.setDate(d.getDate() + (client.agreedDueDays ?? 30));
    setDueDatePreview(d.toLocaleDateString());
  }, [clientId, client?.agreedDueDays, client?.defaultPaymentTerms]);

  useEffect(() => {
    const el = document.getElementById("invoiceDate");
    const handler = () => {
      if (client && client.agreedDueDays != null) {
        const invDate =
          (el as HTMLInputElement)?.value ||
          new Date().toISOString().slice(0, 10);
        const d = new Date(invDate);
        d.setDate(d.getDate() + client.agreedDueDays);
        setDueDatePreview(d.toLocaleDateString());
      }
    };
    el?.addEventListener("change", handler);
    return () => el?.removeEventListener("change", handler);
  }, [client]);

  const addRow = () =>
    setRows((r) => [...r, { itemId: "", quantity: 1, unitPrice: 0 }]);
  const removeRow = (i: number) =>
    setRows((r) => r.filter((_, idx) => idx !== i));
  const updateRow = (
    i: number,
    field: keyof InvoiceItemRow,
    value: string | number
  ) =>
    setRows((r) =>
      r.map((row, idx) => (idx === i ? { ...row, [field]: value } : row))
    );
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
      "invoiceNo",
      (form.querySelector("#invoiceNo") as HTMLInputElement)?.value ||
        defaultInvoiceNo
    );
    formData.set(
      "invoiceDate",
      (form.querySelector("#invoiceDate") as HTMLInputElement)?.value ||
        new Date().toISOString().slice(0, 10)
    );
    formData.set(
      "clientId",
      (form.querySelector("#clientId") as HTMLSelectElement)?.value || ""
    );
    formData.set("quotationId", quotationId || "");
    const subtotal = rows
      .filter((r) => r.itemId && r.quantity > 0)
      .reduce((s, r) => s + r.quantity * r.unitPrice, 0);
    const taxAmount = (subtotal * vatPercent) / 100;

    formData.set("subtotal", subtotal.toString());
    formData.set("taxPercent", vatPercent.toString());
    formData.set("taxAmount", taxAmount.toString());

    const validRows = rows.filter((r) => r.itemId && r.quantity > 0);
    if (validRows.length === 0) {
      setError("Add at least one item with quantity");
      return;
    }
    formData.set("items", JSON.stringify(validRows));

    setSubmitting(true);
    const result = await createSalesInvoice(formData);
    setSubmitting(false);
    if (result?.error) {
      const err = result.error as Record<string, string[]>;
      setError(
        err.invoiceNo?.[0] ||
          err._form?.[0] ||
          "Validation failed"
      );
      return;
    }
    router.refresh();
  }

  async function handleCreateFromSalesOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!salesOrderId) {
      setError("Select a Sales Order");
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await createInvoiceFromSalesOrder(salesOrderId, sendForApproval);
    setSubmitting(false);
    if (result?.error) {
      setError(String(result.error));
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 border-b pb-4">
        <Label className="sr-only">Invoice source</Label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setInvoiceSource("ad_hoc");
              setError(null);
            }}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              invoiceSource === "ad_hoc"
                ? "border-primary bg-primary/10 text-primary"
                : "border-input bg-background hover:bg-muted/50"
            }`}
          >
            Ad hoc (editable items)
          </button>
          <button
            type="button"
            onClick={() => {
              setInvoiceSource("sales_order");
              setSalesOrderId(salesOrders[0]?.id ?? "");
              setError(null);
            }}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              invoiceSource === "sales_order"
                ? "border-primary bg-primary/10 text-primary"
                : "border-input bg-background hover:bg-muted/50"
            }`}
          >
            From Sales Order (locked)
          </button>
        </div>
      </div>

      {invoiceSource === "sales_order" && (
        <form onSubmit={handleCreateFromSalesOrder} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Item list and quantities are locked from the Sales Order. You cannot edit them.
          </p>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={sendForApproval}
              onChange={(e) => setSendForApproval(e.target.checked)}
            />
            Send invoice for approval
          </label>
          <div className="space-y-2">
            <Label htmlFor="salesOrderId">Sales Order *</Label>
            <select
              id="salesOrderId"
              value={salesOrderId}
              onChange={(e) => setSalesOrderId(e.target.value)}
              className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">Select Sales Order</option>
              {salesOrders.map((so) => (
                <option key={so.id} value={so.id}>
                  {so.orderNo} – {so.clientName} ({so.itemCount} items)
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={submitting || !salesOrderId}>
            {submitting ? "Creating…" : "Create Invoice from Sales Order"}
          </Button>
        </form>
      )}

      {invoiceSource === "ad_hoc" && (
    <form onSubmit={handleSubmit} className="space-y-6">
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={sendForApproval}
          onChange={(e) => setSendForApproval(e.target.checked)}
          name="sendForApproval"
        />
        Send invoice for approval
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="quotationId">From Quotation (optional prefill)</Label>
          <select
            id="quotationId"
            value={quotationId}
            onChange={(e) => setQuotationId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">None - Add items manually</option>
            {quotations.map((q) => (
              <option key={q.id} value={q.id}>
                {q.quotationNo}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
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
                  {c.code} – {c.name}
                  {c.isDefault ? " (default)" : ""}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="clientId">Client *</Label>
          <Input
            id="clientSearch"
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            placeholder="Search client..."
          />
          <select
            id="clientId"
            name="clientId"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select client</option>
            {optionClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="vatPercent">VAT %</Label>
          <Input
            id="vatPercent"
            type="number"
            step="0.01"
            min={0}
            max={100}
            value={vatPercent}
            onChange={(e) => setVatPercent(Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label>VAT Amount (preview)</Label>
          <p className="text-sm text-muted-foreground">
            {taxAmountPreview.toFixed(2)}
          </p>
        </div>
      </div>

      {dueDatePreview && (
        <p className="text-sm text-muted-foreground">
          Due date: <strong>{dueDatePreview}</strong> (Invoice date +{" "}
          {client?.defaultPaymentTerms ?? 30} days)
        </p>
      )}

      <div>
        <div className="flex items-center justify-between">
          <Label>Items</Label>
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        </div>
        <div className="mt-2">
          <Input
            value={itemSearch}
            onChange={(e) => setItemSearch(e.target.value)}
            placeholder="Search items by SKU or name..."
          />
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
                const selectedItemOption =
                  row.itemId && itemSearch.trim() && item && !filteredItems.some((it) => it.id === item.id)
                    ? [item, ...filteredItems]
                    : filteredItems;
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
                        {selectedItemOption.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.sku} - {it.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {item ? (
                        <span
                          className={
                            lowStock ? "font-medium text-destructive" : ""
                          }
                        >
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
          <p className="mt-2 text-sm text-destructive">
            Some quantities exceed available stock. Sale will be blocked.
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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

      <div className="space-y-2">
        <Label htmlFor="attachment">Attachment</Label>
        <Input id="attachment" name="attachment" type="file" />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating..." : "Create Invoice"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href="/sales">Cancel</a>
        </Button>
      </div>
    </form>
      )}
    </div>
  );
}
