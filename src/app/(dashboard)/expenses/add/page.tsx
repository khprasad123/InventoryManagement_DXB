import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseForm } from "../expense-form";
import { createExpense, getExpenseCategories } from "../actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

export default async function AddExpensePage() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const categories = await getExpenseCategories();
  if (categories.length === 0) {
    redirect("/expenses/categories/add");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add Expense</h1>
        <p className="text-muted-foreground">Record a new expense</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseForm action={createExpense} categories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
