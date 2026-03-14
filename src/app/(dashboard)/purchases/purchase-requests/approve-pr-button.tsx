"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { approvePurchaseRequest } from "@/app/(dashboard)/purchases/actions";

export function ApprovePrButton({ prId }: { prId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      onClick={() =>
        startTransition(async () => {
          const result = await approvePurchaseRequest(prId);
          if (result?.error) {
            alert(result.error);
          }
        })
      }
      disabled={pending}
    >
      <Check className="mr-2 h-4 w-4" />
      {pending ? "Approving..." : "Approve PR"}
    </Button>
  );
}
