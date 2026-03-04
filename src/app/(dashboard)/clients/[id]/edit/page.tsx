import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrganizationId } from "@/lib/auth-utils";
import { getClientById, updateClient } from "../../actions";
import { ClientForm } from "../../client-form";
import { redirect, notFound } from "next/navigation";
import { DocumentSection } from "@/app/(dashboard)/documents/document-section";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();

  async function updateAction(formData: FormData) {
    "use server";
    return updateClient(id, formData);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Client</h1>
        <p className="text-muted-foreground">Update {client.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm
            mode="edit"
            client={client}
            onSubmit={updateAction}
          />
        </CardContent>
      </Card>

      <DocumentSection documentableType="Client" documentableId={client.id} />
    </div>
  );
}
