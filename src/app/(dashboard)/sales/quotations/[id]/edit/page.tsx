import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuotationForm } from "../../../quotation-form";
import { getQuotationById, getNextQuotationNo, updateQuotation } from "../../../actions";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function EditQuotationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const { id } = await params;
  const quotation = await getQuotationById(id);
  if (!quotation) notFound();
  if (quotation.salesOrder?.salesInvoices?.length) {
    redirect("/sales/quotations");
  }

  const [clients, items, defaultQuotationNo] = await Promise.all([
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
  ]);

  const defaultValues = {
    quotationNo: quotation.quotationNo,
    quotationDate: new Date(quotation.quotationDate).toISOString().slice(0, 10),
    clientId: quotation.clientId,
    status: quotation.status,
    notes: quotation.notes ?? undefined,
    validUntil: quotation.validUntil
      ? new Date(quotation.validUntil).toISOString().slice(0, 10)
      : undefined,
    items: quotation.items.map((i) => ({
      itemId: i.itemId,
      quantity: i.quantity,
      purchaseCost: Number(i.purchaseCost),
      margin: Number(i.margin),
    })),
  };

  async function updateQuotationAction(formData: FormData) {
    "use server";
    return updateQuotation(id, formData);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Quotation</h1>
        <p className="text-muted-foreground">Update {quotation.quotationNo}</p>
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
            mode="edit"
            quotationId={id}
            defaultValues={defaultValues}
            updateAction={updateQuotationAction}
          />
        </CardContent>
      </Card>
    </div>
  );
}
