"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createInvoiceFromSalesOrder } from "./actions";
import { useRouter } from "next/navigation";

export function CreateInvoiceFromSoButton({ salesOrderId }: { salesOrderId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendForApproval, setSendForApproval] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setError(null);
    setLoading(true);
    const result = await createInvoiceFromSalesOrder(salesOrderId, sendForApproval);
    setLoading(false);
    if (result?.error) {
      setError(typeof result.error === "string" ? result.error : "Failed to create invoice");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={sendForApproval}
          onChange={(e) => setSendForApproval(e.target.checked)}
        />
        Send invoice for approval
      </label>
      <Button onClick={handleClick} disabled={loading}>
        {loading ? "Creating..." : "Create Invoice"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
