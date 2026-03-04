import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

export default async function PurchasesPage() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const purchases = await prisma.purchaseInvoice.findMany({
    where: { organizationId: orgId, deletedAt: null },
    include: { supplier: true },
    orderBy: { invoiceDate: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Purchases</h1>
        <p className="text-muted-foreground">
          Track purchase invoices and incoming stock
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Purchase Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {purchases.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No purchase invoices yet. Record purchases to track incoming
              inventory.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Invoice</th>
                    <th className="px-4 py-3 text-left font-medium">Supplier</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        {new Date(purchase.invoiceDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">{purchase.invoiceNo}</td>
                      <td className="px-4 py-3">{purchase.supplier.name}</td>
                      <td className="px-4 py-3 text-right">
                        {Number(purchase.totalAmount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">{purchase.paymentStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
