import { PERMISSIONS, requireModulePermission } from "@/lib/permissions";

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModulePermission(PERMISSIONS.VIEW_REPORTS);
  return children;
}
