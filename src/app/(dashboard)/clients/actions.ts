"use server";

import { prisma } from "@/lib/prisma";
import { getOrganizationId, getCurrentUser } from "@/lib/auth-utils";
import { createAuditLog } from "@/lib/audit";
import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { uploadDocument } from "@/app/(dashboard)/documents/actions";

const clientSchema = z.object({
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

export async function getClients() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  return prisma.client.findMany({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: { name: "asc" },
  });
}

export async function getClientById(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  return prisma.client.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: {
      salesInvoices: {
        where: { deletedAt: null },
        orderBy: { invoiceDate: "desc" },
      },
    },
  });
}

export async function createClient(formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const parsed = clientSchema.safeParse({
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

  const user = await getCurrentUser();
  const userId = (user as { id?: string } | null)?.id ?? null;

  const data = parsed.data;
  const client = await prisma.client.create({
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
      createdById: userId ?? undefined,
      updatedById: userId ?? undefined,
    },
  });

  await createAuditLog({
    action: "CREATE_Client",
    entityType: "Client",
    entityId: client.id,
    metadata: { name: client.name },
  });

  const file = formData.get("attachment") as File | null;
  if (file && file.size > 0) {
    const fd = new FormData();
    fd.set("documentableType", "Client");
    fd.set("documentableId", client.id);
    fd.set("file", file);
    await uploadDocument(fd);
  }

  revalidatePath("/clients");
  revalidatePath("/dashboard");
  revalidatePath("/sales");
  redirect("/clients");
}

export async function updateClient(id: string, formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const parsed = clientSchema.safeParse({
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

  const user = await getCurrentUser();
  const userId = (user as { id?: string } | null)?.id ?? null;

  const existing = await prisma.client.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  });
  if (!existing) {
    return { error: { _form: ["Client not found"] } };
  }

  const data = parsed.data;
  await prisma.client.update({
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
      updatedById: userId ?? undefined,
    },
  });

  await createAuditLog({
    action: "UPDATE_Client",
    entityType: "Client",
    entityId: id,
    metadata: { name: data.name },
  });

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  revalidatePath(`/clients/${id}/edit`);
  revalidatePath("/sales");
  redirect("/clients");
}

export async function deleteClient(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const client = await prisma.client.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: {
      _count: { select: { salesInvoices: true } },
    },
  });

  if (!client) {
    return { error: "Client not found" };
  }

  if (client._count.salesInvoices > 0) {
    return {
      error: `Cannot delete client. ${client._count.salesInvoices} sales invoice(s) are linked. Remove or reassign them first.`,
    };
  }

  await prisma.client.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await createAuditLog({
    action: "DELETE_Client",
    entityType: "Client",
    entityId: id,
    metadata: { name: client.name },
  });

  revalidatePath("/clients");
  revalidatePath("/dashboard");
  revalidatePath("/sales");
  return { success: true };
}
