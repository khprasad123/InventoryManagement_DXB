import { PERMISSIONS, requirePermission } from "@/lib/permissions";

export default async function ClientsAddLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission(PERMISSIONS.CLIENTS_CREATE, { redirectTo: "/clients" });
  return children;
}
