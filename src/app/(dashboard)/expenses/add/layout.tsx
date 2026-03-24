import { PERMISSIONS, requirePermission } from "@/lib/permissions";

export default async function ExpensesAddLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission(PERMISSIONS.EXPENSES_CREATE, { redirectTo: "/expenses" });
  return children;
}
