import { PERMISSIONS, requirePermission } from "@/lib/permissions";

export default async function ExpensesEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission(PERMISSIONS.EXPENSES_UPDATE, { redirectTo: "/expenses" });
  return children;
}
