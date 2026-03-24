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
import { getPurchaseInvoicesPaginated } from "./actions";
import { getCurrentUser, getOrganizationId, getOrgTimezone } from "@/lib/auth-utils";
import { formatInTimezone } from "@/lib/date-utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Package, FileText, Eye, Pencil, Download } from "lucide-react";
import { DeletePurchaseInvoiceButton } from "./delete-purchase-invoice-button";
import { PaginationLinks } from "@/components/ui/pagination-links";
import { SearchInput } from "@/components/ui/search-input";
import { canUser, PERMISSIONS } from "@/lib/permissions";

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  const user = await getCurrentUser();
  if (!canUser(user, PERMISSIONS.PURCHASES_READ)) {
    redirect("/dashboard");
  }
  const canCreatePurchases = canUser(user, PERMISSIONS.PURCHASES_CREATE);
  const canUpdatePurchases = canUser(user, PERMISSIONS.PURCHASES_UPDATE);
  const canDeletePurchases = canUser(user, PERMISSIONS.PURCHASES_DELETE);

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.search ?? "";

  const [invoiceResult, timezone] = await Promise.all([
    getPurchaseInvoicesPaginated(page, search),
    getOrgTimezone(),
  ]);
  const invoices = invoiceResult.invoices;
  const { total, pageSize, totalPages, currentPage } = invoiceResult;
  const tz = timezone ?? "UTC";
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchases</h1>
          <p className="text-muted-foreground">
            Purchase flow: PR → Approval → PO → GRN → Inventory
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="w-full sm:w-[240px]">
            <SearchInput value={search} placeholder="Search invoices / suppliers..." />
          </div>
          {canCreatePurchases && (
            <Button asChild>
              <Link href="/purchases/purchase-requests/add">
                <Plus className="mr-2 h-4 w-4" />
                Create Purchase Request
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href="/purchases/purchase-requests">Purchase Requests</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/purchases/purchase-orders">Purchase Orders</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/purchases/grn">
              <Package className="mr-2 h-4 w-4" />
              GRNs
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/api/exports/purchases?search=${encodeURIComponent(search)}`}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No purchase invoices yet. Follow the flow: Create PR → Approve → Create PO → Create GRN (from PO).
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Supplier invoices (optional) can be recorded for finance tracking.
              </p>
              <div className="mt-4 flex gap-2">
                {canCreatePurchases && (
                  <Button asChild>
                    <Link href="/purchases/purchase-requests/add">Create Purchase Request</Link>
                  </Button>
                )}
                {canCreatePurchases && (
                  <Button asChild variant="outline">
                    <Link href="/purchases/add">Record supplier invoice</Link>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>GRN</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/purchases/${inv.id}`}
                          className="text-primary hover:underline"
                        >
                          {inv.invoiceNo}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {formatInTimezone(inv.invoiceDate, tz)}
                      </TableCell>
                      <TableCell>
                        {inv.dueDate
                          ? formatInTimezone(inv.dueDate, tz)
                          : "-"}
                      </TableCell>
                      <TableCell>{inv.supplier.name}</TableCell>
                      <TableCell>
                        {inv.grn ? (
                          <Link
                            href={`/purchases/grn/${inv.grn.id}`}
                            className="text-primary hover:underline"
                          >
                            {inv.grn.grnNo}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(inv.totalAmount).toFixed(2)} {inv.currencyCode}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            inv.paymentStatus === "PAID"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : inv.paymentStatus === "PARTIAL"
                              ? "bg-amber-100 text-amber-800 border-amber-200"
                              : "bg-red-100 text-red-800 border-red-200"
                          }
                        >
                          {inv.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" asChild title="View details & documents">
                            <Link href={`/purchases/${inv.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          {canUpdatePurchases && (
                            <Button variant="ghost" size="icon" asChild title="Edit">
                              <Link href={`/purchases/${inv.id}/edit`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                          {canDeletePurchases && (
                            <DeletePurchaseInvoiceButton invoiceId={inv.id} invoiceNo={inv.invoiceNo} />
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
                    : `/purchases?page=${currentPage - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`
                }
                nextHref={
                  currentPage >= totalPages
                    ? undefined
                    : `/purchases?page=${currentPage + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
