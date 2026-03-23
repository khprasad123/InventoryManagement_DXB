import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getGrnsPaginated } from "../actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Package } from "lucide-react";
import { PaginationLinks } from "@/components/ui/pagination-links";
import { SearchInput } from "@/components/ui/search-input";

export default async function GrnListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.search ?? "";

  const { grns, total, pageSize, totalPages, currentPage } = await getGrnsPaginated(page, search);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Goods Received Notes</h1>
          <p className="text-muted-foreground">
            Receive stock and update inventory
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-full sm:w-[240px]">
            <SearchInput value={search} placeholder="Search GRN / supplier / items..." />
          </div>
          <Button asChild>
            <Link href="/purchases/grn/add">
              <Plus className="mr-2 h-4 w-4" />
              Create GRN
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>GRN List</CardTitle>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No GRNs yet. Create a GRN to receive stock.
              </p>
              <Button asChild className="mt-4">
                <Link href="/purchases/grn/add">
                  <Plus className="mr-2 h-4 w-4" />
                  Create GRN
                </Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GRN No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grns.map((grn) => (
                    <TableRow key={grn.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/purchases/grn/${grn.id}`}
                          className="text-primary hover:underline"
                        >
                          {grn.grnNo}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {new Date(grn.receivedDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{grn.supplier.name}</TableCell>
                      <TableCell className="text-right">
                        {grn.items.length}
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
                    : `/purchases/grn?page=${currentPage - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`
                }
                nextHref={
                  currentPage >= totalPages
                    ? undefined
                    : `/purchases/grn?page=${currentPage + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
