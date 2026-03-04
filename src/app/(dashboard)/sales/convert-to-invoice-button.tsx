"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { convertQuotationToInvoice } from "./actions";

export function ConvertToInvoiceButton({ quotationId }: { quotationId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConvert() {
    setError(null);
    setLoading(true);
    try {
      const result = await convertQuotationToInvoice(quotationId);
      if (result?.error) {
        setError(typeof result.error === "string" ? result.error : "Failed to convert");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Button onClick={handleConvert} disabled={loading}>
        {loading ? "Converting..." : "Convert to Invoice"}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
