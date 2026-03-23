"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";
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
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      logoUrl: true,
      sealUrl: true,
      phone: true,
      fax: true,
      website: true,
      taxRegistrationNo: true,
      bankDetails: true,
      timezone: true,
    },
  });
}

const updateOrgSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  address: z.string().min(1, "Address is required").max(500),
  phone: z.string().max(50).optional(),
  fax: z.string().max(50).optional(),
  website: z.string().max(200).optional(),
  taxRegistrationNo: z.string().max(100).optional(),
  bankDetails: z.string().max(500).optional(),
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
    address: formData.get("address") ?? "",
    phone: formData.get("phone") || undefined,
    fax: formData.get("fax") || undefined,
    website: formData.get("website") || undefined,
    taxRegistrationNo: formData.get("taxRegistrationNo") || undefined,
    bankDetails: formData.get("bankDetails") || undefined,
    timezone: formData.get("timezone") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await prisma.organization.update({
    where: { id: orgId },
    data: {
      name: parsed.data.name,
      address: parsed.data.address,
      phone: parsed.data.phone ?? null,
      fax: parsed.data.fax ?? null,
      website: parsed.data.website || null,
      taxRegistrationNo: parsed.data.taxRegistrationNo ?? null,
      bankDetails: parsed.data.bankDetails ?? null,
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

export async function uploadOrgSeal(formData: FormData): Promise<
  { error: string } | { success: true; url: string }
> {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await getCurrentUser();
  if (!isSuperAdmin(user)) {
    return { error: "Only the organization super admin can update seal." };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "File is required." };
  if (file.size > MAX_SIZE) return { error: "File must be under 2MB." };
  if (!IMAGE_TYPES.includes(file.type))
    return { error: "Allowed: PNG, JPEG, WebP." };

  const { put } = await import("@vercel/blob");
  const key = `org-${orgId}/seal/${Date.now()}.${file.name.split(".").pop()}`;
  const blob = await put(key, file, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  await prisma.organization.update({
    where: { id: orgId },
    data: { sealUrl: blob.url },
  });

  revalidatePath("/settings/org");
  return { success: true, url: blob.url };
}
