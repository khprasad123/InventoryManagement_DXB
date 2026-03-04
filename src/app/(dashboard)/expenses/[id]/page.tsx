import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getExpenseById } from "../actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, ArrowLeft } from "lucide-react";
import { DocumentSection } from "@/app/(dashboard)/documents/document-section";

export default async function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const { id } = await params;
  const expense = await getExpenseById(id);
  if (!expense) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/expenses">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Expenses
            </Link>
          </Button>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {expense.category.name} – {new Date(expense.expenseDate).toLocaleDateString()}
          </h1>
          <p className="text-muted-foreground">Expense details and attachments</p>
        </div>
        <Button asChild>
          <Link href={`/expenses/${id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <span className="text-sm text-muted-foreground">Category</span>
            <p className="font-medium">{expense.category.name}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Date</span>
            <p className="font-medium">
              {new Date(expense.expenseDate).toLocaleDateString()}
            </p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Amount</span>
            <p className="font-medium">
              {Number(expense.amount).toFixed(2)} {expense.currencyCode}
            </p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Recurring</span>
            <p className="font-medium">{expense.isRecurring ? "Yes" : "No"}</p>
          </div>
          {expense.description && (
            <div>
              <span className="text-sm text-muted-foreground">Description</span>
              <p className="font-medium">{expense.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <DocumentSection documentableType="Expense" documentableId={expense.id} />
    </div>
  );
}
