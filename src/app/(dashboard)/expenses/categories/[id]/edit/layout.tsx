import { PERMISSIONS, requirePermission } from "@/lib/permissions";

export default async function ExpenseCategoryEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission(PERMISSIONS.EXPENSES_UPDATE, { redirectTo: "/expenses/categories" });
  return children;
}
