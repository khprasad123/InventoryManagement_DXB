import { PERMISSIONS, requirePermission } from "@/lib/permissions";

export default async function PurchaseRequestsAddLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission(PERMISSIONS.PURCHASES_CREATE, { redirectTo: "/purchases/purchase-requests" });
  return children;
}
