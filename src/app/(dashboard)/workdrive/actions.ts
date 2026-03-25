"use server";

import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";

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

  await createAuditLog({
    action: "WORKDRIVE_CREATE_FOLDER",
    entityType: "DriveFolder",
    entityId: folder.id,
    metadata: { name, parentFolderId },
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

  await createAuditLog({
    action: "WORKDRIVE_UPLOAD_FILE",
    entityType: "DriveFile",
    entityId: driveFile.id,
    metadata: { fileName, folderId, versionNo: nextVersionNo, documentId: doc.id },
  });

  revalidatePath(`/workdrive/folders/${folderId}`);
  redirect(`/workdrive/folders/${folderId}`);
}

async function getRolesForOrg(orgId: string) {
  return prisma.role.findMany({
    where: { organizationId: orgId, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

async function getDriveFolderEffectivePerm(roleId: string, folderId: string) {
  return getFolderPermissionOrNull(roleId, folderId);
}

async function getDriveFileEffectivePerm(roleId: string, fileId: string) {
  const driveFile = await prisma.driveFile.findFirst({
    where: { id: fileId, deletedAt: null },
    select: { id: true, folderId: true, organizationId: true },
  });
  if (!driveFile) return null;

  const filePerm = await prisma.driveFilePermission.findFirst({
    where: { roleId, driveFileId: fileId, deletedAt: null },
    select: { canRead: true, canWrite: true, canDelete: true, canShare: true },
  });
  if (filePerm) return filePerm;

  const folderPerm = await prisma.driveFolderPermission.findFirst({
    where: { roleId, driveFolderId: driveFile.folderId, deletedAt: null },
    select: { canRead: true, canWrite: true, canDelete: true, canShare: true },
  });

  return folderPerm ?? null;
}

export async function getWorkDriveFolderShareSettings(params: { folderId: string }) {
  await requirePermission(PERMISSIONS.WORKDRIVE_SHARE_MANAGE);

  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const roleId = await getUserRoleId(orgId);
  if (!roleId) redirect("/dashboard");

  const folderPerm = await getDriveFolderEffectivePerm(roleId, params.folderId);
  if (!folderPerm?.canRead) redirect("/dashboard");

  const roles = await getRolesForOrg(orgId);
  const perms = await prisma.driveFolderPermission.findMany({
    where: { roleId: { in: roles.map((r) => r.id) }, driveFolderId: params.folderId, deletedAt: null },
    select: { roleId: true, canRead: true, canWrite: true, canDelete: true, canShare: true },
  });
  const permByRoleId = new Map(perms.map((p) => [p.roleId, p]));

  return {
    folderId: params.folderId,
    roles: roles.map((r) => ({
      roleId: r.id,
      roleName: r.name,
      canRead: permByRoleId.get(r.id)?.canRead ?? false,
      canWrite: permByRoleId.get(r.id)?.canWrite ?? false,
      canDelete: permByRoleId.get(r.id)?.canDelete ?? false,
      canShare: permByRoleId.get(r.id)?.canShare ?? false,
    })),
  };
}

export async function updateWorkDriveFolderShareSettings(formData: FormData) {
  await requirePermission(PERMISSIONS.WORKDRIVE_SHARE_MANAGE);

  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const roleId = await getUserRoleId(orgId);
  if (!roleId) redirect("/dashboard");

  const folderId = String(formData.get("folderId") ?? "").trim();
  if (!folderId) redirect("/workdrive");

  const folderPerm = await getDriveFolderEffectivePerm(roleId, folderId);
  if (!folderPerm?.canRead) redirect("/workdrive");

  const canReadRoleIds = (formData.getAll("canReadRoleIds").map(String) ?? []).filter(Boolean);
  const canWriteRoleIds = (formData.getAll("canWriteRoleIds").map(String) ?? []).filter(Boolean);
  const canDeleteRoleIds = (formData.getAll("canDeleteRoleIds").map(String) ?? []).filter(Boolean);
  const canShareRoleIds = (formData.getAll("canShareRoleIds").map(String) ?? []).filter(Boolean);

  const canReadSet = new Set(canReadRoleIds);
  const canWriteSet = new Set(canWriteRoleIds);
  const canDeleteSet = new Set(canDeleteRoleIds);
  const canShareSet = new Set(canShareRoleIds);

  const roles = await getRolesForOrg(orgId);

  await Promise.all(
    roles.map((r) =>
      prisma.driveFolderPermission.upsert({
        where: { roleId_driveFolderId: { roleId: r.id, driveFolderId: folderId } },
        update: {
          canRead: canReadSet.has(r.id),
          canWrite: canWriteSet.has(r.id),
          canDelete: canDeleteSet.has(r.id),
          canShare: canShareSet.has(r.id),
          deletedAt: null,
          deletedById: null,
        },
        create: {
          roleId: r.id,
          driveFolderId: folderId,
          canRead: canReadSet.has(r.id),
          canWrite: canWriteSet.has(r.id),
          canDelete: canDeleteSet.has(r.id),
          canShare: canShareSet.has(r.id),
        },
      })
    )
  );

  await createAuditLog({
    action: "WORKDRIVE_UPDATE_FOLDER_PERMISSIONS",
    entityType: "DriveFolder",
    entityId: folderId,
    metadata: { updatedAt: new Date().toISOString() },
  });

  revalidatePath(`/workdrive/folders/${folderId}`);
  redirect(`/workdrive/folders/${folderId}`);
}

export async function getWorkDriveFileDetails(params: { fileId: string }) {
  await requirePermission(PERMISSIONS.WORKDRIVE_READ);

  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const roleId = await getUserRoleId(orgId);
  if (!roleId) redirect("/dashboard");

  const driveFile = await prisma.driveFile.findFirst({
    where: { id: params.fileId, organizationId: orgId, deletedAt: null },
    select: { id: true, fileName: true, folderId: true, sizeBytes: true, mimeType: true, folder: { select: { id: true, name: true } } },
  });
  if (!driveFile) redirect("/workdrive");

  const effective = await getDriveFileEffectivePerm(roleId, params.fileId);
  if (!effective?.canRead) redirect("/dashboard");

  const versions = await prisma.driveFileVersion.findMany({
    where: { driveFileId: params.fileId, deletedAt: null },
    orderBy: { versionNo: "desc" },
    select: { id: true, versionNo: true, memo: true, documentId: true, createdAt: true },
  });

  return {
    file: {
      id: driveFile.id,
      fileName: driveFile.fileName,
      folderId: driveFile.folderId,
      folderName: driveFile.folder.name,
      mimeType: driveFile.mimeType,
      sizeBytes: driveFile.sizeBytes,
    },
    canWrite: effective.canWrite,
    versions,
  };
}

export async function getWorkDriveFileShareSettings(params: { fileId: string }) {
  await requirePermission(PERMISSIONS.WORKDRIVE_SHARE_MANAGE);

  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const roleId = await getUserRoleId(orgId);
  if (!roleId) redirect("/dashboard");

  const effective = await getDriveFileEffectivePerm(roleId, params.fileId);
  if (!effective?.canRead) redirect("/dashboard");

  const driveFile = await prisma.driveFile.findFirst({
    where: { id: params.fileId, organizationId: orgId, deletedAt: null },
    select: { id: true, folderId: true },
  });
  if (!driveFile) redirect("/workdrive");

  const roles = await getRolesForOrg(orgId);
  const roleIds = roles.map((r) => r.id);

  const [filePerms, folderPerms] = await Promise.all([
    prisma.driveFilePermission.findMany({
      where: { roleId: { in: roleIds }, driveFileId: params.fileId, deletedAt: null },
      select: { roleId: true, canRead: true, canWrite: true, canDelete: true, canShare: true },
    }),
    prisma.driveFolderPermission.findMany({
      where: { roleId: { in: roleIds }, driveFolderId: driveFile.folderId, deletedAt: null },
      select: { roleId: true, canRead: true, canWrite: true, canDelete: true, canShare: true },
    }),
  ]);

  const filePermByRoleId = new Map(filePerms.map((p) => [p.roleId, p]));
  const folderPermByRoleId = new Map(folderPerms.map((p) => [p.roleId, p]));

  return {
    fileId: params.fileId,
    roles: roles.map((r) => ({
      roleId: r.id,
      roleName: r.name,
      // If no explicit file-permission exists, default to folder permission (inherit).
      canRead: filePermByRoleId.get(r.id)?.canRead ?? folderPermByRoleId.get(r.id)?.canRead ?? false,
      canWrite: filePermByRoleId.get(r.id)?.canWrite ?? folderPermByRoleId.get(r.id)?.canWrite ?? false,
      canDelete: filePermByRoleId.get(r.id)?.canDelete ?? folderPermByRoleId.get(r.id)?.canDelete ?? false,
      canShare: filePermByRoleId.get(r.id)?.canShare ?? folderPermByRoleId.get(r.id)?.canShare ?? false,
    })),
  };
}

export async function updateWorkDriveFileShareSettings(formData: FormData) {
  await requirePermission(PERMISSIONS.WORKDRIVE_SHARE_MANAGE);

  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const roleId = await getUserRoleId(orgId);
  if (!roleId) redirect("/dashboard");

  const fileId = String(formData.get("fileId") ?? "").trim();
  if (!fileId) redirect("/workdrive");

  const effective = await getDriveFileEffectivePerm(roleId, fileId);
  if (!effective?.canRead) redirect("/workdrive");

  const canReadRoleIds = (formData.getAll("canReadRoleIds").map(String) ?? []).filter(Boolean);
  const canWriteRoleIds = (formData.getAll("canWriteRoleIds").map(String) ?? []).filter(Boolean);
  const canDeleteRoleIds = (formData.getAll("canDeleteRoleIds").map(String) ?? []).filter(Boolean);
  const canShareRoleIds = (formData.getAll("canShareRoleIds").map(String) ?? []).filter(Boolean);

  const canReadSet = new Set(canReadRoleIds);
  const canWriteSet = new Set(canWriteRoleIds);
  const canDeleteSet = new Set(canDeleteRoleIds);
  const canShareSet = new Set(canShareRoleIds);

  const roles = await getRolesForOrg(orgId);

  await Promise.all(
    roles.map((r) =>
      prisma.driveFilePermission.upsert({
        where: { roleId_driveFileId: { roleId: r.id, driveFileId: fileId } },
        update: {
          canRead: canReadSet.has(r.id),
          canWrite: canWriteSet.has(r.id),
          canDelete: canDeleteSet.has(r.id),
          canShare: canShareSet.has(r.id),
          deletedAt: null,
          deletedById: null,
        },
        create: {
          roleId: r.id,
          driveFileId: fileId,
          canRead: canReadSet.has(r.id),
          canWrite: canWriteSet.has(r.id),
          canDelete: canDeleteSet.has(r.id),
          canShare: canShareSet.has(r.id),
        },
      })
    )
  );

  await createAuditLog({
    action: "WORKDRIVE_UPDATE_FILE_PERMISSIONS",
    entityType: "DriveFile",
    entityId: fileId,
    metadata: { updatedAt: new Date().toISOString() },
  });

  revalidatePath(`/workdrive/files/${fileId}`);
  redirect(`/workdrive/files/${fileId}`);
}

export async function getWorkDriveActivity(params: { limit?: number } = {}) {
  await requirePermission(PERMISSIONS.WORKDRIVE_READ);

  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const limit = Math.max(1, Math.min(params.limit ?? 20, 50));

  return prisma.auditLog.findMany({
    where: {
      organizationId: orgId,
      action: { startsWith: "WORKDRIVE_" },
    },
    include: { user: { select: { id: true, email: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function searchWorkDriveItems(params: { query: string }) {
  await requirePermission(PERMISSIONS.WORKDRIVE_READ);

  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  const roleId = await getUserRoleId(orgId);
  if (!roleId) redirect("/dashboard");
  const roleIdSafe = roleId;

  const query = (params.query ?? "").trim();
  if (!query) return { folders: [], files: [] };

  const { rootFolderId } = await ensureDriveRootFolder(orgId);

  type FolderHit = { id: string; name: string; depth: number };
  type FileHit = { id: string; fileName: string; folderId: string; folderName: string };

  const folders: FolderHit[] = [];
  const files: FileHit[] = [];

  const maxDepth = 3;
  const maxResults = 40;

  const seenFolders = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [{ id: rootFolderId, depth: 0 }];
  seenFolders.add(rootFolderId);

  // Cache folder read permissions to avoid repeated queries.
  const folderReadCache = new Map<string, boolean>();

  async function folderCanRead(fid: string) {
    if (folderReadCache.has(fid)) return folderReadCache.get(fid)!;
    const perm = await getFolderPermissionOrNull(roleIdSafe, fid);
    const canRead = Boolean(perm?.canRead);
    folderReadCache.set(fid, canRead);
    return canRead;
  }

  while (queue.length && (folders.length + files.length) < maxResults) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;

    // Subfolders
    const subfolders = await prisma.driveFolder.findMany({
      where: { organizationId: orgId, parentId: current.id, deletedAt: null },
      select: { id: true, name: true },
      take: 200,
    });

    const subfolderIds = subfolders.map((f) => f.id);
    const subfolderPerms = subfolderIds.length
      ? await prisma.driveFolderPermission.findMany({
          where: { roleId: roleIdSafe, driveFolderId: { in: subfolderIds }, deletedAt: null },
          select: { driveFolderId: true, canRead: true },
        })
      : [];
    const permByFolderId = new Map(subfolderPerms.map((p) => [p.driveFolderId, p.canRead]));

    for (const f of subfolders) {
      const canRead = permByFolderId.get(f.id) ?? false;
      folderReadCache.set(f.id, canRead);
      if (!canRead) continue;

      if (f.name.toLowerCase().includes(query.toLowerCase())) {
        folders.push({ id: f.id, name: f.name, depth: current.depth + 1 });
        if (folders.length + files.length >= maxResults) break;
      }

      if (!seenFolders.has(f.id)) {
        seenFolders.add(f.id);
        queue.push({ id: f.id, depth: current.depth + 1 });
      }
    }

    // Files
    if ((folders.length + files.length) < maxResults) {
      const folderFiles = await prisma.driveFile.findMany({
        where: {
          organizationId: orgId,
          folderId: current.id,
          deletedAt: null,
          fileName: { contains: query, mode: "insensitive" },
        },
        select: { id: true, fileName: true, folderId: true, folder: { select: { name: true } } },
        take: 50,
      });

      const fileIds = folderFiles.map((f) => f.id);
      const filePerms = fileIds.length
        ? await prisma.driveFilePermission.findMany({
            where: { roleId: roleIdSafe, driveFileId: { in: fileIds }, deletedAt: null },
            select: { driveFileId: true, canRead: true },
          })
        : [];
      const permByFileId = new Map(filePerms.map((p) => [p.driveFileId, p.canRead]));

      const folderCanReadValue = await folderCanRead(current.id);
      for (const f of folderFiles) {
        const canRead = permByFileId.get(f.id) ?? folderCanReadValue;
        if (!canRead) continue;
        files.push({ id: f.id, fileName: f.fileName, folderId: f.folderId, folderName: f.folder.name });
        if (folders.length + files.length >= maxResults) break;
      }
    }
  }

  return { folders, files };
}

