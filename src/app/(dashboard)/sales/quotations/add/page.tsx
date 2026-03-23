import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuotationForm } from "../../quotation-form";
import { getNextQuotationNo } from "../../actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function AddQuotationPage() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const [clients, items, defaultQuotationNo, invoiceSettings] = await Promise.all([
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
        rows.map((r) => ({
          id: r.id,
          sku: r.sku,
          name: r.name,
          stockQty: r.stockQty,
          defaultPurchaseCost: Number(r.defaultPurchaseCost),
          defaultMargin: Number(r.defaultMargin),
        }))
      ),
    getNextQuotationNo(),
    prisma.invoiceSettings.findUnique({
      where: { organizationId: orgId },
      select: { defaultTaxPercent: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Create Quotation
        </h1>
        <p className="text-muted-foreground">
          Add items and set prices for your client
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quotation Details</CardTitle>
        </CardHeader>
        <CardContent>
          <QuotationForm
            clients={clients}
            items={items}
            defaultQuotationNo={defaultQuotationNo}
            defaultTaxPercent={
              invoiceSettings ? Number(invoiceSettings.defaultTaxPercent) : 5
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
