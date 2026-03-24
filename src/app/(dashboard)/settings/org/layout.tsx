import { requireSuperAdmin } from "@/lib/permissions";

export default async function SettingsOrgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperAdmin("/settings");
  return children;
}
