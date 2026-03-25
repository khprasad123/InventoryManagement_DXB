"use server";

import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";

const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

function assertNonEmpty(s: unknown): string | null {
  const v = String(s ?? "").trim();
  return v ? v : null;
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

async function ensureDriveRootFolder(orgId: string): Promise<{ rootFolderId: string }> {
  // Root folder is a single per-org top-level folder.
  const existing = await prisma.driveFolder.findFirst({
    where: { organizationId: orgId, parentId: null, name: "Root", deletedAt: null },
    select: { id: true },
  });
  if (existing) return { rootFolderId: existing.id };

  const root = await prisma.driveFolder.create({
    data: { organizationId: orgId, name: "Root", parentId: null },
    select: { id: true },
  });

  const roles = await prisma.role.findMany({
    where: { organizationId: orgId, deletedAt: null },
    select: { id: true, name: true },
  });

  // Default permissions:
  // - Everyone can READ
  // - ADMIN + FINANCE can WRITE/SHARE
  await prisma.driveFolderPermission.createMany({
    data: roles.map((r) => {
      const canWrite = r.name === "ADMIN" || r.name === "FINANCE";
      return {
        roleId: r.id,
        driveFolderId: root.id,
        canRead: true,
        canWrite,
        canDelete: canWrite,
        canShare: canWrite,
      };
    }),
    skipDuplicates: true,
  });

  return { rootFolderId: root.id };
}

async function getFolderPermissionOrNull(roleId: string, folderId: string) {
  return prisma.driveFolderPermission.findFirst({
    where: { roleId, driveFolderId: folderId, deletedAt: null },
    select: { canRead: true, canWrite: true, canDelete: true, canShare: true },
  });
}

export async function listWorkDriveRootContents(params: { search?: string } = {}) {
  await requirePermission(PERMISSIONS.WORKDRIVE_READ);

  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const { rootFolderId } = await ensureDriveRootFolder(orgId);
  const roleId = await getUserRoleId(orgId);
  if (!roleId) redirect("/dashboard");

  const rootPerm = await getFolderPermissionOrNull(roleId, rootFolderId);
  if (!rootPerm?.canRead) redirect("/dashboard");

  const search = (params.search ?? "").trim();

  const [folders, files] = await Promise.all([
    prisma.driveFolder.findMany({
      where: {
        organizationId: orgId,
        parentId: rootFolderId,
        deletedAt: null,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
    prisma.driveFile.findMany({
      where: {
        organizationId: orgId,
        folderId: rootFolderId,
        deletedAt: null,
        ...(search ? { fileName: { contains: search, mode: "insensitive" } } : {}),
      },
      select: { id: true, fileName: true, mimeType: true, sizeBytes: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
  ]);

  const folderIds = folders.map((f) => f.id);
  const fileIds = files.map((f) => f.id);

  const folderPerms = folderIds.length
    ? await prisma.driveFolderPermission.findMany({
        where: { roleId, driveFolderId: { in: folderIds }, deletedAt: null },
        select: { driveFolderId: true, canRead: true },
      })
    : [];
  const folderPermById = new Map(folderPerms.map((p) => [p.driveFolderId, p.canRead]));

  const filePerms = fileIds.length
    ? await prisma.driveFilePermission.findMany({
        where: { roleId, driveFileId: { in: fileIds }, deletedAt: null },
        select: { driveFileId: true, canRead: true },
      })
    : [];
  const filePermById = new Map(filePerms.map((p) => [p.driveFileId, p.canRead]));

  // Latest version per file (MVP: keep it simple with N queries).
  const filesWithLatest = await Promise.all(
    files.map(async (f) => {
      const latest = await prisma.driveFileVersion.findFirst({
        where: { driveFileId: f.id, deletedAt: null },
        orderBy: { versionNo: "desc" },
        select: { versionNo: true, documentId: true },
      });
      return { ...f, latestVersionNo: latest?.versionNo ?? 0, latestDocumentId: latest?.documentId ?? null };
    })
  );

  return {
    rootFolder: { id: rootFolderId, name: "Root" },
    canWrite: rootPerm.canWrite,
    subFolders: folders.filter((folder) => folderPermById.get(folder.id) ?? rootPerm.canRead),
    files: filesWithLatest.filter((file) => filePermById.get(file.id) ?? rootPerm.canRead),
  };
}

export async function listWorkDriveFolderContents(params: { folderId: string; search?: string }) {
  await requirePermission(PERMISSIONS.WORKDRIVE_READ);

  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const roleId = await getUserRoleId(orgId);
  if (!roleId) redirect("/dashboard");

  const folderPerm = await getFolderPermissionOrNull(roleId, params.folderId);
  if (!folderPerm?.canRead) redirect("/dashboard");

  const search = (params.search ?? "").trim();

  const [folders, files] = await Promise.all([
    prisma.driveFolder.findMany({
      where: {
        organizationId: orgId,
        parentId: params.folderId,
        deletedAt: null,
        ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 200,
    }),
    prisma.driveFile.findMany({
      where: {
        organizationId: orgId,
        folderId: params.folderId,
        deletedAt: null,
        ...(search ? { fileName: { contains: search, mode: "insensitive" } } : {}),
      },
      select: { id: true, fileName: true, mimeType: true, sizeBytes: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
  ]);

  const folderIds = folders.map((f) => f.id);
  const fileIds = files.map((f) => f.id);

  const folderPerms = folderIds.length
    ? await prisma.driveFolderPermission.findMany({
        where: { roleId, driveFolderId: { in: folderIds }, deletedAt: null },
        select: { driveFolderId: true, canRead: true },
      })
    : [];
  const folderPermById = new Map(folderPerms.map((p) => [p.driveFolderId, p.canRead]));

  const filePerms = fileIds.length
    ? await prisma.driveFilePermission.findMany({
        where: { roleId, driveFileId: { in: fileIds }, deletedAt: null },
        select: { driveFileId: true, canRead: true },
      })
    : [];
  const filePermById = new Map(filePerms.map((p) => [p.driveFileId, p.canRead]));

  const filesWithLatest = await Promise.all(
    files.map(async (f) => {
      const latest = await prisma.driveFileVersion.findFirst({
        where: { driveFileId: f.id, deletedAt: null },
        orderBy: { versionNo: "desc" },
        select: { versionNo: true, documentId: true },
      });
      return { ...f, latestVersionNo: latest?.versionNo ?? 0, latestDocumentId: latest?.documentId ?? null };
    })
  );

  const folder = await prisma.driveFolder.findFirst({
    where: { id: params.folderId, organizationId: orgId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!folder) redirect("/workdrive");

  return {
    folder,
    canWrite: folderPerm.canWrite,
    subFolders: folders.filter((folder) => folderPermById.get(folder.id) ?? folderPerm.canRead),
    files: filesWithLatest.filter((file) => filePermById.get(file.id) ?? folderPerm.canRead),
  };
}

const createFolderSchema = z.object({
  parentFolderId: z.string().min(1),
  name: z.string().min(1).max(200),
});

export async function createWorkDriveFolder(formData: FormData) {
  await requirePermission(PERMISSIONS.WORKDRIVE_MANAGE_FOLDERS);

  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const roleId = await getUserRoleId(orgId);
  const user = await getCurrentUser();
  const userId = (user as { id?: string } | null)?.id ?? null;
  if (!roleId || !userId) redirect("/dashboard");

  const parsed = createFolderSchema.safeParse({
    parentFolderId: formData.get("parentFolderId"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { parentFolderId, name } = parsed.data;
  const parentPerm = await getFolderPermissionOrNull(roleId, parentFolderId);
  if (!parentPerm?.canWrite) return { error: { _form: ["No permission to create folders in this location."] } };

  const folder = await prisma.driveFolder.create({
    data: {
      organizationId: orgId,
      parentId: parentFolderId,
      name,
    },
    select: { id: true },
  });

  // Inherit permissions from parent.
  const parentPerms = await prisma.driveFolderPermission.findMany({
    where: { driveFolderId: parentFolderId, deletedAt: null },
    select: { roleId: true, canRead: true, canWrite: true, canDelete: true, canShare: true },
  });

  await prisma.driveFolderPermission.createMany({
    data: parentPerms.map((p) => ({
      roleId: p.roleId,
      driveFolderId: folder.id,
      canRead: p.canRead,
      canWrite: p.canWrite,
      canDelete: p.canDelete,
      canShare: p.canShare,
    })),
  });

  revalidatePath(`/workdrive/folders/${parentFolderId}`);
  revalidatePath(`/workdrive/folders/${folder.id}`);
  redirect(`/workdrive/folders/${folder.id}`);
}

const uploadDriveFileSchema = z.object({
  folderId: z.string().min(1),
  memo: z.string().optional(),
});

export async function uploadWorkDriveFile(formData: FormData) {
  await requirePermission(PERMISSIONS.WORKDRIVE_UPLOAD);

  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const roleId = await getUserRoleId(orgId);
  const user = await getCurrentUser();
  const userId = (user as { id?: string } | null)?.id ?? null;
  if (!roleId || !userId) redirect("/dashboard");

  const parsed = uploadDriveFileSchema.safeParse({
    folderId: formData.get("folderId"),
    memo: formData.get("memo") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { folderId, memo } = parsed.data;

  const folderPerm = await getFolderPermissionOrNull(roleId, folderId);
  if (!folderPerm?.canWrite) return { error: { _form: ["No permission to upload in this folder."] } };

  const file = formData.get("file") as File | null;
  if (!file) return { error: { file: ["File is required"] } };
  if (file.size > MAX_UPLOAD_SIZE_BYTES) return { error: { file: ["File too large"] } };

  const fileName = file.name?.trim();
  if (!fileName) return { error: { file: ["Missing file name"] } };

  // Create or reuse a DriveFile per folder + fileName.
  let driveFile = await prisma.driveFile.findFirst({
    where: { organizationId: orgId, folderId, fileName, deletedAt: null },
    select: { id: true },
  });

  if (!driveFile) {
    driveFile = await prisma.driveFile.create({
      data: {
        organizationId: orgId,
        folderId,
        fileName,
        mimeType: file.type || null,
        sizeBytes: file.size,
      },
      select: { id: true },
    });
  }

  // Upload binary to blob + create Document row.
  const buf = Buffer.from(await file.arrayBuffer());
  const key = `org-${orgId}/WorkDrive/DriveFile/${driveFile.id}/${Date.now()}-${fileName}`;
  const blob = await put(key, buf, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    contentType: file.type || "application/octet-stream",
  });

  const doc = await prisma.document.create({
    data: {
      organizationId: orgId,
      fileName,
      fileUrl: blob.url,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      documentableType: "DriveFile",
      documentableId: driveFile.id,
      createdById: userId,
      updatedById: userId,
    },
    select: { id: true },
  });

  const latest = await prisma.driveFileVersion.findFirst({
    where: { driveFileId: driveFile.id, deletedAt: null },
    orderBy: { versionNo: "desc" },
    select: { versionNo: true },
  });

  const nextVersionNo = (latest?.versionNo ?? 0) + 1;
  await prisma.driveFileVersion.create({
    data: {
      organizationId: orgId,
      driveFileId: driveFile.id,
      versionNo: nextVersionNo,
      documentId: doc.id,
      memo: memo || null,
      createdById: userId,
    },
  });

  revalidatePath(`/workdrive/folders/${folderId}`);
  redirect(`/workdrive/folders/${folderId}`);
}

