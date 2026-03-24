import { requireSuperAdmin } from "@/lib/permissions";

export default async function SettingsPlanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperAdmin("/settings");
  return children;
}
