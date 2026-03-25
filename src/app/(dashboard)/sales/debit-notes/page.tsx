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
import { getSalesDebitNotesPaginated } from "./actions";

export default async function SalesDebitNotesPage({
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
    getSalesDebitNotesPaginated(page, search),
    getOrgTimezone(),
  ]);

  const debitNotes = result.debitNotes;
  const totalPages = result.totalPages;
  const currentPage = result.currentPage;

  const prevHref = currentPage <= 1 ? undefined : `/sales/debit-notes?page=${currentPage - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`;
  const nextHref = currentPage >= totalPages ? undefined : `/sales/debit-notes?page=${currentPage + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Debit Notes</h1>
          <p className="text-muted-foreground">Simplified first: posts AR + Revenue to GL.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-[240px]">
            <SearchInput value={search} placeholder="Search debit notes / invoices..." />
          </div>
          <Button variant="outline" asChild>
            <Link href="/sales">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sales
            </Link>
          </Button>
          {canCreate && (
            <Button asChild>
              <Link href="/sales/debit-notes/new">
                <Plus className="mr-2 h-4 w-4" />
                New Debit Note
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Debit Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {debitNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-muted-foreground">No debit notes yet.</p>
              {canCreate && (
                <Button asChild className="mt-4">
                  <Link href="/sales/debit-notes/new">Create your first debit note</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Debit Note</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {debitNotes.map((dn) => (
                    <TableRow key={dn.id}>
                      <TableCell className="font-medium">{dn.debitNoteNo}</TableCell>
                      <TableCell>{formatInTimezone(dn.noteDate, tz ?? "UTC")}</TableCell>
                      <TableCell>{dn.salesInvoice?.invoiceNo ?? "-"}</TableCell>
                      <TableCell>{dn.salesInvoice?.client?.name ?? "-"}</TableCell>
                      <TableCell className="text-right">{Number(dn.amount).toFixed(2)}</TableCell>
                      <TableCell>{dn.currencyCode}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            dn.status === "POSTED" ? "default" : dn.status === "REVERSED" ? "danger" : "secondary"
                          }
                        >
                          {dn.status}
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

