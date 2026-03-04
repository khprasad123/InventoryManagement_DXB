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
import { getSuppliers } from "./actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import { DeleteSupplierButton } from "./delete-supplier-button";

export default async function SuppliersPage() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const suppliers = await getSuppliers();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground">
            Manage your supplier contacts
          </p>
        </div>
        <Button asChild>
          <Link href="/suppliers/add">
            <Plus className="mr-2 h-4 w-4" />
            Add Supplier
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supplier List</CardTitle>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No suppliers yet. Add suppliers to track your purchase orders.
              </p>
              <Button asChild className="mt-4">
                <Link href="/suppliers/add">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Supplier
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
                          <Button variant="ghost" size="icon" asChild title="Edit">
                            <Link href={`/suppliers/${supplier.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <DeleteSupplierButton
                            supplierId={supplier.id}
                            supplierName={supplier.name}
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
