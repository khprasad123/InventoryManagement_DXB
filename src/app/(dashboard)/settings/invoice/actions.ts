"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { isSuperAdmin } from "@/lib/permissions";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export async function getInvoiceSettings() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await import("@/lib/auth-utils").then((m) => m.getCurrentUser());
  if (!isSuperAdmin(user)) redirect("/settings");

  return prisma.invoiceSettings.findUnique({
    where: { organizationId: orgId },
  });
}

const updateInvoiceSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(200),
  address: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  fax: z.string().max(50).optional(),
  website: z.string().max(200).optional(),
  taxRegistrationNo: z.string().max(100).optional(),
  bankDetails: z.string().max(500).optional(),
});

export async function updateInvoiceSettings(formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await import("@/lib/auth-utils").then((m) => m.getCurrentUser());
  if (!isSuperAdmin(user)) {
    return { error: "Only the organization super admin can update invoice settings." };
  }

  const parsed = updateInvoiceSchema.safeParse({
    companyName: formData.get("companyName"),
    address: formData.get("address") ?? "",
    phone: formData.get("phone") || undefined,
    fax: formData.get("fax") || undefined,
    website: formData.get("website") || undefined,
    taxRegistrationNo: formData.get("taxRegistrationNo") || undefined,
    bankDetails: formData.get("bankDetails") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  await prisma.invoiceSettings.upsert({
    where: { organizationId: orgId },
    create: {
      organizationId: orgId,
      companyName: parsed.data.companyName,
      address: parsed.data.address || null,
      phone: parsed.data.phone ?? null,
      fax: parsed.data.fax ?? null,
      website: parsed.data.website || null,
      taxRegistrationNo: parsed.data.taxRegistrationNo ?? null,
      bankDetails: parsed.data.bankDetails ?? null,
    },
    update: {
      companyName: parsed.data.companyName,
      address: parsed.data.address || null,
      phone: parsed.data.phone ?? null,
      fax: parsed.data.fax ?? null,
      website: parsed.data.website || null,
      taxRegistrationNo: parsed.data.taxRegistrationNo ?? null,
      bankDetails: parsed.data.bankDetails ?? null,
    },
  });

  revalidatePath("/settings/invoice");
  revalidatePath("/settings/org");
  return { success: true };
}

export async function uploadInvoiceLogo(formData: FormData): Promise<
  { error: string } | { success: true; url: string }
> {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await import("@/lib/auth-utils").then((m) => m.getCurrentUser());
  if (!isSuperAdmin(user)) {
    return { error: "Only the organization super admin can update invoice logo." };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { error: "File is required." };
  if (file.size > MAX_SIZE) return { error: "File must be under 2MB." };
  if (!IMAGE_TYPES.includes(file.type))
    return { error: "Allowed: PNG, JPEG, WebP." };

  const { put } = await import("@vercel/blob");
  const key = `org-${orgId}/invoice-logo/${Date.now()}.${file.name.split(".").pop()}`;
  const blob = await put(key, file, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  const existing = await prisma.invoiceSettings.findUnique({
    where: { organizationId: orgId },
  });
  if (existing) {
    await prisma.invoiceSettings.update({
      where: { organizationId: orgId },
      data: { invoiceLogoUrl: blob.url },
    });
  } else {
    const org = await prisma.organization.findFirst({
      where: { id: orgId },
      select: { name: true },
    });
    await prisma.invoiceSettings.create({
      data: {
        organizationId: orgId,
        companyName: org?.name ?? "Company",
        invoiceLogoUrl: blob.url,
      },
    });
  }

  revalidatePath("/settings/invoice");
  return { success: true, url: blob.url };
}

export async function uploadInvoiceSeal(formData: FormData): Promise<
  { error: string } | { success: true; url: string }
> {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await import("@/lib/auth-utils").then((m) => m.getCurrentUser());
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

  const existing = await prisma.invoiceSettings.findUnique({
    where: { organizationId: orgId },
  });
  if (existing) {
    await prisma.invoiceSettings.update({
      where: { organizationId: orgId },
      data: { sealUrl: blob.url },
    });
  } else {
    const org = await prisma.organization.findFirst({
      where: { id: orgId },
      select: { name: true },
    });
    await prisma.invoiceSettings.create({
      data: {
        organizationId: orgId,
        companyName: org?.name ?? "Company",
        sealUrl: blob.url,
      },
    });
  }

  revalidatePath("/settings/invoice");
  return { success: true, url: blob.url };
}
