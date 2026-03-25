import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { canUser, PERMISSIONS } from "@/lib/permissions";
import { importBankStatementAction } from "../../../actions";
import { BankStatementImportForm } from "../../../bank-statement-import-form";

export default async function NewStatementPage({
  params,
}: {
  params: { bankAccountId: string };
}) {
  const user = await getCurrentUser();
  if (!canUser(user, PERMISSIONS.BANK_STATEMENTS_IMPORT)) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Import Bank Statement</h1>
          <p className="text-muted-foreground">Upload CSV and create bank transactions</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/settings/accounting/bank-accounts/${params.bankAccountId}/statements`}>Back</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Statement Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <BankStatementImportForm action={importBankStatementAction} bankAccountId={params.bankAccountId} />
        </CardContent>
      </Card>
    </div>
  );
}

