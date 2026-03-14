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
import { getSupplierById } from "../actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, ArrowLeft } from "lucide-react";
import { calculateDueDate } from "@/lib/date-utils";
import { DocumentSection } from "@/app/(dashboard)/documents/document-section";

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const { id } = await params;
  const supplier = await getSupplierById(id);
  if (!supplier) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/suppliers">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Suppliers
            </Link>
          </Button>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {supplier.name}
          </h1>
          <p className="text-muted-foreground">Supplier details and purchase history</p>
        </div>
        <Button asChild>
          <Link href={`/suppliers/${id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <span className="text-sm text-muted-foreground">Contact</span>
              <p className="font-medium">{supplier.contactName ?? "-"}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Email</span>
              <p className="font-medium">{supplier.email ?? "-"}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Phone</span>
              <p className="font-medium">{supplier.phone ?? "-"}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Address</span>
              <p className="font-medium">{supplier.address ?? "-"}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Tax Number</span>
              <p className="font-medium">{supplier.taxNumber ?? "-"}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Payment Terms</span>
              <p className="font-medium">{supplier.paymentTerms ?? "-"}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Default Due Days</span>
              <p className="font-medium">
                {supplier.defaultPaymentTerms != null
                  ? `${supplier.defaultPaymentTerms} days`
                  : "-"}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Credit Limit</span>
              <p className="font-medium">
                {supplier.creditLimit != null
                  ? Number(supplier.creditLimit).toLocaleString()
                  : "-"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium">
              {supplier.purchaseOrders.length} PO(s) • {supplier.grns.length} GRN(s) • {supplier.purchaseInvoices.length} invoice(s)
            </p>
            <p className="text-sm text-muted-foreground">
              Invoices total:{" "}
              {supplier.purchaseInvoices
                .reduce(
                  (sum, inv) => sum + Number(inv.totalAmount),
                  0
                )
                .toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <p className="text-sm text-muted-foreground">
            Purchase orders, GRNs, and invoices for this supplier
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {supplier.purchaseOrders.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Purchase Orders</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplier.purchaseOrders.map((po) => (
                      <TableRow key={po.id}>
                        <TableCell className="font-medium">{po.poNo}</TableCell>
                        <TableCell>{new Date(po.orderDate).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">-</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          {supplier.grns.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Goods Received Notes</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>GRN No</TableHead>
                      <TableHead>Received Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplier.grns.map((grn) => (
                      <TableRow key={grn.id}>
                        <TableCell className="font-medium">{grn.grnNo}</TableCell>
                        <TableCell>{new Date(grn.receivedDate).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <div>
            <h3 className="text-sm font-medium mb-2">Purchase Invoices</h3>
          {supplier.purchaseInvoices.length === 0 && supplier.purchaseOrders.length === 0 && supplier.grns.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No transactions for this supplier yet.
            </p>
          ) : supplier.purchaseInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No purchase invoices yet.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplier.purchaseInvoices.map((inv) => {
                    const dueDate = inv.dueDate ?? calculateDueDate(
                      inv.invoiceDate,
                      supplier.defaultPaymentTerms
                    );
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">
                          {inv.invoiceNo}
                        </TableCell>
                        <TableCell>
                          {new Date(inv.invoiceDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {new Date(dueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {Number(inv.totalAmount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              inv.paymentStatus === "PAID"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                : inv.paymentStatus === "PARTIAL"
                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                : "bg-red-100 text-red-800 border-red-200"
                            }
                          >
                            {inv.paymentStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          </div>
        </CardContent>
      </Card>

      <DocumentSection documentableType="Supplier" documentableId={supplier.id} />
    </div>
  );
}
