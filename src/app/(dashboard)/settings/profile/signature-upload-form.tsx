"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadOwnSignature, removeOwnSignature } from "./actions";

export function SignatureUploadForm({
  signatureUrl,
}: {
  signatureUrl: string | null;
}) {
  const [preview, setPreview] = useState<string | null>(signatureUrl);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setPending(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const result = await uploadOwnSignature(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setPreview(result.url ?? null);
    } finally {
      setPending(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setError(null);
    setPending(true);
    try {
      const result = await removeOwnSignature();
      if (result?.error) {
        setError(result.error);
        return;
      }
      setPreview(null);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="signature">Signature (for quotations & invoices)</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Upload an image of your signature. If you created or approved a document, this signature will be shown in the printout.
        </p>
        {preview ? (
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-40 border rounded overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="User signature preview"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={pending}
              >
                Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleRemove}
                disabled={pending}
                className="text-destructive hover:text-destructive"
              >
                Remove
              </Button>
              <input
                ref={fileInputRef}
                id="signature"
                type="file"
                accept=".png,.jpg,.jpeg,.webp"
                className="sr-only"
                onChange={handleFileChange}
              />
            </div>
          </div>
        ) : (
          <Input
            id="signature"
            type="file"
            accept=".png,.jpg,.jpeg,.webp"
            onChange={handleFileChange}
            disabled={pending}
          />
        )}
        {error && <p className="text-sm text-destructive mt-1">{error}</p>}
      </div>
    </div>
  );
}

