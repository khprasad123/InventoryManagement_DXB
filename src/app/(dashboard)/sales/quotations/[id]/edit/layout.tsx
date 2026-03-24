import { PERMISSIONS, requirePermission } from "@/lib/permissions";

export default async function SalesQuotationEditLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission(PERMISSIONS.SALES_UPDATE, { redirectTo: "/sales/quotations" });
  return children;
}
