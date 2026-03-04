"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ExpenseCategory } from "@prisma/client";

interface ExpenseCategoryFormProps {
  category?: ExpenseCategory | null;
  onSubmit: (formData: FormData) => Promise<{ error?: Record<string, string[]> } | void>;
  cancelHref: string;
  submitLabel: string;
}

export function ExpenseCategoryForm({
  category,
  onSubmit,
  cancelHref,
  submitLabel,
}: ExpenseCategoryFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.target as HTMLFormElement;
    setSubmitting(true);
    const result = await onSubmit(new FormData(form));
    setSubmitting(false);
    if (result?.error) {
      const err = result.error as Record<string, string[]>;
      setError(err.name?.[0] || err._form?.[0] || "Validation failed");
      return;
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          name="name"
          defaultValue={category?.name ?? ""}
          required
          maxLength={100}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          name="description"
          defaultValue={category?.description ?? ""}
          placeholder="Optional"
          maxLength={500}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : submitLabel}
        </Button>
        <Button type="button" variant="outline" asChild>
          <a href={cancelHref}>Cancel</a>
        </Button>
      </div>
    </form>
  );
}
