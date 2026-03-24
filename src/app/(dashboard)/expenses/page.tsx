import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getExpensesPaginated } from "./actions";
import { getCurrentUser, getOrganizationId, getOrgTimezone } from "@/lib/auth-utils";
import { formatInTimezone } from "@/lib/date-utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, FolderTree, Eye } from "lucide-react";
import { DeleteExpenseButton } from "./delete-expense-button";
import { PaginationLinks } from "@/components/ui/pagination-links";
import { SearchInput } from "@/components/ui/search-input";
import { canUser, PERMISSIONS } from "@/lib/permissions";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  const user = await getCurrentUser();
  if (!canUser(user, PERMISSIONS.EXPENSES_READ)) redirect("/dashboard");
  const canCreateExpenses = canUser(user, PERMISSIONS.EXPENSES_CREATE);
  const canUpdateExpenses = canUser(user, PERMISSIONS.EXPENSES_UPDATE);
  const canDeleteExpenses = canUser(user, PERMISSIONS.EXPENSES_DELETE);

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.search ?? "";

  const [expenseResult, timezone] = await Promise.all([
    getExpensesPaginated(page, search),
    getOrgTimezone(),
  ]);
  const expenses = expenseResult.expenses;
  const { total, pageSize, totalPages, currentPage } = expenseResult;
  const tz = timezone ?? "UTC";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">
            Track business expenses by category
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-full sm:w-[240px]">
            <SearchInput value={search} placeholder="Search expenses / categories..." />
          </div>
          {canUpdateExpenses && (
            <Button variant="outline" asChild>
              <Link href="/expenses/categories">
                <FolderTree className="mr-2 h-4 w-4" />
                Categories
              </Link>
            </Button>
          )}
          {canCreateExpenses && (
            <Button asChild>
              <Link href="/expenses/add">
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Records</CardTitle>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No expenses yet. Add a category first, then record expenses.
              </p>
              <div className="mt-4 flex gap-2">
                {canUpdateExpenses && (
                  <Button asChild variant="outline">
                    <Link href="/expenses/categories">Manage Categories</Link>
                  </Button>
                )}
                {canCreateExpenses && (
                  <Button asChild>
                    <Link href="/expenses/add">Add Expense</Link>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Recurring</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        {formatInTimezone(expense.expenseDate, tz)}
                      </TableCell>
                      <TableCell>{expense.category.name}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">
                        {expense.description ?? "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {Number(expense.amount).toFixed(2)} {expense.currencyCode}
                      </TableCell>
                      <TableCell>
                        {expense.isRecurring ? "Yes" : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" asChild title="View details & documents">
                            <Link href={`/expenses/${expense.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          {canUpdateExpenses && (
                            <Button variant="ghost" size="icon" asChild title="Edit">
                              <Link href={`/expenses/${expense.id}/edit`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                          {canDeleteExpenses && (
                            <DeleteExpenseButton
                              expenseId={expense.id}
                              expenseLabel={`${expense.category.name} - ${Number(expense.amount).toFixed(2)} on ${formatInTimezone(expense.expenseDate, tz)}`}
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <PaginationLinks
                page={currentPage}
                totalPages={totalPages}
                total={total}
                showingFrom={(currentPage - 1) * pageSize + 1}
                showingTo={Math.min(currentPage * pageSize, total)}
                prevHref={
                  currentPage <= 1
                    ? undefined
                    : `/expenses?page=${currentPage - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`
                }
                nextHref={
                  currentPage >= totalPages
                    ? undefined
                    : `/expenses?page=${currentPage + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
