import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrganizationId } from "@/lib/auth-utils";
import { createClient } from "../actions";
import { ClientForm } from "../client-form";
import { redirect } from "next/navigation";

export default async function AddClientPage() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add Client</h1>
        <p className="text-muted-foreground">Add a new client</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientForm mode="add" onSubmit={createClient} />
        </CardContent>
      </Card>
    </div>
  );
}
