import { PERMISSIONS, requirePermission } from "@/lib/permissions";

export default async function PurchasesEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission(PERMISSIONS.PURCHASES_UPDATE, { redirectTo: "/purchases" });
  return children;
}
