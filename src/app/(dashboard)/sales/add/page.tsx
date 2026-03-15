import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SalesInvoiceForm } from "../sales-invoice-form";
import { getNextInvoiceNo, getQuotations, getSalesOrders } from "../actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  getOrganizationCurrencies,
  getDefaultCurrencyCodeForOrg,
} from "@/lib/currency";

export default async function AddSalesInvoicePage() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const [clients, items, quotations, salesOrders, defaultInvoiceNo, currencies, defaultCurrencyCode] =
    await Promise.all([
    prisma.client.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { name: "asc" },
    }),
    prisma.item
      .findMany({
        where: { organizationId: orgId, deletedAt: null },
        select: {
          id: true,
          sku: true,
          name: true,
          stockQty: true,
          defaultPurchaseCost: true,
          defaultMargin: true,
        },
        orderBy: { name: "asc" },
      })
      .then((rows) =>
        rows.map((r) => {
          const cost = Number(r.defaultPurchaseCost);
          const margin = Number(r.defaultMargin);
          const sellingPrice = cost * (1 + margin / 100);
          return {
            id: r.id,
            sku: r.sku,
            name: r.name,
            stockQty: r.stockQty,
            sellingPrice,
          };
        })
      ),
    getQuotations().then((qs) =>
      qs
        .filter((q) => q.status === "APPROVED" && !q.salesOrder?.salesInvoices?.length)
        .map((q) => ({
          id: q.id,
          quotationNo: q.quotationNo,
          clientId: q.clientId,
          items: q.items.map((i) => ({
            itemId: i.itemId,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice),
          })),
        }))
    ),
    getSalesOrders().then((orders) =>
      orders
        .filter((so) => !so.salesInvoices?.length)
        .map((so) => ({
          id: so.id,
          orderNo: so.orderNo,
          clientName: so.quotation?.client?.name ?? "—",
          jobId: so.jobId ?? "—",
          itemCount: so.items.length,
        }))
    ),
    getNextInvoiceNo(),
    getOrganizationCurrencies(orgId),
    getDefaultCurrencyCodeForOrg(orgId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Create Sales Invoice
        </h1>
        <p className="text-muted-foreground">
          From Sales Order (locked items) or Ad hoc (manual entry, editable items)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <SalesInvoiceForm
            clients={clients}
            items={items}
            quotations={quotations}
            salesOrders={salesOrders}
            defaultInvoiceNo={defaultInvoiceNo}
            currencies={currencies}
            defaultCurrencyCode={defaultCurrencyCode}
          />
        </CardContent>
      </Card>
    </div>
  );
}
