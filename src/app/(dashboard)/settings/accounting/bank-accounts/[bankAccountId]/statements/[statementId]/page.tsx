import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { canUser, PERMISSIONS } from "@/lib/permissions";
import { getBankStatementMatchingData } from "../../../actions";
import { MatchBankTransactionRow } from "../../../match-bank-transaction-row";
import { ReconciliationSessionControls } from "../../../reconciliation-session-controls";

export default async function StatementTransactionsPage({
  params,
}: {
  params: { bankAccountId: string; statementId: string };
}) {
  const user = await getCurrentUser();
  if (!canUser(user, PERMISSIONS.BANK_RECONCILIATIONS_READ)) redirect("/dashboard");

  const canMatch = canUser(user, PERMISSIONS.BANK_RECONCILIATIONS_MATCH);

  const data = await getBankStatementMatchingData(params.statementId);
  if (!data) redirect("/settings/accounting/bank-accounts");

  const statementDate = data.statement.statementDate ? new Date(data.statement.statementDate).toISOString().slice(0, 10) : "—";
  const canInteract = canMatch && data.reconciliationStatus !== "CLOSED";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            Bank statement date: {statementDate}
          </p>
          <div className="mt-2">
            <ReconciliationSessionControls
              bankStatementId={params.statementId}
              status={data.reconciliationStatus}
              canInteract={canInteract}
            />
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/settings/accounting/bank-accounts/${params.bankAccountId}/statements`}>Back to statements</Link>
        </Button>
      </div>

      <div className="space-y-4">
        {data.items.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <p className="text-sm text-muted-foreground">No transactions found in this statement.</p>
            </CardContent>
          </Card>
        ) : (
          data.items.map((it: any) => (
            <Card key={it.transaction.id}>
              <CardContent className="pt-6">
                <MatchBankTransactionRow
                  bankStatementId={params.statementId}
                  bankTransactionId={it.transaction.id}
                  transactionDate={it.transaction.transactionDate}
                  amount={it.transaction.amount}
                  reference={it.transaction.reference}
                  description={it.transaction.description}
                  match={it.match}
                  matchedPayment={it.matchedPayment}
                  clientCandidates={it.clientCandidates}
                  supplierCandidates={it.supplierCandidates}
                  canMatch={canInteract}
                />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

