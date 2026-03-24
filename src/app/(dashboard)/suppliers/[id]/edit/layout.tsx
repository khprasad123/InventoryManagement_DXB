import { PERMISSIONS, requirePermission } from "@/lib/permissions";

export default async function SuppliersEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission(PERMISSIONS.SUPPLIERS_UPDATE, { redirectTo: "/suppliers" });
  return children;
}
