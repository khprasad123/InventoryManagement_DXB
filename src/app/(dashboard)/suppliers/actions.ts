"use server";

import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const supplierSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  contactName: z.string().max(255).optional(),
  email: z
    .string()
    .optional()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Invalid email"),
  phone: z.string().max(50).optional(),
  address: z.string().optional(),
  taxNumber: z.string().max(50).optional(),
  defaultPaymentTerms: z.coerce
    .number()
    .int()
    .min(0, "Must be ≥ 0")
    .optional()
    .nullable(),
  creditLimit: z.coerce
    .number()
    .min(0, "Credit limit must be ≥ 0")
    .optional()
    .nullable(),
});

export async function getSuppliers() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  return prisma.supplier.findMany({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: { name: "asc" },
  });
}

export async function getSupplierById(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  return prisma.supplier.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: {
      purchaseInvoices: {
        where: { deletedAt: null },
        orderBy: { invoiceDate: "desc" },
      },
    },
  });
}

export async function createSupplier(formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const parsed = supplierSchema.safeParse({
    name: formData.get("name"),
    contactName: formData.get("contactName") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    taxNumber: formData.get("taxNumber") || undefined,
    defaultPaymentTerms:
      formData.get("defaultPaymentTerms") || undefined,
    creditLimit: formData.get("creditLimit") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const data = parsed.data;
  await prisma.supplier.create({
    data: {
      organizationId: orgId,
      name: data.name,
      contactName: data.contactName || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      taxNumber: data.taxNumber || null,
      defaultPaymentTerms: data.defaultPaymentTerms ?? null,
      creditLimit: data.creditLimit ?? null,
    },
  });

  revalidatePath("/suppliers");
  revalidatePath("/dashboard");
  redirect("/suppliers");
}

export async function updateSupplier(id: string, formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const parsed = supplierSchema.safeParse({
    name: formData.get("name"),
    contactName: formData.get("contactName") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    address: formData.get("address") || undefined,
    taxNumber: formData.get("taxNumber") || undefined,
    defaultPaymentTerms: formData.get("defaultPaymentTerms") || undefined,
    creditLimit: formData.get("creditLimit") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const existing = await prisma.supplier.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  });
  if (!existing) {
    return { error: { _form: ["Supplier not found"] } };
  }

  const data = parsed.data;
  await prisma.supplier.update({
    where: { id },
    data: {
      name: data.name,
      contactName: data.contactName || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      taxNumber: data.taxNumber || null,
      defaultPaymentTerms: data.defaultPaymentTerms ?? null,
      creditLimit: data.creditLimit ?? null,
    },
  });

  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${id}`);
  revalidatePath(`/suppliers/${id}/edit`);
  redirect("/suppliers");
}

export async function deleteSupplier(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const supplier = await prisma.supplier.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: {
      _count: { select: { purchaseInvoices: true } },
    },
  });

  if (!supplier) {
    return { error: "Supplier not found" };
  }

  if (supplier._count.purchaseInvoices > 0) {
    return {
      error: `Cannot delete supplier. ${supplier._count.purchaseInvoices} purchase invoice(s) are linked. Remove or reassign them first.`,
    };
  }

  await prisma.supplier.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/suppliers");
  revalidatePath("/dashboard");
  return { success: true };
}
