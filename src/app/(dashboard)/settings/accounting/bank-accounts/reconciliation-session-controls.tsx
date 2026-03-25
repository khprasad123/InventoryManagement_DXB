"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { closeBankReconciliationSession, reopenBankReconciliationSession } from "./actions";

export function ReconciliationSessionControls({
  bankStatementId,
  status,
  canInteract,
}: {
  bankStatementId: string;
  status: "OPEN" | "MATCHED" | "CLOSED" | null;
  canInteract: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const label = status ?? "NOT STARTED";

  return (
    <div className="flex items-center gap-3">
      <Badge
        variant={
          status === "CLOSED"
            ? "danger"
            : status === "MATCHED"
              ? "default"
              : status === "OPEN"
                ? "secondary"
                : "secondary"
        }
      >
        {label}
      </Badge>

      {canInteract && status !== "CLOSED" && (
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await closeBankReconciliationSession(bankStatementId);
              router.refresh();
            });
          }}
        >
          Close Session
        </Button>
      )}

      {canInteract && status === "CLOSED" && (
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              await reopenBankReconciliationSession(bankStatementId);
              router.refresh();
            });
          }}
        >
          Reopen
        </Button>
      )}
    </div>
  );
}

