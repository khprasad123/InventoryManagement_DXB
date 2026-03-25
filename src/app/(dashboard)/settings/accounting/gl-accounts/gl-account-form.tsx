"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { GlAccountType, GlNormalSide } from "@prisma/client";

export function GlAccountForm({
  action,
  defaultValues,
  accountId,
}: {
  action: (formData: FormData) => Promise<{ error?: Record<string, string[]> } | void>;
  defaultValues?: {
    code?: string | null;
    name?: string | null;
    type?: GlAccountType | string;
    normalSide?: GlNormalSide | string;
    isTaxAccount?: boolean;
  };
  accountId?: string;
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
      setError(err._form?.[0] || err.code?.[0] || err.name?.[0] || err.type?.[0] || err.normalSide?.[0] || "Validation failed");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {accountId && <input type="hidden" name="accountId" value={accountId} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="code">Code *</Label>
          <Input id="code" name="code" required defaultValue={defaultValues?.code ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input id="name" name="name" required defaultValue={defaultValues?.name ?? ""} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type">Account Type *</Label>
          <select id="type" name="type" required defaultValue={String(defaultValues?.type ?? "")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="" disabled>
              Select type
            </option>
            <option value="ASSET">ASSET</option>
            <option value="LIABILITY">LIABILITY</option>
            <option value="EQUITY">EQUITY</option>
            <option value="REVENUE">REVENUE</option>
            <option value="EXPENSE">EXPENSE</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="normalSide">Normal Side *</Label>
          <select id="normalSide" name="normalSide" required defaultValue={String(defaultValues?.normalSide ?? "")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="" disabled>
              Select side
            </option>
            <option value="DEBIT">DEBIT</option>
            <option value="CREDIT">CREDIT</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input type="checkbox" id="isTaxAccount" name="isTaxAccount" defaultChecked={Boolean(defaultValues?.isTaxAccount)} className="h-4 w-4 rounded border-input" />
        <Label htmlFor="isTaxAccount" className="font-normal cursor-pointer">
          Tax account
        </Label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : defaultValues ? "Save Changes" : "Create Account"}
        </Button>
        <Button type="button" variant="outline" onClick={() => window.history.back()} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

