import { PERMISSIONS, requirePermission } from "@/lib/permissions";

export default async function PurchaseRequestsEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission(PERMISSIONS.PURCHASES_UPDATE, { redirectTo: "/purchases/purchase-requests" });
  return children;
}
