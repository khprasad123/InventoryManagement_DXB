import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseForm } from "../expense-form";
import { createExpense, getExpenseCategories } from "../actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import {
  getOrganizationCurrencies,
  getDefaultCurrencyCodeForOrg,
} from "@/lib/currency";

export default async function AddExpensePage() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const [categories, currencies, defaultCurrencyCode] = await Promise.all([
    getExpenseCategories(),
    getOrganizationCurrencies(orgId),
    getDefaultCurrencyCodeForOrg(orgId),
  ]);
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
          <ExpenseForm
            action={createExpense}
            categories={categories}
            currencies={currencies}
            defaultCurrencyCode={defaultCurrencyCode}
          />
        </CardContent>
      </Card>
    </div>
  );
}
