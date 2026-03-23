import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getQuotationsPaginated } from "../actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Eye, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DeleteQuotationButton } from "../delete-quotation-button";
import { PaginationLinks } from "@/components/ui/pagination-links";
import { SearchInput } from "@/components/ui/search-input";

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.search ?? "";

  const { quotations, total, pageSize, totalPages, currentPage } = await getQuotationsPaginated(page, search);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quotations</h1>
          <p className="text-muted-foreground">
            Create and manage sales quotations
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-full sm:w-[240px]">
            <SearchInput value={search} placeholder="Search quotation / clients / items..." />
          </div>
          <Button asChild>
            <Link href="/sales/quotations/add">
              <Plus className="mr-2 h-4 w-4" />
              New Quotation
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Quotations</CardTitle>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No quotations yet. Create a quotation to send to clients.
              </p>
              <Button asChild className="mt-4">
                <Link href="/sales/quotations/add">Create Quotation</Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quotation</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotations.map((q) => {
                    const canEdit = q.status === "DRAFT" && !q.salesOrder?.salesInvoices?.length;
                    return (
                      <TableRow key={q.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/sales/quotations/${q.id}`}
                            className="text-primary hover:underline"
                          >
                            {q.quotationNo}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {new Date(q.quotationDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{q.client.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              q.status === "APPROVED"
                                ? "default"
                                : q.status === "REJECTED"
                                  ? "danger"
                                  : "secondary"
                            }
                          >
                            {q.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {q.items
                            .reduce((s, i) => s + Number(i.total), 0)
                            .toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" asChild title="View">
                              <Link href={`/sales/quotations/${q.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            {canEdit && (
                              <>
                                <Button variant="ghost" size="icon" asChild title="Edit">
                                  <Link href={`/sales/quotations/${q.id}/edit`}>
                                    <Pencil className="h-4 w-4" />
                                  </Link>
                                </Button>
                                <DeleteQuotationButton
                                  quotationId={q.id}
                                  quotationNo={q.quotationNo}
                                />
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
                    : `/sales/quotations?page=${currentPage - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`
                }
                nextHref={
                  currentPage >= totalPages
                    ? undefined
                    : `/sales/quotations?page=${currentPage + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
