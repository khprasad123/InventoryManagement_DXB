import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { canUser, PERMISSIONS } from "@/lib/permissions";
import { Plus } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
import { PaginationLinks } from "@/components/ui/pagination-links";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getGlAccountsPaginated } from "./actions";
import { DeleteGlAccountButton } from "./delete-gl-account-button";

export default async function GlAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const user = await getCurrentUser();
  if (!canUser(user, PERMISSIONS.GL_ACCOUNTS_READ)) redirect("/dashboard");

  const canManage = canUser(user, PERMISSIONS.MANAGE_JOURNALS);

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.search ?? "";

  const result = await getGlAccountsPaginated(page, search);
  const { accounts, total, pageSize, totalPages, currentPage } = result;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Chart of Accounts</h1>
          <p className="text-muted-foreground">Manage GL accounts used for journal lines</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-full sm:w-[240px]">
            <SearchInput value={search} placeholder="Search by code or name..." />
          </div>
          {canManage && (
            <Button asChild>
              <Link href="/settings/accounting/gl-accounts/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Account
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>GL Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No GL accounts found.</div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Normal Side</TableHead>
                      <TableHead className="text-right">Tax</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.code}</TableCell>
                        <TableCell className="max-w-[260px] truncate text-muted-foreground">{a.name}</TableCell>
                        <TableCell>{a.type}</TableCell>
                        <TableCell>{a.normalSide}</TableCell>
                        <TableCell className="text-right">{a.isTaxAccount ? "Yes" : "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {canManage && (
                              <>
                                <Button variant="ghost" size="sm" asChild>
                                  <Link href={`/settings/accounting/gl-accounts/${a.id}/edit`}>Edit</Link>
                                </Button>
                                <DeleteGlAccountButton
                                  accountId={a.id}
                                  label={`${a.code} - ${a.name}`}
                                />
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <PaginationLinks
                page={currentPage}
                totalPages={totalPages}
                total={total}
                showingFrom={(currentPage - 1) * pageSize + 1}
                showingTo={Math.min(currentPage * pageSize, total)}
                prevHref={
                  currentPage <= 1
                    ? undefined
                    : `/settings/accounting/gl-accounts?page=${currentPage - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`
                }
                nextHref={
                  currentPage >= totalPages
                    ? undefined
                    : `/settings/accounting/gl-accounts?page=${currentPage + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`
                }
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

