"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createInvoiceFromSalesOrder } from "./actions";
import { useRouter } from "next/navigation";

export function CreateInvoiceFromSoButton({ salesOrderId }: { salesOrderId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
    setError(null);
    setLoading(true);
    const result = await createInvoiceFromSalesOrder(salesOrderId);
    setLoading(false);
    if (result?.error) {
      setError(typeof result.error === "string" ? result.error : "Failed to create invoice");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleClick} disabled={loading}>
        {loading ? "Creating..." : "Create Invoice"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
