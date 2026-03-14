import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { getApprovedPurchaseRequests, getNextPoNo } from "../../actions";
import { getSuppliers } from "@/app/(dashboard)/suppliers/actions";
import { PoForm } from "../po-form";

export default async function AddPurchaseOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ prId?: string }>;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const { prId } = await searchParams;

  const [prs, suppliers, nextPoNo] = await Promise.all([
    getApprovedPurchaseRequests(),
    getSuppliers(),
    getNextPoNo(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Purchase Order</h1>
        <p className="text-muted-foreground">
          Select an approved PR, choose supplier, and set prices. Items must come from the PR.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Order</CardTitle>
        </CardHeader>
        <CardContent>
          <PoForm
            prs={prs}
            suppliers={suppliers}
            defaultPoNo={nextPoNo}
            defaultPrId={prId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
