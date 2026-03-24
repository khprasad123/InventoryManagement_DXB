import { PERMISSIONS, requirePermission } from "@/lib/permissions";

export default async function PurchaseOrdersAddLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission(PERMISSIONS.PURCHASES_CREATE, { redirectTo: "/purchases/purchase-orders" });
  return children;
}
