import { PERMISSIONS, requireModulePermission } from "@/lib/permissions";

export default async function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModulePermission(PERMISSIONS.SALES_READ);
  return children;
}
