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
import { getJournalEntriesPaginated } from "./actions";
import { DeleteJournalEntryButton } from "./delete-journal-entry-button";

export default async function JournalsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const user = await getCurrentUser();
  if (!canUser(user, PERMISSIONS.GL_JOURNALS_READ)) redirect("/dashboard");

  const canCreate = canUser(user, PERMISSIONS.GL_JOURNALS_CREATE);
  const canDelete = canUser(user, PERMISSIONS.GL_JOURNALS_DELETE);

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.search ?? "";

  const [result] = await Promise.all([getJournalEntriesPaginated(page, search)]);
  const entries = result.entries;
  const { total, pageSize, totalPages, currentPage } = result;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">General Journal</h1>
          <p className="text-muted-foreground">Record manual GL entries</p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-full sm:w-[240px]">
            <SearchInput value={search} placeholder="Search by entry no / memo..." />
          </div>
          {canCreate && (
            <Button asChild>
              <Link href="/settings/accounting/journals/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Entry
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Journal Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-sm text-muted-foreground">No journal entries yet.</p>
              {canCreate && (
                <div className="mt-4">
                  <Button asChild>
                    <Link href="/settings/accounting/journals/new">Create first entry</Link>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entry No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Memo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => {
                    const entryDate = e.entryDate ? new Date(e.entryDate).toISOString().slice(0, 10) : "—";
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.entryNo}</TableCell>
                        <TableCell>{entryDate}</TableCell>
                        <TableCell className="max-w-[240px] truncate text-muted-foreground">{e.memo ?? "—"}</TableCell>
                        <TableCell>{e.status}</TableCell>
                        <TableCell className="text-right font-medium">{e.totalDebit.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">{e.totalCredit.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          {canDelete && e.status === "POSTED" && (
                            <DeleteJournalEntryButton
                              journalEntryId={e.id}
                              label={`${e.entryNo} on ${entryDate}`}
                            />
                          )}
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
                    : `/settings/accounting/journals?page=${currentPage - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`
                }
                nextHref={
                  currentPage >= totalPages
                    ? undefined
                    : `/settings/accounting/journals?page=${currentPage + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

