import { PERMISSIONS, requirePermission } from "@/lib/permissions";

export default async function PurchasesAddLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission(PERMISSIONS.PURCHASES_CREATE, { redirectTo: "/purchases" });
  return children;
}
