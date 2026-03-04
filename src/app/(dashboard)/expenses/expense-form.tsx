"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import type { ExpenseCategory } from "@prisma/client";

interface ExpenseFormProps {
  action: (formData: FormData) => Promise<{ error?: Record<string, string[]> } | void>;
  categories: ExpenseCategory[];
  defaultValues?: {
    categoryId: string;
    amount: string;
    expenseDate: string;
    description: string;
    isRecurring: boolean;
  };
}

export function ExpenseForm({
  action,
  categories,
  defaultValues,
}: ExpenseFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const recurringEl = form.querySelector("#isRecurring") as HTMLInputElement;
    if (recurringEl?.checked) formData.set("isRecurring", "on");
    setSubmitting(true);
    const result = await action(formData);
    setSubmitting(false);
    if (result?.error) {
      const err = result.error as Record<string, string[]>;
      setError(
        err.categoryId?.[0] ||
          err.amount?.[0] ||
          err.expenseDate?.[0] ||
          err._form?.[0] ||
          "Validation failed"
      );
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="categoryId">Category *</Label>
          <select
            id="categoryId"
            name="categoryId"
            required
            defaultValue={defaultValues?.categoryId}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">Amount *</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={defaultValues?.amount}
            required
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="expenseDate">Date *</Label>
          <Input
            id="expenseDate"
            name="expenseDate"
            type="date"
            defaultValue={
              defaultValues?.expenseDate ||
              new Date().toISOString().slice(0, 10)
            }
            required
          />
        </div>
        <div className="flex items-center gap-2 pt-8">
          <input
            type="checkbox"
            id="isRecurring"
            name="isRecurring"
            defaultChecked={defaultValues?.isRecurring}
            className="h-4 w-4 rounded border-input"
          />
          <Label htmlFor="isRecurring" className="font-normal cursor-pointer">
            Recurring expense
          </Label>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          name="description"
          defaultValue={defaultValues?.description}
          placeholder="Optional"
          maxLength={1000}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : defaultValues ? "Update" : "Create"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/expenses">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
