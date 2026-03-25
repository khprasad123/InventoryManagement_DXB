import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { canUser, PERMISSIONS } from "@/lib/permissions";
import { getBankStatementsForAccount } from "../../actions";
import { Plus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function BankStatementsPage({
  params,
}: {
  params: { bankAccountId: string };
}) {
  const user = await getCurrentUser();
  if (!canUser(user, PERMISSIONS.BANK_ACCOUNTS_READ)) redirect("/dashboard");

  const canImport = canUser(user, PERMISSIONS.BANK_STATEMENTS_IMPORT);

  const statements = await getBankStatementsForAccount(params.bankAccountId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bank Statements</h1>
          <p className="text-muted-foreground">Import statements and reconcile transactions</p>
        </div>
        {canImport && (
          <Button asChild>
            <Link href={`/settings/accounting/bank-accounts/${params.bankAccountId}/statements/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Import Statement
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Statements</CardTitle>
        </CardHeader>
        <CardContent>
          {statements.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">No statements imported yet.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Statement Date</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statements.map((s) => {
                    const statementDate = s.statementDate ? new Date(s.statementDate).toISOString().slice(0, 10) : "—";
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{statementDate}</TableCell>
                        <TableCell className="text-muted-foreground">{s.sourceFileUrl ? "Uploaded CSV" : "Imported"}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/settings/accounting/bank-accounts/${params.bankAccountId}/statements/${s.id}`}>
                              View Transactions
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

