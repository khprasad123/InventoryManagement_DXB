"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { submitSalesInvoiceForApproval } from "./actions";
import { useRouter } from "next/navigation";

export function SubmitInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    const result = await submitSalesInvoiceForApproval(invoiceId);
    setLoading(false);
    if (result?.error) {
      setError(typeof result.error === "string" ? result.error : "Failed to submit");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleSubmit} disabled={loading} size="sm" variant="outline">
        {loading ? "Submitting…" : "Submit for Approval"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
