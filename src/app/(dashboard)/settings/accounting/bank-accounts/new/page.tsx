import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, getOrganizationId } from "@/lib/auth-utils";
import { canUser, PERMISSIONS } from "@/lib/permissions";
import { getDefaultCurrencyCodeForOrg, getOrganizationCurrencies } from "@/lib/currency";
import { createBankAccount } from "../actions";
import { BankAccountForm } from "../bank-account-form";

export default async function NewBankAccountPage() {
  const user = await getCurrentUser();
  if (!canUser(user, PERMISSIONS.BANK_ACCOUNTS_CREATE)) redirect("/dashboard");

  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const [currencies, defaultCurrencyCode] = await Promise.all([
    getOrganizationCurrencies(orgId),
    getDefaultCurrencyCodeForOrg(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Bank Account</h1>
          <p className="text-muted-foreground">Set up your bank accounts for reconciliation</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/settings/accounting/bank-accounts">Back</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          <BankAccountForm action={createBankAccount} currencies={currencies} defaultCurrencyCode={defaultCurrencyCode} />
        </CardContent>
      </Card>
    </div>
  );
}

