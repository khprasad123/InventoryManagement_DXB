"use client";

import { useMemo, useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Plus } from "lucide-react";

const MAX_LINES = 10;

type GlAccountOption = { id: string; code: string; name: string };

type LineRow = {
  accountId: string;
  description: string;
  debit: string;
  credit: string;
};

export function JournalForm({
  action,
  accounts,
}: {
  action: (formData: FormData) => Promise<{ error?: Record<string, string[]> } | void>;
  accounts: GlAccountOption[];
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<LineRow[]>([
    { accountId: "", description: "", debit: "", credit: "" },
    { accountId: "", description: "", debit: "", credit: "" },
  ]);

  const totals = useMemo(() => {
    const sumDebit = rows.reduce((sum, r) => sum + (r.debit ? Number(r.debit) : 0), 0);
    const sumCredit = rows.reduce((sum, r) => sum + (r.credit ? Number(r.credit) : 0), 0);
    return {
      sumDebit: Number.isFinite(sumDebit) ? sumDebit : 0,
      sumCredit: Number.isFinite(sumCredit) ? sumCredit : 0,
    };
  }, [rows]);

  function setLine(index: number, patch: Partial<LineRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("lineCount", String(rows.length));
    for (let i = 0; i < rows.length; i++) {
      formData.set(`line_${i}_accountId`, rows[i].accountId);
      formData.set(`line_${i}_description`, rows[i].description);
      formData.set(`line_${i}_debit`, rows[i].debit);
      formData.set(`line_${i}_credit`, rows[i].credit);
    }

    setSubmitting(true);
    const result = await action(formData);
    setSubmitting(false);

    if (result?.error) {
      const err = result.error as Record<string, string[]>;
      setError(
        err._form?.[0] ||
          err.entryDate?.[0] ||
          err.accountId?.[0] ||
          Object.values(err)[0]?.[0] ||
          "Validation failed"
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="entryDate">Entry Date *</Label>
          <Input id="entryDate" name="entryDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="memo">Memo</Label>
          <Input id="memo" name="memo" placeholder="Optional description" />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[260px]">GL Account *</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right w-[140px]">Debit</TableHead>
              <TableHead className="text-right w-[140px]">Credit</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, idx) => (
              <TableRow key={idx}>
                <TableCell>
                  <Select value={r.accountId} onValueChange={(v) => setLine(idx, { accountId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select GL account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.code} - {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input value={r.description} onChange={(e) => setLine(idx, { description: e.target.value })} placeholder="Line memo (optional)" />
                </TableCell>
                <TableCell>
                  <Input
                    className="text-right"
                    type="number"
                    step="0.01"
                    min="0"
                    value={r.debit}
                    onChange={(e) => {
                      const next = e.target.value;
                      const numeric = Number(next);
                      setLine(idx, { debit: next, credit: numeric > 0 ? "" : r.credit });
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    className="text-right"
                    type="number"
                    step="0.01"
                    min="0"
                    value={r.credit}
                    onChange={(e) => {
                      const next = e.target.value;
                      const numeric = Number(next);
                      setLine(idx, { credit: next, debit: numeric > 0 ? "" : r.debit });
                    }}
                  />
                </TableCell>
                <TableCell>
                  {rows.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
                      className="h-8 w-8 text-destructive"
                      title="Remove line"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          Total Debits: <span className="font-medium text-foreground">{totals.sumDebit.toFixed(2)}</span> &nbsp;|&nbsp; Total Credits:{" "}
          <span className="font-medium text-foreground">{totals.sumCredit.toFixed(2)}</span>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              setRows((prev) =>
                prev.length >= MAX_LINES ? prev : [...prev, { accountId: "", description: "", debit: "", credit: "" }]
              )
            }
            disabled={rows.length >= MAX_LINES}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Line
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Create Journal Entry"}
        </Button>
        <Button type="button" variant="outline" onClick={() => window.history.back()} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

