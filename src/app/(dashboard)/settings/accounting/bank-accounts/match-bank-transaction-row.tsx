"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { matchBankTransaction, unmatchBankTransaction } from "./actions";
import { useRouter } from "next/navigation";

type PaymentSummary = {
  id: string;
  amount: any; // Prisma Decimal
  paymentDate: Date;
  reference: string | null;
  paymentType: string | null;
};

type Candidate = {
  id: string;
  amount: any;
  paymentDate: Date;
  reference: string | null;
  paymentType: string | null;
};

type MatchSummary = {
  bankTransactionId: string;
  paymentType: "ClientPayment" | "SupplierPayment";
  paymentId: string;
  matchedAmount: any;
  notes: string | null;
};

export function MatchBankTransactionRow({
  bankStatementId,
  bankTransactionId,
  transactionDate,
  amount,
  reference,
  description,
  match,
  matchedPayment,
  clientCandidates,
  supplierCandidates,
  canMatch,
}: {
  bankStatementId: string;
  bankTransactionId: string;
  transactionDate: Date;
  amount: any; // Prisma Decimal
  reference: string | null;
  description: string | null;
  match: MatchSummary | null;
  matchedPayment: PaymentSummary | null;
  clientCandidates: Candidate[];
  supplierCandidates: Candidate[];
  canMatch: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const amountNumber = useMemo(() => Number(amount), [amount]);
  const [notes, setNotes] = useState<string>(match?.notes ?? "");
  const [matchedAmount, setMatchedAmount] = useState<string>(
    match?.matchedAmount != null ? String(Number(match.matchedAmount)) : Math.abs(amountNumber).toFixed(2)
  );
  const defaultType: "ClientPayment" | "SupplierPayment" = amountNumber >= 0 ? "ClientPayment" : "SupplierPayment";

  const [paymentType, setPaymentType] = useState<"ClientPayment" | "SupplierPayment">(match?.paymentType ?? defaultType);
  const candidates = paymentType === "ClientPayment" ? clientCandidates : supplierCandidates;

  const [paymentId, setPaymentId] = useState<string>(match?.paymentId ?? "");

  useEffect(() => {
    setNotes(match?.notes ?? "");
    setPaymentType(match?.paymentType ?? defaultType);
    setPaymentId(match?.paymentId ?? "");
    setMatchedAmount(
      match?.matchedAmount != null ? String(Number(match.matchedAmount)) : Math.abs(Number(amount)).toFixed(2)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankTransactionId]);

  useEffect(() => {
    if (!paymentId && candidates.length) setPaymentId(candidates[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentType, candidates.length]);

  const matchedAmountNumber = useMemo(() => Number(matchedAmount), [matchedAmount]);
  const canSave = canMatch && paymentId && Number.isFinite(matchedAmountNumber) && matchedAmountNumber > 0;

  async function handleSave() {
    if (!canSave) return;
    startTransition(async () => {
      const result = await matchBankTransaction({
        bankStatementId,
        bankTransactionId,
        paymentType,
        paymentId,
        notes: notes || undefined,
        matchedAmount: matchedAmountNumber,
      });
      if (result?.error) return;
      router.refresh();
    });
  }

  async function handleUnmatch() {
    if (!match) return;
    startTransition(async () => {
      const result = await unmatchBankTransaction({
        bankStatementId,
        bankTransactionId,
      });
      if (result?.error) return;
      router.refresh();
    });
  }

  const transactionAmount = Math.abs(amountNumber).toFixed(2);
  const entryLabel = reference ?? description ?? "—";

  return (
    <div className="space-y-3">
      <div className="text-sm">
        <span className="font-medium">{entryLabel}</span>
        <div className="text-xs text-muted-foreground">
          {transactionDate ? new Date(transactionDate).toISOString().slice(0, 10) : "—"} | {amountNumber >= 0 ? "+" : "-"}{transactionAmount}
        </div>
      </div>

      {match && matchedPayment ? (
        <div className="rounded-md border px-3 py-2">
          <div className="text-sm font-medium">Matched</div>
          <div className="text-xs text-muted-foreground">
            {match.paymentType} | {matchedPayment.reference ?? matchedPayment.id} | {Number(matchedPayment.amount).toFixed(2)}
          </div>
          <div className="text-xs mt-1 text-muted-foreground">
            Matched amount: {Number(match.matchedAmount).toFixed(2)}
          </div>
          {match.notes ? <div className="text-xs mt-1">{match.notes}</div> : null}
          {canMatch && (
            <div className="mt-3">
              <Button variant="outline" size="sm" type="button" onClick={handleUnmatch} disabled={isPending}>
                Unmatch
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">Not matched yet</div>
      )}

      {canMatch && (
        <div className="grid gap-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Payment Type</Label>
              <Select value={paymentType} onValueChange={(v) => setPaymentType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {clientCandidates.length > 0 && <SelectItem value="ClientPayment">Client Payment</SelectItem>}
                  {supplierCandidates.length > 0 && <SelectItem value="SupplierPayment">Supplier Payment</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment</Label>
              <Select value={paymentId} onValueChange={setPaymentId}>
                <SelectTrigger>
                  <SelectValue placeholder={candidates.length ? "Select payment..." : "No candidates"} />
                </SelectTrigger>
                <SelectContent>
                  {candidates.length ? (
                    candidates.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.reference ?? c.id} ({new Date(c.paymentDate).toISOString().slice(0, 10)}) - {Number(c.amount).toFixed(2)}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>
                      No candidate payments found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Match Notes</Label>
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="matchedAmount">Matched Amount *</Label>
            <Input
              id="matchedAmount"
              value={matchedAmount}
              onChange={(e) => setMatchedAmount(e.target.value)}
              type="number"
              step="0.01"
              min="0"
            />
          </div>

          <Button type="button" onClick={handleSave} disabled={!paymentId || isPending}>
            {isPending ? "Saving..." : "Save Match"}
          </Button>
        </div>
      )}
    </div>
  );
}

