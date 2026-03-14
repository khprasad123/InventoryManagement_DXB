import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getItemById } from "../actions";
import { getOrganizationId, getCurrentUser } from "@/lib/auth-utils";
import { canAdjustStock } from "@/lib/permissions";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, ArrowLeft } from "lucide-react";
import { DocumentSection } from "@/app/(dashboard)/documents/document-section";
import { StockMovementDialog } from "../stock-movement-dialog";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const { id } = await params;
  const item = await getItemById(id);
  if (!item) notFound();

  const user = await getCurrentUser();
  const allowAdjustment = canAdjustStock(user);
  const isLowStock = item.stockQty <= item.minStock;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/inventory">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Inventory
            </Link>
          </Button>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {item.name}
          </h1>
          <p className="text-muted-foreground">
            {item.sku}
            {isLowStock && (
              <Badge variant="danger" className="ml-2">
                Low Stock
              </Badge>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <StockMovementDialog item={item} allowAdjustment={allowAdjustment} />
          <Button asChild>
            <Link href={`/inventory/${id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Item Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <span className="text-sm text-muted-foreground">SKU</span>
            <p className="font-medium">{item.sku}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Category</span>
            <p className="font-medium">{item.category ?? "-"}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Unit</span>
            <p className="font-medium">{item.unit}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Stock</span>
            <p className="font-medium">{item.stockQty}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Min stock</span>
            <p className="font-medium">{item.minStock}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Cost price</span>
            <p className="font-medium">{Number(item.defaultPurchaseCost).toFixed(2)}</p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Selling price</span>
            <p className="font-medium">{(Number(item.defaultPurchaseCost) * (1 + Number(item.defaultMargin) / 100)).toFixed(2)}</p>
          </div>
          {item.description && (
            <div>
              <span className="text-sm text-muted-foreground">Description</span>
              <p className="font-medium">{item.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <DocumentSection documentableType="Item" documentableId={item.id} />
    </div>
  );
}
