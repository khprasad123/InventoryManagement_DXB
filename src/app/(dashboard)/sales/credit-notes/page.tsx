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
import { SearchInput } from "@/components/ui/search-input";
import { PaginationLinks } from "@/components/ui/pagination-links";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, FileText, ArrowLeft } from "lucide-react";
import { getCurrentUser, getOrganizationId, getOrgTimezone } from "@/lib/auth-utils";
import { formatInTimezone } from "@/lib/date-utils";
import { canUser, PERMISSIONS } from "@/lib/permissions";
import { getSalesCreditNotesPaginated } from "./actions";

export default async function SalesCreditNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) return null;

  const user = await getCurrentUser();
  const canCreate = canUser(user, PERMISSIONS.SALES_CREATE);

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.search ?? "";

  const [result, tz] = await Promise.all([
    getSalesCreditNotesPaginated(page, search),
    getOrgTimezone(),
  ]);

  const creditNotes = result.creditNotes;
  const totalPages = result.totalPages;
  const currentPage = result.currentPage;

  const prevHref = currentPage <= 1 ? undefined : `/sales/credit-notes?page=${currentPage - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`;
  const nextHref = currentPage >= totalPages ? undefined : `/sales/credit-notes?page=${currentPage + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Credit Notes</h1>
          <p className="text-muted-foreground">
            Simplified first: creates GL reversal entries (AR + Revenue).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-[240px]">
            <SearchInput value={search} placeholder="Search credit notes / invoices..." />
          </div>
          <Button variant="outline" asChild>
            <Link href="/sales">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sales
            </Link>
          </Button>
          {canCreate && (
            <Button asChild>
              <Link href="/sales/credit-notes/new">
                <Plus className="mr-2 h-4 w-4" />
                New Credit Note
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Credit Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {creditNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-muted-foreground">No credit notes yet.</p>
              {canCreate && (
                <Button asChild className="mt-4">
                  <Link href="/sales/credit-notes/new">Create your first credit note</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Credit Note</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditNotes.map((cn) => (
                    <TableRow key={cn.id}>
                      <TableCell className="font-medium">{cn.creditNoteNo}</TableCell>
                      <TableCell>{formatInTimezone(cn.noteDate, tz ?? "UTC")}</TableCell>
                      <TableCell>{cn.salesInvoice?.invoiceNo ?? "-"}</TableCell>
                      <TableCell>{cn.salesInvoice?.client?.name ?? "-"}</TableCell>
                      <TableCell className="text-right">
                        {Number(cn.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>{cn.currencyCode}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            cn.status === "POSTED" ? "default" : cn.status === "REVERSED" ? "danger" : "secondary"
                          }
                        >
                          {cn.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <PaginationLinks page={currentPage} totalPages={totalPages} prevHref={prevHref} nextHref={nextHref} />
        </CardContent>
      </Card>
    </div>
  );
}

