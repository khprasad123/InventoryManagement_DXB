import { getCurrentUser } from "@/lib/auth-utils";
import { canUser, PERMISSIONS } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function SettingsRolesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const allowed =
    canUser(user, PERMISSIONS.SETTINGS_ROLES_MANAGE) ||
    canUser(user, PERMISSIONS.SETTINGS_ROLES_CREATE) ||
    canUser(user, PERMISSIONS.SETTINGS_ROLES_UPDATE) ||
    canUser(user, PERMISSIONS.SETTINGS_ROLES_DELETE);
  if (!allowed) redirect("/settings");
  return children;
}
