import { PERMISSIONS, requirePermission } from "@/lib/permissions";

export default async function InventoryAddLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission(PERMISSIONS.INVENTORY_CREATE, { redirectTo: "/inventory" });
  return children;
}
