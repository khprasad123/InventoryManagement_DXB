"use server";

import { prisma } from "@/lib/prisma";
import { getOrganizationId, getCurrentUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { canManageUsers, requirePermission, PERMISSIONS } from "@/lib/permissions";
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
  | "SalesOrder"
  | "Expense"
  | "Grn"
  | "Quotation";

function getDocumentableAttachPermission(documentableType: DocumentableType) {
  // Used to decide whether the user can attach/modify documents for this entity.
  switch (documentableType) {
    case "Supplier":
      return PERMISSIONS.SUPPLIERS_UPDATE;
    case "Client":
      return PERMISSIONS.CLIENTS_UPDATE;
    case "Item":
      return PERMISSIONS.INVENTORY_UPDATE;
    case "PurchaseInvoice":
    case "Grn":
      return PERMISSIONS.PURCHASES_UPDATE;
    case "SalesInvoice":
    case "SalesOrder":
    case "Quotation":
      return PERMISSIONS.SALES_UPDATE;
    case "Expense":
      return PERMISSIONS.EXPENSES_UPDATE;
    default:
      return PERMISSIONS.VIEW_REPORTS;
  }
}

function getDocumentableRoute(documentableType: DocumentableType, id: string) {
  switch (documentableType) {
    case "Supplier":
      return `/suppliers/${id}`;
    case "Client":
      return `/clients/${id}`;
    case "Item":
      return `/inventory/${id}`;
    case "PurchaseInvoice":
      return `/purchases/${id}`;
    case "Grn":
      return `/purchases/grn/${id}`;
    case "SalesInvoice":
      return `/sales/${id}`;
    case "SalesOrder":
      return `/sales/sales-orders/${id}`;
    case "Quotation":
      return `/sales/quotations/${id}`;
    case "Expense":
      return `/expenses/${id}`;
    default:
      return "/dashboard";
  }
}

async function getUserRoleId(orgId: string): Promise<string | null> {
  const user = await getCurrentUser();
  const userId = (user as { id?: string } | null)?.id ?? null;
  if (!userId) return null;

  const uo = await prisma.userOrganization.findFirst({
    where: { userId, organizationId: orgId, deletedAt: null },
    select: { roleId: true },
  });

  return uo?.roleId ?? null;
}

async function getDriveFileEffectivePerm(
  roleId: string,
  driveFileId: string
): Promise<{
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canShare: boolean;
} | null> {
  const driveFile = await prisma.driveFile.findFirst({
    where: { id: driveFileId, deletedAt: null },
    select: { id: true, folderId: true },
  });
  if (!driveFile) return null;

  const filePerm = await prisma.driveFilePermission.findFirst({
    where: { roleId, driveFileId, deletedAt: null },
    select: { canRead: true, canWrite: true, canDelete: true, canShare: true },
  });
  if (filePerm) return filePerm;

  const folderPerm = await prisma.driveFolderPermission.findFirst({
    where: { roleId, driveFolderId: driveFile.folderId, deletedAt: null },
    select: { canRead: true, canWrite: true, canDelete: true, canShare: true },
  });

  return folderPerm ?? null;
}

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
  revalidatePath("/purchases/grn");
  revalidatePath("/sales");
  revalidatePath("/sales/quotations");

  return { success: true };
}

/**
 * Zoho-style "Cloud" attach:
 * select an accessible WorkDrive file and attach it to the target entity
 * as a normal Document record.
 */
export async function attachWorkDriveFileToDocumentable(formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const documentableType = formData.get("documentableType") as DocumentableType | null;
  const documentableId = formData.get("documentableId") as string | null;
  const driveFileId = formData.get("driveFileId") as string | null;

  if (!documentableType || !documentableId || !driveFileId) redirect("/dashboard");

  // Enforce RBAC for both sides:
  // - WorkDrive read access to the selected file
  // - Destination entity update access to attach into it
  await requirePermission(PERMISSIONS.WORKDRIVE_READ);
  await requirePermission(getDocumentableAttachPermission(documentableType));

  const roleId = await getUserRoleId(orgId);
  if (!roleId) redirect("/dashboard");

  const driveFile = await prisma.driveFile.findFirst({
    where: { id: driveFileId, organizationId: orgId, deletedAt: null },
    select: { id: true },
  });
  if (!driveFile) redirect("/workdrive");

  const effectivePerm = await getDriveFileEffectivePerm(roleId, driveFileId);
  if (!effectivePerm?.canRead) redirect("/dashboard");

  const latestVersion = await prisma.driveFileVersion.findFirst({
    where: { driveFileId, deletedAt: null },
    orderBy: { versionNo: "desc" },
    select: { versionNo: true, documentId: true },
  });
  if (!latestVersion) redirect("/workdrive");

  const sourceDoc = await prisma.document.findFirst({
    where: { id: latestVersion.documentId, organizationId: orgId, deletedAt: null },
    select: { fileName: true, fileUrl: true, mimeType: true, sizeBytes: true },
  });
  if (!sourceDoc) redirect("/workdrive");

  const user = await getCurrentUser();
  const userId = (user as { id?: string } | null)?.id ?? null;

  const attached = await prisma.document.create({
    data: {
      organizationId: orgId,
      fileName: sourceDoc.fileName,
      fileUrl: sourceDoc.fileUrl,
      mimeType: sourceDoc.mimeType,
      sizeBytes: sourceDoc.sizeBytes,
      documentableType,
      documentableId,
      createdById: userId ?? undefined,
      updatedById: userId ?? undefined,
    },
    select: { id: true },
  });

  await createAuditLog({
    action: "CREATE_Document",
    entityType: "Document",
    entityId: attached.id,
    metadata: {
      documentableType,
      documentableId,
      driveFileId,
      driveFileVersionNo: latestVersion.versionNo,
      fileName: sourceDoc.fileName,
    },
  });

  const targetRoute = getDocumentableRoute(documentableType, documentableId);
  revalidatePath(targetRoute);
  redirect(targetRoute);
}

export async function deleteDocument(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await getCurrentUser();
  if (!user || !canManageUsers(user)) {
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
    data: {
      deletedAt: new Date(),
      deletedById: (user as { id?: string }).id ?? null,
    },
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

