import { PERMISSIONS, requireModulePermission } from "@/lib/permissions";

export default async function SettingsCurrenciesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModulePermission(PERMISSIONS.SETTINGS_USERS_MANAGE, "/settings");
  return children;
}
