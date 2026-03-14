import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { getClientById } from "../actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Pencil, ArrowLeft } from "lucide-react";
import { calculateDueDate } from "@/lib/date-utils";
import { DocumentSection } from "@/app/(dashboard)/documents/document-section";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const { id } = await params;
  const client = await getClientById(id);
  if (!client) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/clients">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Clients
            </Link>
          </Button>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            {client.name}
          </h1>
          <p className="text-muted-foreground">
            Client details and sales history
          </p>
        </div>
        <Button asChild>
          <Link href={`/clients/${id}/edit`}>
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
              <p className="font-medium">{client.contactName ?? "-"}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Email</span>
              <p className="font-medium">{client.email ?? "-"}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Phone</span>
              <p className="font-medium">{client.phone ?? "-"}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Address</span>
              <p className="font-medium">{client.address ?? "-"}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Tax Number</span>
              <p className="font-medium">{client.taxNumber ?? "-"}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">
                Default Payment Terms
              </span>
              <p className="font-medium">
                {client.defaultPaymentTerms != null
                  ? `NET ${client.defaultPaymentTerms} days`
                  : "-"}
              </p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Credit Limit</span>
              <p className="font-medium">
                {client.creditLimit != null
                  ? Number(client.creditLimit).toLocaleString()
                  : "-"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {client.salesInvoices.length} invoice(s)
            </p>
            <p className="text-sm text-muted-foreground">
              Total:{" "}
              {client.salesInvoices
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
          <CardTitle>Sales History</CardTitle>
          <p className="text-sm text-muted-foreground">
            Due dates from invoice date + client default payment terms (
            {client.defaultPaymentTerms ?? 30} days)
          </p>
        </CardHeader>
        <CardContent>
          {client.salesInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sales invoices for this client yet.
            </p>
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
                  {client.salesInvoices.map((inv) => {
                    const dueDate =
                      inv.dueDate ??
                      calculateDueDate(
                        inv.invoiceDate,
                        client.agreedDueDays
                      );
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/sales/${inv.id}`}
                            className="text-primary hover:underline"
                          >
                            {inv.invoiceNo}
                          </Link>
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
        </CardContent>
      </Card>

      <DocumentSection documentableType="Client" documentableId={client.id} />
    </div>
  );
}
