"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CurrencyOption = { id: string; code: string; name: string; symbol: string | null; isDefault: boolean };

export function BankAccountForm({
  action,
  currencies,
  defaultCurrencyCode,
}: {
  action: (formData: FormData) => Promise<{ error?: Record<string, string[]> } | void>;
  currencies: CurrencyOption[];
  defaultCurrencyCode: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    setSubmitting(true);
    const result = await action(formData);
    setSubmitting(false);

    if (result?.error) {
      const err = result.error as Record<string, string[]>;
      setError(err.name?.[0] || err._form?.[0] || "Validation failed");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Account Name *</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currencyCode">Currency *</Label>
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bankName">Bank Name</Label>
          <Input id="bankName" name="bankName" placeholder="Optional" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="accountNumberMasked">Account Number (Masked)</Label>
          <Input id="accountNumberMasked" name="accountNumberMasked" placeholder="Optional" />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Create Account"}
        </Button>
        <Button type="button" variant="outline" onClick={() => window.history.back()} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

