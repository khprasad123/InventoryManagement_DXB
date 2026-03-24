import { PERMISSIONS, requireModulePermission } from "@/lib/permissions";

export default async function SuppliersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModulePermission(PERMISSIONS.SUPPLIERS_READ);
  return children;
}
