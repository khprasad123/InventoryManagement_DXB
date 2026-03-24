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
import { getClientsPaginated } from "./actions";
import { getCurrentUser, getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Eye, Download } from "lucide-react";
import { DeleteClientButton } from "./delete-client-button";
import { CsvBulkImportCard } from "@/components/bulk-import/csv-bulk-import-card";
import { PaginationLinks } from "@/components/ui/pagination-links";
import { SearchInput } from "@/components/ui/search-input";
import { canUser, PERMISSIONS } from "@/lib/permissions";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  const user = await getCurrentUser();
  if (!canUser(user, PERMISSIONS.CLIENTS_READ)) redirect("/dashboard");
  const canCreateClients = canUser(user, PERMISSIONS.CLIENTS_CREATE);
  const canUpdateClients = canUser(user, PERMISSIONS.CLIENTS_UPDATE);
  const canDeleteClients = canUser(user, PERMISSIONS.CLIENTS_DELETE);
  const canUploadTemplate = canCreateClients || canUpdateClients;

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.search ?? "";

  const { clients, total, pageSize, totalPages, currentPage } = await getClientsPaginated(page, search);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">
            Manage your client contacts
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-full sm:w-[240px]">
            <SearchInput value={search} placeholder="Search clients..." />
          </div>
          {canCreateClients && (
            <Button asChild>
              <Link href="/clients/add">
                <Plus className="mr-2 h-4 w-4" />
                Add Client
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href={`/api/exports/clients?search=${encodeURIComponent(search)}`}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Link>
          </Button>
        </div>
      </div>

      {canUploadTemplate && (
        <CsvBulkImportCard
          title="Bulk Import Clients"
          subtitle="Download the CSV template, edit it, then upload to upsert clients. Import key: email if present, otherwise phone, otherwise name."
          endpoint="/api/bulk-import/clients"
          templateFileName="clients-template.csv"
          entityLabel="Clients"
          templateCsv={
            [
              "name,contactName,email,phone,address,siteLocation,building,taxNumber,defaultPaymentTerms,agreedDueDays,creditLimit",
              "Client Co,Jane Doe,client@example.com,+971 50 123 4567,Main street,Ajman,Building A,TRN987,NET 30,30,50000",
            ].join("\n") + "\n"
          }
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Client List</CardTitle>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No clients yet. Add clients to track your sales orders.
              </p>
              {canCreateClients && (
                <Button asChild className="mt-4">
                  <Link href="/clients/add">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Client
                  </Link>
                </Button>
              )}
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
                      <TableCell className="font-medium">
                        <Link
                          href={`/clients/${client.id}`}
                          className="text-primary hover:underline"
                        >
                          {client.name}
                        </Link>
                      </TableCell>
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
                          <Button variant="ghost" size="icon" asChild title="View details & documents">
                            <Link href={`/clients/${client.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          {canUpdateClients && (
                            <Button variant="ghost" size="icon" asChild title="Edit">
                              <Link href={`/clients/${client.id}/edit`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                          {canDeleteClients && (
                            <DeleteClientButton
                              clientId={client.id}
                              clientName={client.name}
                            />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <PaginationLinks
                page={currentPage}
                totalPages={totalPages}
                total={total}
                showingFrom={(currentPage - 1) * pageSize + 1}
                showingTo={Math.min(currentPage * pageSize, total)}
                prevHref={
                  currentPage <= 1
                    ? undefined
                    : `/clients?page=${currentPage - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`
                }
                nextHref={
                  currentPage >= totalPages
                    ? undefined
                    : `/clients?page=${currentPage + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
