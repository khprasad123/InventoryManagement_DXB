import { PERMISSIONS, requireModulePermission } from "@/lib/permissions";

export default async function ClientsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModulePermission(PERMISSIONS.CLIENTS_READ);
  return children;
}
