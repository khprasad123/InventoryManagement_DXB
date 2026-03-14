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
import { getPurchaseOrderById } from "../../actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const { id } = await params;
  const po = await getPurchaseOrderById(id);
  if (!po) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/purchases/purchase-orders">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to POs
            </Link>
          </Button>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{po.poNo}</h1>
          <p className="text-muted-foreground">
            {po.supplier.name} • {new Date(po.orderDate).toLocaleDateString()}
          </p>
        </div>
        <Button asChild>
          <Link href={`/purchases/grn/add?poId=${po.id}`}>Create GRN from PO</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <span className="text-sm text-muted-foreground">PR</span>
            <p>
              <Link
                href={`/purchases/purchase-requests/${po.purchaseRequest.id}`}
                className="font-medium text-primary hover:underline"
              >
                {po.purchaseRequest.prNo}
              </Link>
            </p>
          </div>
          <div>
            <span className="text-sm text-muted-foreground">Supplier</span>
            <p>
              <Link
                href={`/suppliers/${po.supplier.id}`}
                className="font-medium text-primary hover:underline"
              >
                {po.supplier.name}
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {po.items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.item.name}</TableCell>
                    <TableCell>{it.item.sku}</TableCell>
                    <TableCell className="text-right">{it.quantity}</TableCell>
                    <TableCell className="text-right">
                      {Number(it.unitPrice).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(it.total).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
