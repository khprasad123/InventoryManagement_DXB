import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SalesInvoiceForm } from "../sales-invoice-form";
import { getNextInvoiceNo, getQuotations } from "../actions";
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

  const [clients, items, quotations, defaultInvoiceNo, currencies, defaultCurrencyCode] =
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
          sellingPrice: true,
        },
        orderBy: { name: "asc" },
      })
      .then((rows) =>
        rows.map((r) => ({
          ...r,
          sellingPrice: Number(r.sellingPrice),
        }))
      ),
    getQuotations().then((qs) =>
      qs
        .filter((q) => q.status === "APPROVED" && !q.salesInvoice)
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
          Create from quotation or add items directly
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
            defaultInvoiceNo={defaultInvoiceNo}
            currencies={currencies}
            defaultCurrencyCode={defaultCurrencyCode}
          />
        </CardContent>
      </Card>
    </div>
  );
}
