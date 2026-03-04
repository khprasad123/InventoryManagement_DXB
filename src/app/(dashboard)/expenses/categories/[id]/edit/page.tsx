import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseCategoryForm } from "../../../category-form";
import { getExpenseCategoryById, updateExpenseCategory } from "../../../actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect, notFound } from "next/navigation";

export default async function EditExpenseCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const { id } = await params;
  const category = await getExpenseCategoryById(id);
  if (!category) notFound();

  async function updateAction(formData: FormData) {
    "use server";
    return updateExpenseCategory(id, formData);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Category</h1>
        <p className="text-muted-foreground">{category.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Category Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpenseCategoryForm
            action={updateAction}
            defaultValues={{
              name: category.name,
              description: category.description ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
