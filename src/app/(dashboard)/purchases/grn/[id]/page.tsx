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
import { getGrnById } from "../../actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function GrnDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const { id } = await params;
  const grn = await getGrnById(id);
  if (!grn) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/purchases/grn">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to GRNs
          </Link>
        </Button>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">{grn.grnNo}</h1>
        <p className="text-muted-foreground">
          {new Date(grn.receivedDate).toLocaleDateString()} • {grn.supplier.name}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Items Received</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grn.items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.item.name}</TableCell>
                    <TableCell>{it.item.sku}</TableCell>
                    <TableCell className="text-right">{it.quantity}</TableCell>
                    <TableCell className="text-right">
                      {Number(it.purchasePrice).toFixed(2)}
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

      {grn.purchaseInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Linked Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {grn.purchaseInvoices.map((inv) => (
                <li key={inv.id}>
                  <Link
                    href={`/purchases/${inv.id}`}
                    className="text-primary hover:underline"
                  >
                    {inv.invoiceNo} - {Number(inv.totalAmount).toFixed(2)}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
