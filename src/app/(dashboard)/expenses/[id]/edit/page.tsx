import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseForm } from "../../expense-form";
import {
  getExpenseById,
  getExpenseCategories,
  updateExpense,
} from "../../actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect, notFound } from "next/navigation";
import {
  getOrganizationCurrencies,
  getDefaultCurrencyCodeForOrg,
} from "@/lib/currency";
import { DocumentSection } from "@/app/(dashboard)/documents/document-section";

export default async function EditExpensePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const { id } = await params;
  const [expense, categories, currencies, defaultCurrencyCode] =
    await Promise.all([
      getExpenseById(id),
      getExpenseCategories(),
      getOrganizationCurrencies(orgId),
      getDefaultCurrencyCodeForOrg(orgId),
    ]);

  if (!expense) notFound();

  async function updateAction(formData: FormData) {
    "use server";
    return updateExpense(id, formData);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Expense</h1>
        <p className="text-muted-foreground">
          {expense.category.name} •{" "}
          {new Date(expense.expenseDate).toLocaleDateString()}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Expense Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseForm
            action={updateAction}
            categories={categories}
            currencies={currencies}
            defaultCurrencyCode={defaultCurrencyCode}
            defaultValues={{
              categoryId: expense.categoryId,
              amount: Number(expense.amount).toString(),
              expenseDate: new Date(expense.expenseDate)
                .toISOString()
                .slice(0, 10),
              description: expense.description ?? "",
              isRecurring: expense.isRecurring,
              currencyCode: expense.currencyCode,
            }}
          />
        </CardContent>
      </Card>

      <DocumentSection documentableType="Expense" documentableId={expense.id} />
    </div>
  );
}
