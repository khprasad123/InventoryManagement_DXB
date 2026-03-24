import { PERMISSIONS, requireModulePermission } from "@/lib/permissions";

export default async function SettingsUsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModulePermission(PERMISSIONS.SETTINGS_USERS_MANAGE, "/settings");
  return children;
}
