import { PERMISSIONS, requirePermission } from "@/lib/permissions";

export default async function SalesAddLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission(PERMISSIONS.SALES_CREATE, { redirectTo: "/sales" });
  return children;
}
