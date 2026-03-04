import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseCategoryForm } from "../../category-form";
import { createExpenseCategory } from "../../actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

export default async function AddExpenseCategoryPage() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add Category</h1>
        <p className="text-muted-foreground">
          Create a new expense category
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Category Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseCategoryForm action={createExpenseCategory} />
        </CardContent>
      </Card>
    </div>
  );
}
