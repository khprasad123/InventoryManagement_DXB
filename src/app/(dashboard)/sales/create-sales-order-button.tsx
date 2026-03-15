"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createSalesOrderFromQuotation } from "./actions";
import { useRouter } from "next/navigation";

export function CreateSalesOrderButton({ quotationId }: { quotationId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
    setError(null);
    setLoading(true);
    const result = await createSalesOrderFromQuotation(quotationId);
    setLoading(false);
    if (result?.error) {
      setError(typeof result.error === "string" ? result.error : "Failed to create");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={handleClick} disabled={loading}>
        {loading ? "Creating..." : "Create Sales Order"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
