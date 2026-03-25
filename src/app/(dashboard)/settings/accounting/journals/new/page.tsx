import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { canUser, PERMISSIONS } from "@/lib/permissions";
import { getCurrentUser } from "@/lib/auth-utils";
import { createJournalEntry, getGlAccountsForJournal } from "../actions";
import { JournalForm } from "../journal-form";

export default async function NewJournalEntryPage() {
  const user = await getCurrentUser();
  if (!canUser(user, PERMISSIONS.GL_JOURNALS_CREATE)) redirect("/dashboard");

  const accounts = await getGlAccountsForJournal();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add Journal Entry</h1>
          <p className="text-muted-foreground">Manual GL posting (posted immediately)</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/settings/accounting/journals">Back to journals</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Journal Details</CardTitle>
        </CardHeader>
        <CardContent>
          <JournalForm action={createJournalEntry} accounts={accounts} />
        </CardContent>
      </Card>
    </div>
  );
}

