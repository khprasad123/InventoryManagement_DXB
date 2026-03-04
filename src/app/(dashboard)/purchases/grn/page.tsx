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
import { getGrns } from "../actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Package } from "lucide-react";

export default async function GrnListPage() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const grns = await getGrns();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Goods Received Notes</h1>
          <p className="text-muted-foreground">
            Receive stock and update inventory
          </p>
        </div>
        <Button asChild>
          <Link href="/purchases/grn/add">
            <Plus className="mr-2 h-4 w-4" />
            Create GRN
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>GRN List</CardTitle>
        </CardHeader>
        <CardContent>
          {grns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No GRNs yet. Create a GRN to receive stock.
              </p>
              <Button asChild className="mt-4">
                <Link href="/purchases/grn/add">
                  <Plus className="mr-2 h-4 w-4" />
                  Create GRN
                </Link>
              </Button>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>GRN No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grns.map((grn) => (
                    <TableRow key={grn.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/purchases/grn/${grn.id}`}
                          className="text-primary hover:underline"
                        >
                          {grn.grnNo}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {new Date(grn.receivedDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{grn.supplier.name}</TableCell>
                      <TableCell className="text-right">
                        {grn.items.length}
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
