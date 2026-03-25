"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BankStatementImportForm({
  action,
  bankAccountId,
}: {
  action: (formData: FormData) => Promise<{ error?: Record<string, string[]>; imported?: number } | void>;
  bankAccountId: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const result = await action(formData);
    setSubmitting(false);

    if (result?.error) {
      const err = result.error as Record<string, string[]>;
      setError(err.file?.[0] || err.statementDate?.[0] || err.bankAccountId?.[0] || err._form?.[0] || "Import failed");
      return;
    }

    if (typeof result?.imported === "number") {
      setSuccess(`Imported ${result.imported} transaction(s).`);
    } else {
      setSuccess("Imported statement successfully.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="bankAccountId" value={bankAccountId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="statementDate">Statement Date *</Label>
          <Input id="statementDate" name="statementDate" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="file">CSV File *</Label>
          <Input id="file" name="file" type="file" accept=".csv,text/csv" required />
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        CSV headers expected: `date,reference,description,amount` (amount may be negative).
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}

      <div className="flex gap-4">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Importing..." : "Import Statement"}
        </Button>
      </div>
    </form>
  );
}

