import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPurchaseRequestsPaginated } from "../actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, ArrowLeft, Eye, Pencil } from "lucide-react";
import { SubmitPrButton } from "./submit-pr-button";
import { DeletePrButton } from "./delete-pr-button";
import { PaginationLinks } from "@/components/ui/pagination-links";
import { SearchInput } from "@/components/ui/search-input";

export default async function PurchaseRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.search ?? "";

  const { purchaseRequests, total, pageSize, totalPages, currentPage } = await getPurchaseRequestsPaginated(page, search);
  const prs = purchaseRequests;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/purchases">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Purchases
            </Link>
          </Button>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Purchase Requests
          </h1>
          <p className="text-muted-foreground">
            Create and approve purchase requests. Approved PRs can be converted to Purchase Orders.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-full sm:w-[240px]">
            <SearchInput value={search} placeholder="Search PR / items..." />
          </div>
          <Button asChild>
            <Link href="/purchases/purchase-requests/add">
              <Plus className="mr-2 h-4 w-4" />
              New PR
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Purchase Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No purchase requests yet.
              </p>
              <Button asChild className="mt-4">
                <Link href="/purchases/purchase-requests/add">Create PR</Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PR No</TableHead>
                    <TableHead>Job ID</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prs.map((pr) => (
                    <TableRow key={pr.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/purchases/purchase-requests/${pr.id}`}
                          className="text-primary hover:underline"
                        >
                          {pr.prNo}
                        </Link>
                      </TableCell>
                      <TableCell>{pr.jobId ?? "-"}</TableCell>
                      <TableCell>
                        {pr.items.length} line(s)
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            pr.status === "APPROVED"
                              ? "default"
                              : pr.status === "REJECTED"
                                ? "danger"
                                : "secondary"
                          }
                        >
                          {pr.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {pr.status === "DRAFT" && (
                            <>
                              <Button variant="ghost" size="icon" asChild title="Edit">
                                <Link href={`/purchases/purchase-requests/${pr.id}/edit`}>
                                  <Pencil className="h-4 w-4" />
                                </Link>
                              </Button>
                              <SubmitPrButton prId={pr.id} size="sm" />
                              <DeletePrButton prId={pr.id} prNo={pr.prNo} size="icon" />
                            </>
                          )}
                          <Button variant="ghost" size="icon" asChild title="View">
                            <Link href={`/purchases/purchase-requests/${pr.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
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
                    : `/purchases/purchase-requests?page=${currentPage - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`
                }
                nextHref={
                  currentPage >= totalPages
                    ? undefined
                    : `/purchases/purchase-requests?page=${currentPage + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
