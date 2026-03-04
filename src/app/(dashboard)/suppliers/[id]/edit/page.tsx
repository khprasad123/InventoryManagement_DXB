import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrganizationId } from "@/lib/auth-utils";
import { getSupplierById, updateSupplier } from "../../actions";
import { SupplierForm } from "../../supplier-form";
import { redirect, notFound } from "next/navigation";
import { DocumentSection } from "@/app/(dashboard)/documents/document-section";

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const { id } = await params;
  const supplier = await getSupplierById(id);
  if (!supplier) notFound();

  async function updateAction(formData: FormData) {
    "use server";
    return updateSupplier(id, formData);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Supplier</h1>
        <p className="text-muted-foreground">Update {supplier.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supplier Details</CardTitle>
        </CardHeader>
        <CardContent>
          <SupplierForm
            mode="edit"
            supplier={supplier}
            onSubmit={updateAction}
          />
        </CardContent>
      </Card>

      <DocumentSection documentableType="Supplier" documentableId={supplier.id} />
    </div>
  );
}
