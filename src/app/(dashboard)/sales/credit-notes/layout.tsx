import type { ReactNode } from "react";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";

export default async function Layout({ children }: { children: ReactNode }) {
  await requirePermission(PERMISSIONS.SALES_READ, { redirectTo: "/dashboard" });
  return children;
}

