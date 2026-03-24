import { PERMISSIONS, requirePermission } from "@/lib/permissions";

export default async function SuppliersAddLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission(PERMISSIONS.SUPPLIERS_CREATE, { redirectTo: "/suppliers" });
  return children;
}
