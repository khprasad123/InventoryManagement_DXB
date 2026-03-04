import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrganizationId } from "@/lib/auth-utils";
import { getItemCategories } from "../actions";
import { createItem } from "../actions";
import { ItemForm } from "../item-form";
import { redirect } from "next/navigation";

export default async function AddItemPage() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const categories = await getItemCategories(orgId);
  if (!categories.includes("General")) {
    categories.unshift("General");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add Item</h1>
        <p className="text-muted-foreground">
          Add a new item to your inventory
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Item Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ItemForm
            mode="add"
            categories={categories}
            onSubmit={createItem}
          />
        </CardContent>
      </Card>
    </div>
  );
}
