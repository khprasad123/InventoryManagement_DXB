import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getOrganizationId } from "@/lib/auth-utils";
import { canUser, PERMISSIONS } from "@/lib/permissions";

interface Params {
  params: { id: string };
}

export async function GET(_req: Request, { params }: Params) {
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.redirect(new URL("/login", _req.url));
  }

  const user = await getCurrentUser();

  const doc = await prisma.document.findFirst({
    where: {
      id: params.id,
      organizationId: orgId,
      deletedAt: null,
    },
  });

  if (!doc) {
    return new NextResponse("Not found", { status: 404 });
  }

  // WorkDrive access control:
  // For DriveFile documents, enforce folder/file permissions before redirecting to the blob URL.
  if (doc.documentableType === "DriveFile" && doc.documentableId) {
    if (!user || !canUser(user as any, PERMISSIONS.WORKDRIVE_READ)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const userId = (user as { id?: string } | null)?.id ?? null;
    if (!userId) return new NextResponse("Forbidden", { status: 403 });

    const roleLink = await prisma.userOrganization.findFirst({
      where: { userId, organizationId: orgId, deletedAt: null },
      select: { roleId: true },
    });
    const roleId = roleLink?.roleId ?? null;
    if (!roleId) return new NextResponse("Forbidden", { status: 403 });

    const fileId = String(doc.documentableId);

    const filePerm = await prisma.driveFilePermission.findFirst({
      where: { roleId, driveFileId: fileId, deletedAt: null, canRead: true },
      select: { driveFileId: true },
    });
    if (!filePerm) {
      const driveFile = await prisma.driveFile.findFirst({
        where: { id: fileId, organizationId: orgId, deletedAt: null },
        select: { folderId: true },
      });
      if (!driveFile) return new NextResponse("Not found", { status: 404 });

      const folderPerm = await prisma.driveFolderPermission.findFirst({
        where: { roleId, driveFolderId: driveFile.folderId, deletedAt: null, canRead: true },
        select: { driveFolderId: true },
      });
      if (!folderPerm) return new NextResponse("Forbidden", { status: 403 });
    }
  }

  return NextResponse.redirect(doc.fileUrl);
}

