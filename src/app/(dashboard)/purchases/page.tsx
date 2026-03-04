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
import { getPurchaseInvoices } from "./actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Package, FileText } from "lucide-react";

export default async function PurchasesPage() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const invoices = await getPurchaseInvoices();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchases</h1>
          <p className="text-muted-foreground">
            Purchase invoices and goods received
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/purchases/grn">
              <Package className="mr-2 h-4 w-4" />
              GRNs
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/purchases/grn/add">
              <Plus className="mr-2 h-4 w-4" />
              Create GRN
            </Link>
          </Button>
          <Button asChild>
            <Link href="/purchases/add">
              <FileText className="mr-2 h-4 w-4" />
              New Invoice
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No purchase invoices yet. Create a GRN to receive stock, then create an invoice.
              </p>
              <div className="mt-4 flex gap-2">
                <Button asChild variant="outline">
                  <Link href="/purchases/grn/add">Create GRN</Link>
                </Button>
                <Button asChild>
                  <Link href="/purchases/add">Create Invoice</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>GRN</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/purchases/${inv.id}`}
                          className="text-primary hover:underline"
                        >
                          {inv.invoiceNo}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {new Date(inv.invoiceDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{inv.supplier.name}</TableCell>
                      <TableCell>
                        {inv.grn ? (
                          <Link
                            href={`/purchases/grn/${inv.grn.id}`}
                            className="text-primary hover:underline"
                          >
                            {inv.grn.grnNo}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {Number(inv.totalAmount).toFixed(2)}
                      </TableCell>
                      <TableCell>{inv.paymentStatus}</TableCell>
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
