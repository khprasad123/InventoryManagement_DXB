"use server";

import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { put } from "@vercel/blob";

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
  | "SalesInvoice";

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

  const key = `org-${orgId}/${documentableType}/${documentableId}/${Date.now()}-${name}`;

  const blob = await put(key, file, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  await prisma.document.create({
    data: {
      organizationId: orgId,
      fileName: name,
      fileUrl: blob.url,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      documentableType,
      documentableId,
    },
  });

  return { success: true };
}

