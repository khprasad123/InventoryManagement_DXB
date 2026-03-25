import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-utils";
import { canUser, PERMISSIONS } from "@/lib/permissions";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteJournalEntryButton } from "../delete-journal-entry-button";
import { getJournalEntryById } from "../actions";

export default async function JournalEntryDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!canUser(user, PERMISSIONS.GL_JOURNALS_READ)) redirect("/dashboard");

  const canDelete = canUser(user, PERMISSIONS.GL_JOURNALS_DELETE);

  const entry = await getJournalEntryById(params.id);
  if (!entry) redirect("/settings/accounting/journals");

  const entryDate = entry.entryDate ? new Date(entry.entryDate).toISOString().slice(0, 10) : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Journal Entry</h1>
          <p className="text-muted-foreground">
            {entry.entryNo} • {entryDate}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/settings/accounting/journals">Back</Link>
          </Button>
          {canDelete && entry.status === "POSTED" && (
            <DeleteJournalEntryButton journalEntryId={entry.id} label={`${entry.entryNo} on ${entryDate}`} />
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entry Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border p-3">
              <div className="text-sm text-muted-foreground">Memo</div>
              <div className="text-sm font-medium">{entry.memo ?? "—"}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="text-sm font-medium">{entry.status}</div>
            </div>
          </div>

          <div className="rounded-md border p-3 flex items-center justify-between gap-4">
            <div className="text-sm">
              Total Debit: <span className="font-medium">{entry.totalDebit.toFixed(2)}</span>
            </div>
            <div className="text-sm">
              Total Credit: <span className="font-medium">{entry.totalCredit.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entry.lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">
                      {l.account.code} - {l.account.name}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate text-muted-foreground">{l.description ?? "—"}</TableCell>
                    <TableCell className="text-right font-medium">{Number(l.debitAmount).toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">{Number(l.creditAmount).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

