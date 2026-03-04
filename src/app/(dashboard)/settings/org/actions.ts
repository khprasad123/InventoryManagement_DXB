"use server";

import { prisma } from "@/lib/prisma";
import { getOrganizationId, getCurrentUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { isSuperAdmin } from "@/lib/permissions";
import { del } from "@vercel/blob";

/**
 * Delete the current organization and all its data. Only the org super admin can do this.
 * Also deletes stored files (Vercel Blob) for the org's documents, then logs the user out.
 */
export async function deleteCurrentOrganization(): Promise<
  { error: string } | { success: true; mustLogout: true }
> {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await getCurrentUser();
  if (!isSuperAdmin(user)) {
    return { error: "Only the organization super admin can delete the organization." };
  }

  const userOrg = await prisma.userOrganization.findFirst({
    where: { userId: (user as { id?: string }).id, organizationId: orgId },
  });
  if (!userOrg?.isSuperAdmin) {
    return { error: "Only the organization super admin can delete the organization." };
  }

  const org = await prisma.organization.findFirst({
    where: { id: orgId, deletedAt: null },
  });
  if (!org) {
    return { error: "Organization not found." };
  }

  const documents = await prisma.document.findMany({
    where: { organizationId: orgId, deletedAt: null },
    select: { fileUrl: true },
  });

  const urls = documents.map((d) => d.fileUrl).filter(Boolean);
  if (urls.length > 0) {
    try {
      await del(urls);
    } catch {
      // ignore blob delete failures (e.g. URLs already gone)
    }
  }

  await prisma.auditLog.deleteMany({ where: { organizationId: orgId } });
  await prisma.rolePermission.deleteMany({
    where: { role: { organizationId: orgId } },
  });
  await prisma.userOrganization.deleteMany({ where: { organizationId: orgId } });
  await prisma.document.deleteMany({ where: { organizationId: orgId } });
  await prisma.expense.deleteMany({ where: { organizationId: orgId } });
  await prisma.clientPayment.deleteMany({ where: { organizationId: orgId } });
  await prisma.supplierPayment.deleteMany({ where: { organizationId: orgId } });
  await prisma.salesInvoiceItem.deleteMany({
    where: { salesInvoice: { organizationId: orgId } },
  });
  await prisma.purchaseInvoiceItem.deleteMany({
    where: { purchaseInvoice: { organizationId: orgId } },
  });
  await prisma.quotationItem.deleteMany({
    where: { quotation: { organizationId: orgId } },
  });
  await prisma.grnItem.deleteMany({
    where: { grn: { organizationId: orgId } },
  });
  await prisma.stockMovement.deleteMany({ where: { organizationId: orgId } });
  await prisma.salesInvoice.deleteMany({ where: { organizationId: orgId } });
  await prisma.purchaseInvoice.deleteMany({ where: { organizationId: orgId } });
  await prisma.quotation.deleteMany({ where: { organizationId: orgId } });
  await prisma.grn.deleteMany({ where: { organizationId: orgId } });
  await prisma.client.deleteMany({ where: { organizationId: orgId } });
  await prisma.supplier.deleteMany({ where: { organizationId: orgId } });
  await prisma.item.deleteMany({ where: { organizationId: orgId } });
  await prisma.currency.deleteMany({ where: { organizationId: orgId } });
  await prisma.expenseCategory.deleteMany({ where: { organizationId: orgId } });
  await prisma.role.deleteMany({ where: { organizationId: orgId } });
  await prisma.organization.delete({ where: { id: orgId } });

  return { success: true, mustLogout: true };
}

export async function getCurrentOrgInfo() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await getCurrentUser();
  if (!isSuperAdmin(user)) redirect("/settings");

  return prisma.organization.findFirst({
    where: { id: orgId, deletedAt: null },
    select: { id: true, name: true, slug: true },
  });
}
