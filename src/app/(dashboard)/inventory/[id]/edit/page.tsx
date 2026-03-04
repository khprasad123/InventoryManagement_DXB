import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrganizationId } from "@/lib/auth-utils";
import { getItemById, getItemCategories, updateItem } from "../../actions";
import { ItemForm } from "../../item-form";
import { redirect, notFound } from "next/navigation";

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const { id } = await params;
  const item = await getItemById(id);
  if (!item) notFound();

  const categories = await getItemCategories(orgId);
  if (!categories.includes("General")) {
    categories.unshift("General");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Item</h1>
        <p className="text-muted-foreground">
          Update {item.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Item Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ItemForm
            mode="edit"
            item={item}
            categories={categories}
            onSubmit={(formData) => updateItem(id, formData)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
