import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSuppliersPaginated } from "./actions";
import { getCurrentUser, getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Eye, Download } from "lucide-react";
import { DeleteSupplierButton } from "./delete-supplier-button";
import { CsvBulkImportCard } from "@/components/bulk-import/csv-bulk-import-card";
import { PaginationLinks } from "@/components/ui/pagination-links";
import { SearchInput } from "@/components/ui/search-input";
import { canUser, PERMISSIONS } from "@/lib/permissions";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  const user = await getCurrentUser();
  if (!canUser(user, PERMISSIONS.SUPPLIERS_READ)) redirect("/dashboard");
  const canCreateSuppliers = canUser(user, PERMISSIONS.SUPPLIERS_CREATE);
  const canUpdateSuppliers = canUser(user, PERMISSIONS.SUPPLIERS_UPDATE);
  const canDeleteSuppliers = canUser(user, PERMISSIONS.SUPPLIERS_DELETE);
  const canUploadTemplate = canCreateSuppliers || canUpdateSuppliers;

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const search = params.search ?? "";

  const { suppliers, total, pageSize, totalPages, currentPage } = await getSuppliersPaginated(page, search);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground">
            Manage your supplier contacts
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="w-full sm:w-[240px]">
            <SearchInput value={search} placeholder="Search suppliers..." />
          </div>
          {canCreateSuppliers && (
            <Button asChild>
              <Link href="/suppliers/add">
                <Plus className="mr-2 h-4 w-4" />
                Add Supplier
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href={`/api/exports/suppliers?search=${encodeURIComponent(search)}`}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Link>
          </Button>
        </div>
      </div>

      {canUploadTemplate && (
        <CsvBulkImportCard
          title="Bulk Import Suppliers"
          subtitle="Download the CSV template, edit it, then upload to upsert suppliers. Import key: email if present, otherwise phone, otherwise name."
          endpoint="/api/bulk-import/suppliers"
          templateFileName="suppliers-template.csv"
          entityLabel="Suppliers"
          templateCsv={
            [
              "name,contactName,email,phone,address,paymentTerms,taxNumber,defaultPaymentTerms,creditLimit",
              "Supplier Co,Jane Doe,supplier@example.com,+971 50 123 4567,Main street,NET 30,TRN123,30,10000",
            ].join("\n") + "\n"
          }
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Supplier List</CardTitle>
        </CardHeader>
        <CardContent>
          {total === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No suppliers yet. Add suppliers to track your purchase orders.
              </p>
              {canCreateSuppliers && (
                <Button asChild className="mt-4">
                  <Link href="/suppliers/add">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Supplier
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
                  {suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/suppliers/${supplier.id}`}
                          className="text-primary hover:underline"
                        >
                          {supplier.name}
                        </Link>
                      </TableCell>
                      <TableCell>{supplier.contactName ?? "-"}</TableCell>
                      <TableCell>{supplier.email ?? "-"}</TableCell>
                      <TableCell>{supplier.phone ?? "-"}</TableCell>
                      <TableCell>
                        {supplier.defaultPaymentTerms != null
                          ? `NET ${supplier.defaultPaymentTerms}`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {supplier.creditLimit != null
                          ? Number(supplier.creditLimit).toLocaleString()
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" asChild title="View details & documents">
                            <Link href={`/suppliers/${supplier.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          {canUpdateSuppliers && (
                            <Button variant="ghost" size="icon" asChild title="Edit">
                              <Link href={`/suppliers/${supplier.id}/edit`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>
                          )}
                          {canDeleteSuppliers && (
                            <DeleteSupplierButton
                              supplierId={supplier.id}
                              supplierName={supplier.name}
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
                    : `/suppliers?page=${currentPage - 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`
                }
                nextHref={
                  currentPage >= totalPages
                    ? undefined
                    : `/suppliers?page=${currentPage + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`
                }
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
