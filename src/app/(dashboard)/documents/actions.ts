"use server";

import { prisma } from "@/lib/prisma";
import { getOrganizationId, getCurrentUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { ROLES } from "@/lib/permissions";
import { createAuditLog } from "@/lib/audit";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "txt",
  "csv",
  "doc",
  "docx",
  "xls",
  "xlsx",
];

type DocumentableType =
  | "Supplier"
  | "Client"
  | "Item"
  | "PurchaseInvoice"
  | "SalesInvoice"
  | "Expense";

export async function getDocumentsFor(
  documentableType: DocumentableType,
  documentableId: string
) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  return prisma.document.findMany({
    where: {
      organizationId: orgId,
      documentableType,
      documentableId,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function uploadDocument(formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const documentableType = formData.get("documentableType") as
    | DocumentableType
    | null;
  const documentableId = formData.get("documentableId") as string | null;
  const file = formData.get("file") as File | null;

  if (!documentableType || !documentableId) {
    return { error: "Missing related record information." };
  }

  if (!file) {
    return { error: "File is required." };
  }

  if (file.size <= 0) {
    return { error: "File is empty." };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      error: `File too large. Max size is ${Math.round(
        MAX_FILE_SIZE_BYTES / (1024 * 1024)
      )}MB.`,
    };
  }

  const name = file.name || "upload";
  const ext = name.includes(".")
    ? name.split(".").pop()!.toLowerCase()
    : "";
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      error: `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(
        ", "
      )}.`,
    };
  }

  const user = await getCurrentUser();
  const userId = (user as { id?: string } | null)?.id ?? null;

  const key = `org-${orgId}/${documentableType}/${documentableId}/${Date.now()}-${name}`;

  const blob = await put(key, file, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  const doc = await prisma.document.create({
    data: {
      organizationId: orgId,
      fileName: name,
      fileUrl: blob.url,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      documentableType,
      documentableId,
      createdById: userId ?? undefined,
      updatedById: userId ?? undefined,
    },
  });

  await createAuditLog({
    action: "CREATE_Document",
    entityType: "Document",
    entityId: doc.id,
    metadata: { fileName: name, documentableType, documentableId },
  });

  // Revalidate pages that show document sections so the list refreshes
  revalidatePath("/expenses");
  revalidatePath("/inventory");
  revalidatePath("/suppliers");
  revalidatePath("/clients");
  revalidatePath("/purchases");
  revalidatePath("/sales");

  return { success: true };
}

export async function deleteDocument(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await getCurrentUser();
  if (!user || user.role !== ROLES.ADMIN) {
    return { error: "Only admins can delete documents." };
  }

  const existing = await prisma.document.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  });
  if (!existing) {
    return { error: "Document not found." };
  }

  await prisma.document.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await createAuditLog({
    action: "DELETE_Document",
    entityType: "Document",
    entityId: id,
    metadata: { fileName: existing.fileName, documentableType: existing.documentableType, documentableId: existing.documentableId },
  });

  revalidatePath("/expenses");
  revalidatePath("/inventory");
  revalidatePath("/suppliers");
  revalidatePath("/clients");
  revalidatePath("/purchases");
  revalidatePath("/sales");

  return { success: true };
}

