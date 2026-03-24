import { PERMISSIONS, requireModulePermission } from "@/lib/permissions";

export default async function SettingsAuditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModulePermission(PERMISSIONS.VIEW_AUDIT, "/settings");
  return children;
}
