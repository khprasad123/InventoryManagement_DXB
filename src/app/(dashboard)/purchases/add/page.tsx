import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getOrganizationId } from "@/lib/auth-utils";
import { getNextInvoiceNo } from "../actions";
import { getSuppliers } from "@/app/(dashboard)/suppliers/actions";
import { getGrns } from "../actions";
import { PurchaseInvoiceForm } from "../purchase-invoice-form";
import { redirect } from "next/navigation";

export default async function AddPurchaseInvoicePage() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const [suppliers, grns, nextInvoiceNo] = await Promise.all([
    getSuppliers(),
    getGrns(),
    getNextInvoiceNo(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Purchase Invoice</h1>
        <p className="text-muted-foreground">
          Create invoice. Due date auto-calculated from supplier payment terms.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          <PurchaseInvoiceForm
            suppliers={suppliers}
            grns={grns}
            defaultInvoiceNo={nextInvoiceNo}
          />
        </CardContent>
      </Card>
    </div>
  );
}
