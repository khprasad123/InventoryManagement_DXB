import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { canUser, PERMISSIONS } from "@/lib/permissions";
import { getBankAccounts } from "./actions";
import { SearchInput } from "@/components/ui/search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus } from "lucide-react";

export default async function BankAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const user = await getCurrentUser();
  if (!canUser(user, PERMISSIONS.BANK_ACCOUNTS_READ)) redirect("/dashboard");

  const canCreate = canUser(user, PERMISSIONS.BANK_ACCOUNTS_CREATE);
  const canImport = canUser(user, PERMISSIONS.BANK_STATEMENTS_IMPORT);

  const params = await searchParams;
  const search = params.search ?? "";

  const accounts = await getBankAccounts(search);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bank Accounts</h1>
          <p className="text-muted-foreground">Manage bank accounts and reconcile transactions</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-full sm:w-[240px]">
            <SearchInput value={search} placeholder="Search bank accounts..." />
          </div>
          {canCreate && (
            <Button asChild>
              <Link href="/settings/accounting/bank-accounts/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Account
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm text-muted-foreground">No bank accounts yet.</p>
              {canCreate && (
                <div className="mt-4">
                  <Button asChild>
                    <Link href="/settings/accounting/bank-accounts/new">Create bank account</Link>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell className="text-muted-foreground">{a.bankName ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{a.accountNumberMasked ?? "—"}</TableCell>
                      <TableCell>{a.currencyCode}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/settings/accounting/bank-accounts/${a.id}/statements`}>
                              Statements
                            </Link>
                          </Button>
                          {canImport && (
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/settings/accounting/bank-accounts/${a.id}/statements/new`}>
                                Import
                              </Link>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

