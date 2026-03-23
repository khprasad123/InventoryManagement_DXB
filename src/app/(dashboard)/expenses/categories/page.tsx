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
import { getExpenseCategoriesPaginated } from "../actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { DeleteExpenseCategoryButton } from "../delete-category-button";
import { PaginationLinks } from "@/components/ui/pagination-links";
import { SearchInput } from "@/components/ui/search-input";

export default async function ExpenseCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.search ?? "";

  const { categories, total, pageSize, totalPages, currentPage } = await getExpenseCategoriesPaginated(page, search);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Expense Categories
          </h1>
          <p className="text-muted-foreground">
            Manage categories for expense entries
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-full sm:w-[240px]">
            <SearchInput value={search} placeholder="Search categories..." />
          </div>
          <Button asChild>
            <Link href="/expenses/categories/add">
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No categories yet. Add a category to organize expenses.
              </p>
              <Button asChild className="mt-4">
                <Link href="/expenses/categories/add">Add Category</Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {cat.description ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/expenses/categories/${cat.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <DeleteExpenseCategoryButton
                            categoryId={cat.id}
                            categoryName={cat.name}
                          />
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
                    : `/expenses/categories?page=${currentPage - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`
                }
                nextHref={
                  currentPage >= totalPages
                    ? undefined
                    : `/expenses/categories?page=${currentPage + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
