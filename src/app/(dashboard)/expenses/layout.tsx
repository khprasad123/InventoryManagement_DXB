import { PERMISSIONS, requireModulePermission } from "@/lib/permissions";

export default async function ExpensesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModulePermission(PERMISSIONS.EXPENSES_READ);
  return children;
}
