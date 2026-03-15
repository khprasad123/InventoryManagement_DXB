import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPurchaseRequestById } from "@/app/(dashboard)/purchases/actions";
import { getSalesOrdersForPr } from "@/app/(dashboard)/purchases/actions";
import { prisma } from "@/lib/prisma";
import { PrForm } from "../../pr-form";

export default async function EditPurchaseRequestPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const { id } = await Promise.resolve(params);
  const pr = await getPurchaseRequestById(id);
  if (!pr) notFound();
  if (pr.status !== "DRAFT") notFound();

  const [items, salesOrders] = await Promise.all([
    prisma.item.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { name: "asc" },
    }),
    getSalesOrdersForPr(),
  ]);

  const initialPr = {
    id: pr.id,
    prNo: pr.prNo,
    notes: pr.notes,
    salesOrderId: pr.salesOrderId,
    jobId: pr.jobId,
    items: pr.items.map((i) => ({ itemId: i.itemId, quantity: i.quantity })),
  };

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/purchases/purchase-requests/${pr.id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to PR
          </Link>
        </Button>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Edit Purchase Request</h1>
        <p className="text-muted-foreground">{pr.prNo} – draft only; submit for approval when ready.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Request</CardTitle>
        </CardHeader>
        <CardContent>
          <PrForm
            items={items}
            salesOrders={salesOrders}
            defaultPrNo={pr.prNo}
            initialPr={initialPr}
          />
        </CardContent>
      </Card>
    </div>
  );
}
