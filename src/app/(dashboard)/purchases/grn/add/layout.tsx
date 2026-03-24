import { PERMISSIONS, requirePermission } from "@/lib/permissions";

export default async function GrnAddLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission(PERMISSIONS.PURCHASES_CREATE, { redirectTo: "/purchases/grn" });
  return children;
}
