"use server";

import { prisma } from "@/lib/prisma";
import { getOrganizationId, getCurrentUser } from "@/lib/auth-utils";
import { createAuditLog } from "@/lib/audit";
import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { uploadDocument } from "@/app/(dashboard)/documents/actions";

const supplierSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  contactName: z.string().max(255).optional(),
  email: z
    .string()
    .optional()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Invalid email"),
  phone: z.string().max(50).optional(),
  address: z.string().optional(),
  paymentTerms: z.string().max(100).optional(),
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

const PAGE_SIZE = 10;
const searchMode = "insensitive" as const;

export async function getSuppliers() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  return prisma.supplier.findMany({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: { name: "asc" },
  });
}

export async function getSuppliersPaginated(page: number, search?: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const currentPage = Math.max(1, page);
  const q = (search ?? "").trim();

  const where = {
    organizationId: orgId,
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: searchMode } },
            { contactName: { contains: q, mode: searchMode } },
            { email: { contains: q, mode: searchMode } },
            { phone: { contains: q, mode: searchMode } },
          ],
        }
      : {}),
  };

  const total = await prisma.supplier.count({ where });

  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: { name: "asc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return {
    suppliers,
    total,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE) || 1,
    currentPage,
  };
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
      purchaseOrders: {
        where: { deletedAt: null },
        orderBy: { orderDate: "desc" },
      },
      grns: {
        where: { deletedAt: null },
        orderBy: { receivedDate: "desc" },
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
    paymentTerms: formData.get("paymentTerms") || undefined,
    taxNumber: formData.get("taxNumber") || undefined,
    defaultPaymentTerms:
      formData.get("defaultPaymentTerms") || undefined,
    creditLimit: formData.get("creditLimit") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const user = await getCurrentUser();
  const userId = (user as { id?: string } | null)?.id ?? null;

  const data = parsed.data;
  const supplier = await prisma.supplier.create({
    data: {
      organizationId: orgId,
      name: data.name,
      contactName: data.contactName || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      paymentTerms: data.paymentTerms || null,
      taxNumber: data.taxNumber || null,
      defaultPaymentTerms: data.defaultPaymentTerms ?? null,
      creditLimit: data.creditLimit ?? null,
      createdById: userId ?? undefined,
      updatedById: userId ?? undefined,
    },
  });

  await createAuditLog({
    action: "CREATE_Supplier",
    entityType: "Supplier",
    entityId: supplier.id,
    metadata: { name: supplier.name },
  });

  const file = formData.get("attachment") as File | null;
  if (file && file.size > 0) {
    const fd = new FormData();
    fd.set("documentableType", "Supplier");
    fd.set("documentableId", supplier.id);
    fd.set("file", file);
    await uploadDocument(fd);
  }

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
    paymentTerms: formData.get("paymentTerms") || undefined,
    taxNumber: formData.get("taxNumber") || undefined,
    defaultPaymentTerms: formData.get("defaultPaymentTerms") || undefined,
    creditLimit: formData.get("creditLimit") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const user = await getCurrentUser();
  const userId = (user as { id?: string } | null)?.id ?? null;

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
      paymentTerms: data.paymentTerms || null,
      taxNumber: data.taxNumber || null,
      defaultPaymentTerms: data.defaultPaymentTerms ?? null,
      creditLimit: data.creditLimit ?? null,
      updatedById: userId ?? undefined,
    },
  });

  await createAuditLog({
    action: "UPDATE_Supplier",
    entityType: "Supplier",
    entityId: id,
    metadata: { name: data.name },
  });

  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${id}`);
  revalidatePath(`/suppliers/${id}/edit`);
  redirect("/suppliers");
}

export async function deleteSupplier(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  const currentUser = await getCurrentUser();
  const currentUserId = (currentUser as { id?: string } | null)?.id ?? null;

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
    data: { deletedAt: new Date(), deletedById: currentUserId ?? undefined },
  });

  await createAuditLog({
    action: "DELETE_Supplier",
    entityType: "Supplier",
    entityId: id,
    metadata: { name: supplier.name },
  });

  revalidatePath("/suppliers");
  revalidatePath("/dashboard");
  return { success: true };
}
