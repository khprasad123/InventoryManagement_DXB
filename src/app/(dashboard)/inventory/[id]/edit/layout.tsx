import { PERMISSIONS, requirePermission } from "@/lib/permissions";

export default async function InventoryEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission(PERMISSIONS.INVENTORY_UPDATE, { redirectTo: "/inventory" });
  return children;
}
