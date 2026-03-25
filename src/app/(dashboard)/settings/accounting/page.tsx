import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth-utils";
import { canUser, PERMISSIONS } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Wallet, RotateCcw } from "lucide-react";

export default async function AccountingLandingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const showJournals = canUser(user, PERMISSIONS.GL_JOURNALS_READ);
  const showBankAccounts = canUser(user, PERMISSIONS.BANK_ACCOUNTS_READ);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Accounting</h1>
        <p className="text-muted-foreground">General Journal and bank reconciliation workflows</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {showJournals && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5" />
                General Journal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Create and review manual GL postings.</p>
              <Button asChild>
                <Link href="/settings/accounting/journals">Open Journals</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {showBankAccounts && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Bank Accounts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Import statements and reconcile transactions.</p>
              <Button asChild>
                <Link href="/settings/accounting/bank-accounts">Open Bank Accounts</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {!showJournals && !showBankAccounts && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">You do not have access to Accounting modules.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

