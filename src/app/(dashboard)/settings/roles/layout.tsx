import { PERMISSIONS, requireModulePermission } from "@/lib/permissions";

export default async function SettingsRolesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModulePermission(PERMISSIONS.SETTINGS_ROLES_MANAGE, "/settings");
  return children;
}
