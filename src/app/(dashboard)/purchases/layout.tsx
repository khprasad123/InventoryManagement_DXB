import { PERMISSIONS, requireModulePermission } from "@/lib/permissions";

export default async function PurchasesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModulePermission(PERMISSIONS.PURCHASES_READ);
  return children;
}
