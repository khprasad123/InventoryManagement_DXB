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
        include: { permission: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return roles;
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

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    ...(permissionIds.length > 0
      ? [
          prisma.rolePermission.createMany({
            data: permissionIds.map((permissionId) => ({ roleId, permissionId })),
          }),
        ]
      : []),
  ]);

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
    include: { userOrganizations: true },
  });
  if (!role) return { error: "Role not found." };
  if (role.userOrganizations?.length) {
    return { error: "Cannot delete role: users are assigned to it. Reassign users first." };
  }

  await prisma.role.update({
    where: { id: roleId },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/settings/roles");
  return { success: true };
}
