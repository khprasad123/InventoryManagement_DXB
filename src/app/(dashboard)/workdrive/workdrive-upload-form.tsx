"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function WorkDriveUploadForm({
  action,
  folderId,
  submitLabel = "Upload",
}: {
  action: (formData: FormData) => Promise<{ error?: Record<string, string[] | undefined> } | void>;
  folderId: string;
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
      setError(err.file?.[0] || err._form?.[0] || "Upload failed");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <input type="hidden" name="folderId" value={folderId} />
      <div className="space-y-2">
        <Label htmlFor="file">File *</Label>
        <Input id="file" name="file" type="file" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="memo">Memo (optional)</Label>
        <Textarea id="memo" name="memo" placeholder="e.g. version note / description" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={submitting}>
        {submitting ? "Uploading..." : submitLabel}
      </Button>
    </form>
  );
}

