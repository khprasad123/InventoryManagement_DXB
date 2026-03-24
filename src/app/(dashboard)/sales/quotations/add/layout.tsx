import { PERMISSIONS, requirePermission } from "@/lib/permissions";

export default async function SalesQuotationAddLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission(PERMISSIONS.SALES_CREATE, { redirectTo: "/sales/quotations" });
  return children;
}
