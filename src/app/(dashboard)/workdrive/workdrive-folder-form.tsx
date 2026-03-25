"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function WorkDriveFolderForm({
  action,
  parentFolderId,
  submitLabel = "Create Folder",
}: {
  action: (formData: FormData) => Promise<{ error?: Record<string, string[] | undefined> } | void>;
  parentFolderId: string;
  submitLabel?: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await action(formData);
    setSubmitting(false);

    if (result?.error) {
      const err = result.error as Record<string, string[] | undefined>;
      setError(err.name?.[0] || err._form?.[0] || "Creation failed");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="parentFolderId" value={parentFolderId} />
      <div className="space-y-2">
        <Label htmlFor="name">Folder name *</Label>
        <Input id="name" name="name" required maxLength={200} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Creating..." : submitLabel}
      </Button>
    </form>
  );
}

