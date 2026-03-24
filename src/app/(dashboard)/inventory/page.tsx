import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getItemsPaginated,
  getItemCategories,
} from "./actions";
import { getCurrentUser, getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Package, Eye } from "lucide-react";
import { Suspense } from "react";
import { InventoryFilters } from "./inventory-filters";
import { DeleteItemButton } from "./delete-item-button";
import { StockMovementDialog } from "./stock-movement-dialog";
import { CsvBulkImportCard } from "@/components/bulk-import/csv-bulk-import-card";
import { canAdjustStock, canUser, PERMISSIONS } from "@/lib/permissions";

const ITEMS_PER_PAGE = 10;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; search?: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  const user = await getCurrentUser();
  if (!canUser(user, PERMISSIONS.INVENTORY_READ)) redirect("/dashboard");
  const canCreateInventory = canUser(user, PERMISSIONS.INVENTORY_CREATE);
  const canUpdateInventory = canUser(user, PERMISSIONS.INVENTORY_UPDATE);
  const canDeleteInventory = canUser(user, PERMISSIONS.INVENTORY_DELETE);
  const canUploadTemplate = canCreateInventory || canUpdateInventory;
  const canAdjustInventoryStock = canAdjustStock(user);

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const categoryFilter = params.category ?? "all";
  const search = params.search ?? "";

  const { items, total, totalPages, currentPage } =
    await getItemsPaginated(page, categoryFilter, search);
  const categories = await getItemCategories(orgId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            Manage your product inventory
          </p>
        </div>
        {canCreateInventory && (
          <Button asChild>
            <Link href="/inventory/add">
              <Plus className="mr-2 h-4 w-4" />
              Add Item
            </Link>
          </Button>
        )}
      </div>

      {canUploadTemplate && (
        <CsvBulkImportCard
          title="Bulk Import Inventory"
          subtitle="Download the CSV template, edit it, then upload to upsert items by SKU. A per-row import log is generated."
          endpoint="/api/bulk-import/inventory-items"
          templateFileName="inventory-items-template.csv"
          entityLabel="Inventory Items"
          templateCsv={
            [
              "sku,name,description,category,unit,defaultPurchaseCost,defaultMargin,minStock",
              "ITM-001,Item name,Optional description,General,pcs,0,0,0",
            ].join("\n") + "\n"
          }
        />
      )}

      <Card>
        <CardHeader>
          <Suspense fallback={null}>
            <InventoryFilters
              categoryFilter={categoryFilter}
              categories={categories}
              search={search}
            />
          </Suspense>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No items yet. Add items to manage your inventory.
              </p>
              {canCreateInventory && (
                <Button asChild className="mt-4">
                  <Link href="/inventory/add">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead className="text-right">Selling</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => {
                      const isLowStock = item.stockQty <= item.minStock;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.sku}</TableCell>
                          <TableCell>
                            <Link
                              href={`/inventory/${item.id}`}
                              className="text-primary hover:underline"
                            >
                              {item.name}
                            </Link>
                          </TableCell>
                          <TableCell>{item.category ?? "-"}</TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell className="text-right">
                            {item.stockQty}
                          </TableCell>
                          <TableCell className="text-right">
                            {Number(item.defaultPurchaseCost).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {(Number(item.defaultPurchaseCost) * (1 + Number(item.defaultMargin) / 100)).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {isLowStock ? (
                              <Badge variant="danger">Low Stock</Badge>
                            ) : (
                              <Badge variant="success">In Stock</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {canAdjustInventoryStock && (
                                <StockMovementDialog
                                  item={{
                                    id: item.id,
                                    name: item.name,
                                    sku: item.sku,
                                    stockQty: item.stockQty,
                                  }}
                                />
                              )}
                              <Button variant="ghost" size="icon" asChild title="View details & documents">
                                <Link href={`/inventory/${item.id}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              {canUpdateInventory && (
                                <Button variant="ghost" size="icon" asChild title="Edit">
                                  <Link href={`/inventory/${item.id}/edit`}>
                                    <Pencil className="h-4 w-4" />
                                  </Link>
                                </Button>
                              )}
                              {canDeleteInventory && (
                                <DeleteItemButton itemId={item.id} itemName={item.name} />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                    {Math.min(currentPage * ITEMS_PER_PAGE, total)} of {total}{" "}
                    items
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      disabled={currentPage <= 1}
                    >
                      <Link
                        href={
                          currentPage <= 1
                            ? "#"
                            : `/inventory?page=${currentPage - 1}${
                                categoryFilter !== "all"
                                  ? `&category=${categoryFilter}`
                                  : ""
                              }`
                        }
                      >
                        Previous
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      disabled={currentPage >= totalPages}
                    >
                      <Link
                        href={
                          currentPage >= totalPages
                            ? "#"
                            : `/inventory?page=${currentPage + 1}${
                                categoryFilter !== "all"
                                  ? `&category=${categoryFilter}`
                                  : ""
                              }`
                        }
                      >
                        Next
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
