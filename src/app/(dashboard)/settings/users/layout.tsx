import { getCurrentUser } from "@/lib/auth-utils";
import { canUser, PERMISSIONS } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function SettingsUsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const allowed =
    canUser(user, PERMISSIONS.SETTINGS_USERS_MANAGE) ||
    canUser(user, PERMISSIONS.SETTINGS_USERS_READ) ||
    canUser(user, PERMISSIONS.SETTINGS_USERS_CREATE) ||
    canUser(user, PERMISSIONS.SETTINGS_USERS_UPDATE) ||
    canUser(user, PERMISSIONS.SETTINGS_USERS_DELETE) ||
    canUser(user, PERMISSIONS.SETTINGS_USERS_RESET_PASSWORD);
  if (!allowed) redirect("/settings");
  return children;
}
