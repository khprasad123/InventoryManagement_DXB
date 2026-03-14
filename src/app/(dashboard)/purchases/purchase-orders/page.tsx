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
import { getPurchaseOrders } from "../actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";

export default async function PurchaseOrdersPage() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const pos = await getPurchaseOrders();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/purchases">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Purchases
            </Link>
          </Button>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Purchase Orders
          </h1>
          <p className="text-muted-foreground">
            Created from approved Purchase Requests.
          </p>
        </div>
        <Button asChild>
          <Link href="/purchases/purchase-orders/add">Create PO from PR</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Purchase Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {pos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No purchase orders yet. Create an approved PR first, then create a PO.
              </p>
              <div className="mt-4 flex gap-2">
                <Button asChild variant="outline">
                  <Link href="/purchases/purchase-requests">View PRs</Link>
                </Button>
                <Button asChild>
                  <Link href="/purchases/purchase-orders/add">Create PO</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>PR</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pos.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/purchases/purchase-orders/${po.id}`}
                          className="text-primary hover:underline"
                        >
                          {po.poNo}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {new Date(po.orderDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/purchases/purchase-requests/${po.purchaseRequest.id}`}
                          className="text-primary hover:underline"
                        >
                          {po.purchaseRequest.prNo}
                        </Link>
                      </TableCell>
                      <TableCell>{po.supplier.name}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/purchases/purchase-orders/${po.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
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
