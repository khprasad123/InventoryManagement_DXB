import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getNextPrNo, getSalesOrdersForPr } from "@/app/(dashboard)/purchases/actions";
import { PrForm } from "../pr-form";

export default async function AddPurchaseRequestPage() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const [items, nextPrNo, salesOrders] = await Promise.all([
    prisma.item.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { name: "asc" },
    }),
    getNextPrNo(),
    getSalesOrdersForPr(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Purchase Request</h1>
        <p className="text-muted-foreground">
          Add items and quantities. No prices at this stage. Submit for approval to create POs.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Request</CardTitle>
        </CardHeader>
        <CardContent>
          <PrForm items={items} salesOrders={salesOrders} defaultPrNo={nextPrNo} />
        </CardContent>
      </Card>
    </div>
  );
}
