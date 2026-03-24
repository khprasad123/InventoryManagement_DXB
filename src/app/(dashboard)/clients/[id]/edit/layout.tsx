import { PERMISSIONS, requirePermission } from "@/lib/permissions";

export default async function ClientsEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission(PERMISSIONS.CLIENTS_UPDATE, { redirectTo: "/clients" });
  return children;
}
