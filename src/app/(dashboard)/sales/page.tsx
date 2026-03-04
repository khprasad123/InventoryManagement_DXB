import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

export default async function SalesPage() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const sales = await prisma.salesInvoice.findMany({
    where: { organizationId: orgId, deletedAt: null },
    include: { client: true },
    orderBy: { invoiceDate: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sales</h1>
        <p className="text-muted-foreground">
          Track sales invoices and outgoing stock
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sales Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sales invoices yet. Record sales to track outgoing inventory.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left font-medium">Date</th>
                    <th className="px-4 py-3 text-left font-medium">Invoice</th>
                    <th className="px-4 py-3 text-left font-medium">Client</th>
                    <th className="px-4 py-3 text-right font-medium">Amount</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        {new Date(sale.invoiceDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">{sale.invoiceNo}</td>
                      <td className="px-4 py-3">{sale.client.name}</td>
                      <td className="px-4 py-3 text-right">
                        {Number(sale.totalAmount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3">{sale.paymentStatus}</td>
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
