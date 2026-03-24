import { PERMISSIONS, requireModulePermission } from "@/lib/permissions";

export default async function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModulePermission(PERMISSIONS.INVENTORY_READ);
  return children;
}
