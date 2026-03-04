"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { approveQuotation } from "./actions";
import { useRouter } from "next/navigation";

export function ApproveQuotationButton({ quotationId }: { quotationId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleApprove() {
    setLoading(true);
    await approveQuotation(quotationId);
    router.refresh();
  }

  return (
    <Button onClick={handleApprove} disabled={loading} variant="default">
      {loading ? "Approving..." : "Approve Quotation"}
    </Button>
  );
}
