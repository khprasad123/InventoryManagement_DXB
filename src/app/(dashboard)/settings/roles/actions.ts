"use server";

import { prisma } from "@/lib/prisma";
import { getOrganizationId, getCurrentUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { canManageRoles } from "@/lib/permissions";

export async function getRolesWithPermissions() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await getCurrentUser();
  if (!canManageRoles(user)) redirect("/settings");

  const roles = await prisma.role.findMany({
    where: { organizationId: orgId, deletedAt: null },
    include: {
      permissions: {
        where: { deletedAt: null },
        include: { permission: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return roles;
}

const PAGE_SIZE = 10;
const searchMode = "insensitive" as const;

export async function getRolesWithPermissionsPaginated(page: number, search?: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await getCurrentUser();
  if (!canManageRoles(user)) redirect("/settings");

  const currentPage = Math.max(1, page);
  const q = (search ?? "").trim();
  const where = {
    organizationId: orgId,
    deletedAt: null,
    ...(q ? { name: { contains: q, mode: searchMode } } : {}),
  };

  const total = await prisma.role.count({ where });

  const roles = await prisma.role.findMany({
    where,
    include: {
      permissions: {
        where: { deletedAt: null },
        include: { permission: true },
      },
    },
    orderBy: { name: "asc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return {
    roles,
    total,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE) || 1,
    currentPage,
  };
}

export async function getAllPermissions() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await getCurrentUser();
  if (!canManageRoles(user)) redirect("/settings");

  return prisma.permission.findMany({
    orderBy: { code: "asc" },
  });
}

export async function updateRolePermissions(
  roleId: string,
  permissionIds: string[]
) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await getCurrentUser();
  if (!canManageRoles(user)) {
    return { error: "You do not have permission to manage roles." };
  }

  const role = await prisma.role.findFirst({
    where: { id: roleId, organizationId: orgId, deletedAt: null },
  });

  if (!role) {
    return { error: "Role not found." };
  }

  await prisma.$transaction(async (tx) => {
    const now = new Date();
    const currentUserId = (user as { id?: string } | null)?.id ?? null;
    await tx.rolePermission.updateMany({
      where: { roleId },
      data: { deletedAt: now, deletedById: currentUserId ?? undefined },
    });
    for (const permissionId of permissionIds) {
      const existing = await tx.rolePermission.findUnique({
        where: {
          roleId_permissionId: { roleId, permissionId },
        },
      });
      if (existing) {
        await tx.rolePermission.update({
          where: { roleId_permissionId: { roleId, permissionId } },
          data: { deletedAt: null, deletedById: null },
        });
      } else {
        await tx.rolePermission.create({
          data: { roleId, permissionId },
        });
      }
    }
  });

  revalidatePath("/settings/roles");
  return { success: true };
}

export async function createRole(formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await getCurrentUser();
  if (!canManageRoles(user)) {
    return { error: "You do not have permission to manage roles." };
  }

  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Role name is required." };

  const existing = await prisma.role.findFirst({
    where: { name, organizationId: orgId, deletedAt: null },
  });
  if (existing) return { error: "A role with this name already exists." };

  await prisma.role.create({
    data: { name, organizationId: orgId },
  });

  revalidatePath("/settings/roles");
  return { success: true };
}

export async function deleteRole(roleId: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await getCurrentUser();
  if (!canManageRoles(user)) {
    return { error: "You do not have permission to manage roles." };
  }

  const role = await prisma.role.findFirst({
    where: { id: roleId, organizationId: orgId, deletedAt: null },
    include: {
      userOrganizations: {
        where: { deletedAt: null },
      },
    },
  });
  if (!role) return { error: "Role not found." };
  if (role.userOrganizations?.length) {
    return { error: "Cannot delete role: users are assigned to it. Reassign users first." };
  }

  await prisma.role.update({
    where: { id: roleId },
    data: {
      deletedAt: new Date(),
      deletedById: (user as { id?: string }).id ?? undefined,
    },
  });

  revalidatePath("/settings/roles");
  return { success: true };
}
