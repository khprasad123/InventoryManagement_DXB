import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrganizationId } from "@/lib/auth-utils";
import { getNextGrnNo, getPurchaseOrdersForGrn } from "../../actions";
import { getSuppliers } from "@/app/(dashboard)/suppliers/actions";
import { prisma } from "@/lib/prisma";
import { GrnForm } from "../../grn-form";
import { redirect } from "next/navigation";

export default async function AddGrnPage({
  searchParams,
}: {
  searchParams: Promise<{ poId?: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const { poId } = await searchParams;

  const [suppliers, items, nextGrnNo, purchaseOrders] = await Promise.all([
    getSuppliers(),
    prisma.item.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { name: "asc" },
    }),
    getNextGrnNo(),
    getPurchaseOrdersForGrn(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create GRN</h1>
        <p className="text-muted-foreground">
          Receive goods and update stock with weighted average cost
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Goods Received Note</CardTitle>
        </CardHeader>
        <CardContent>
          <GrnForm
            suppliers={suppliers}
            items={items}
            purchaseOrders={purchaseOrders}
            defaultGrnNo={nextGrnNo}
            defaultPoId={poId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
