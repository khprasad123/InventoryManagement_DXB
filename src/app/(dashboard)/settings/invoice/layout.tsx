import { requireSuperAdmin } from "@/lib/permissions";

export default async function SettingsInvoiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperAdmin("/settings");
  return children;
}
