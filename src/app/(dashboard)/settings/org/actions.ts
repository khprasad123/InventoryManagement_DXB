"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getOrganizationId, getCurrentUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { isSuperAdmin } from "@/lib/permissions";

/**
 * Soft-delete the current organization data. Only org super admin can do this.
 * Physical deletes are blocked for safety and compliance.
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
    where: { userId: (user as { id?: string }).id, organizationId: orgId, deletedAt: null },
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

  const now = new Date();
  const deletedById = (user as { id?: string }).id ?? null;
  await prisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id: orgId },
      data: { deletedAt: now, deletedById: deletedById ?? undefined },
    });
    await tx.document.updateMany({ where: { organizationId: orgId, deletedAt: null }, data: { deletedAt: now, deletedById: deletedById ?? undefined } });
    await tx.expense.updateMany({ where: { organizationId: orgId, deletedAt: null }, data: { deletedAt: now, deletedById: deletedById ?? undefined } });
    await tx.clientPayment.updateMany({ where: { organizationId: orgId, deletedAt: null }, data: { deletedAt: now, deletedById: deletedById ?? undefined } });
    await tx.supplierPayment.updateMany({ where: { organizationId: orgId, deletedAt: null }, data: { deletedAt: now, deletedById: deletedById ?? undefined } });
    await tx.stockMovement.updateMany({ where: { organizationId: orgId, deletedAt: null }, data: { deletedAt: now, deletedById: deletedById ?? undefined } });
    await tx.salesInvoice.updateMany({ where: { organizationId: orgId, deletedAt: null }, data: { deletedAt: now, deletedById: deletedById ?? undefined } });
    await tx.purchaseInvoice.updateMany({ where: { organizationId: orgId, deletedAt: null }, data: { deletedAt: now, deletedById: deletedById ?? undefined } });
    await tx.quotation.updateMany({ where: { organizationId: orgId, deletedAt: null }, data: { deletedAt: now, deletedById: deletedById ?? undefined } });
    await tx.grn.updateMany({ where: { organizationId: orgId, deletedAt: null }, data: { deletedAt: now, deletedById: deletedById ?? undefined } });
    await tx.salesOrder.updateMany({ where: { organizationId: orgId, deletedAt: null }, data: { deletedAt: now, deletedById: deletedById ?? undefined } });
    await tx.purchaseOrder.updateMany({ where: { organizationId: orgId, deletedAt: null }, data: { deletedAt: now, deletedById: deletedById ?? undefined } });
    await tx.purchaseRequest.updateMany({ where: { organizationId: orgId, deletedAt: null }, data: { deletedAt: now, deletedById: deletedById ?? undefined } });
    await tx.client.updateMany({ where: { organizationId: orgId, deletedAt: null }, data: { deletedAt: now, deletedById: deletedById ?? undefined } });
    await tx.supplier.updateMany({ where: { organizationId: orgId, deletedAt: null }, data: { deletedAt: now, deletedById: deletedById ?? undefined } });
    await tx.item.updateMany({ where: { organizationId: orgId, deletedAt: null }, data: { deletedAt: now, deletedById: deletedById ?? undefined } });
    await tx.currency.updateMany({ where: { organizationId: orgId, deletedAt: null }, data: { deletedAt: now, deletedById: deletedById ?? undefined } });
    await tx.expenseCategory.updateMany({ where: { organizationId: orgId, deletedAt: null }, data: { deletedAt: now, deletedById: deletedById ?? undefined } });
    await tx.role.updateMany({ where: { organizationId: orgId, deletedAt: null }, data: { deletedAt: now, deletedById: deletedById ?? undefined } });
  });

  return { success: true, mustLogout: true };
}

export async function getCurrentOrgInfo() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await getCurrentUser();
  if (!isSuperAdmin(user)) redirect("/settings");

  return prisma.organization.findFirst({
    where: { id: orgId, deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      phone: true,
      fax: true,
      website: true,
      timezone: true,
    },
  });
}

const updateOrgSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  phone: z.string().max(50).optional(),
  fax: z.string().max(50).optional(),
  website: z.string().max(200).optional(),
  timezone: z.string().max(50).optional(),
});

export async function updateOrgSettings(formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await getCurrentUser();
  if (!isSuperAdmin(user)) {
    return { error: "Only the organization super admin can update settings." };
  }

  const parsed = updateOrgSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || undefined,
    fax: formData.get("fax") || undefined,
    website: formData.get("website") || undefined,
    timezone: formData.get("timezone") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      fax: parsed.data.fax ?? null,
      website: parsed.data.website || null,
      timezone: parsed.data.timezone ?? "UTC",
    },
  });

  revalidatePath("/settings/org");
  return { success: true };
}

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export async function uploadOrgLogo(formData: FormData): Promise<
  { error: string } | { success: true; url: string }
> {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await getCurrentUser();
  if (!isSuperAdmin(user)) {
    return { error: "Only the organization super admin can update logo." };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "File is required." };
  if (file.size > MAX_SIZE) return { error: "File must be under 2MB." };
  if (!IMAGE_TYPES.includes(file.type))
    return { error: "Allowed: PNG, JPEG, WebP." };

  const { put } = await import("@vercel/blob");
  const key = `org-${orgId}/logo/${Date.now()}.${file.name.split(".").pop()}`;
  const blob = await put(key, file, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  await prisma.organization.update({
    where: { id: orgId },
    data: { logoUrl: blob.url },
  });

  revalidatePath("/settings/org");
  return { success: true, url: blob.url };
}
