import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Users, ShoppingCart, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-utils";

export default async function DashboardPage() {
  const user = await requireAuth();
  const orgId = user.organizationId;

  const [itemCount, supplierCount, purchaseCount, saleCount] =
    await Promise.all([
      prisma.item.count({
        where: { organizationId: orgId, deletedAt: null },
      }),
      prisma.supplier.count({
        where: { organizationId: orgId, deletedAt: null },
      }),
      prisma.purchaseInvoice.count({
        where: { organizationId: orgId, deletedAt: null },
      }),
      prisma.salesInvoice.count({
        where: { organizationId: orgId, deletedAt: null },
      }),
    ]);

  const stats = [
    {
      title: "Items",
      value: itemCount,
      icon: Package,
      description: "Total inventory items",
    },
    {
      title: "Suppliers",
      value: supplierCount,
      icon: Users,
      description: "Active suppliers",
    },
    {
      title: "Purchase Invoices",
      value: purchaseCount,
      icon: ShoppingCart,
      description: "Total purchase orders",
    },
    {
      title: "Sales Invoices",
      value: saleCount,
      icon: TrendingUp,
      description: "Total sales orders",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of {user.organizationName}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
