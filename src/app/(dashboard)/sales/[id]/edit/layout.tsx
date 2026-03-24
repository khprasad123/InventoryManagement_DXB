import { PERMISSIONS, requirePermission } from "@/lib/permissions";

export default async function SalesEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission(PERMISSIONS.SALES_UPDATE, { redirectTo: "/sales" });
  return children;
}
