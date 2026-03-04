import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getClients } from "./actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { DeleteClientButton } from "./delete-client-button";

export default async function ClientsPage() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const clients = await getClients();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage your client contacts
          </p>
        </div>
        <Button asChild>
          <Link href="/clients/add">
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client List</CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No clients yet. Add clients to track your sales orders.
              </p>
              <Button asChild className="mt-4">
                <Link href="/clients/add">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Client
                </Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Payment Terms</TableHead>
                    <TableHead>Credit Limit</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.contactName ?? "-"}</TableCell>
                      <TableCell>{client.email ?? "-"}</TableCell>
                      <TableCell>{client.phone ?? "-"}</TableCell>
                      <TableCell>
                        {client.defaultPaymentTerms != null
                          ? `NET ${client.defaultPaymentTerms}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {client.creditLimit != null
                          ? Number(client.creditLimit).toLocaleString()
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/clients/${client.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/clients/${client.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <DeleteClientButton
                            clientId={client.id}
                            clientName={client.name}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
