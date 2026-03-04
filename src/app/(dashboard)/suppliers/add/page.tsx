import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrganizationId } from "@/lib/auth-utils";
import { createSupplier } from "../actions";
import { SupplierForm } from "../supplier-form";
import { redirect } from "next/navigation";

export default async function AddSupplierPage() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add Supplier</h1>
        <p className="text-muted-foreground">Add a new supplier</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supplier Details</CardTitle>
        </CardHeader>
        <CardContent>
          <SupplierForm mode="add" onSubmit={createSupplier} />
        </CardContent>
      </Card>
    </div>
  );
}
