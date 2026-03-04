"use server";

import { prisma } from "@/lib/prisma";
import { getOrganizationId, getCurrentUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import { z } from "zod";
import { canManageUsers, isSuperAdmin } from "@/lib/permissions";

export async function getOrgUsers() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await getCurrentUser();
  if (!canManageUsers(user)) redirect("/settings");

  return prisma.userOrganization.findMany({
    where: { organizationId: orgId },
    include: {
      user: { select: { id: true, email: true, name: true } },
      role: { select: { id: true, name: true } },
    },
    orderBy: { user: { name: "asc" } },
  });
}

export async function getRolesForOrg() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  return prisma.role.findMany({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: { name: "asc" },
  });
}

const createUserSchema = z.object({
  email: z.string().email("Invalid email"),
  name: z.string().max(255).optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  roleId: z.string().min(1, "Role is required"),
});

export async function createOrgUser(formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const currentUser = await getCurrentUser();
  if (!canManageUsers(currentUser)) {
    return { error: { _form: ["You do not have permission to manage users."] } };
  }

  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name") || undefined,
    password: formData.get("password"),
    roleId: formData.get("roleId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { email, name, password, roleId } = parsed.data;

  const existingUser = await prisma.user.findFirst({
    where: { email, deletedAt: null },
  });

  const role = await prisma.role.findFirst({
    where: { id: roleId, organizationId: orgId, deletedAt: null },
  });
  if (!role) {
    return { error: { roleId: ["Invalid role"] } };
  }

  if (existingUser) {
    const existingLink = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: { userId: existingUser.id, organizationId: orgId },
      },
    });
    if (existingLink) {
      return { error: { email: ["This user is already in your organization."] } };
    }
    await prisma.userOrganization.create({
      data: {
        userId: existingUser.id,
        organizationId: orgId,
        roleId: role.id,
      },
    });
  } else {
    const passwordHash = await hash(password, 12);
    const newUser = await prisma.user.create({
      data: {
        email,
        name: name || null,
        passwordHash,
      },
    });
    await prisma.userOrganization.create({
      data: {
        userId: newUser.id,
        organizationId: orgId,
        roleId: role.id,
      },
    });
  }

  revalidatePath("/settings/users");
  redirect("/settings/users");
}

const updateUserSchema = z.object({
  roleId: z.string().min(1, "Role is required"),
});

export async function updateOrgUser(userOrgId: string, formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const currentUser = await getCurrentUser();
  if (!canManageUsers(currentUser)) {
    return { error: { _form: ["You do not have permission to manage users."] } };
  }

  const parsed = updateUserSchema.safeParse({
    roleId: formData.get("roleId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const userOrg = await prisma.userOrganization.findFirst({
    where: { id: userOrgId, organizationId: orgId },
    include: { user: true, role: true },
  });

  if (!userOrg) {
    return { error: { _form: ["User not found in organization."] } };
  }

  if (userOrg.isSuperAdmin) {
    return { error: { _form: ["Super admins cannot be updated."] } };
  }

  const role = await prisma.role.findFirst({
    where: { id: parsed.data.roleId, organizationId: orgId, deletedAt: null },
  });
  if (!role) {
    return { error: { roleId: ["Invalid role"] } };
  }

  await prisma.userOrganization.update({
    where: { id: userOrgId },
    data: { roleId: role.id },
  });

  revalidatePath("/settings/users");
  redirect("/settings/users");
}

export async function removeUserFromOrg(userOrgId: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const currentUser = await getCurrentUser();
  if (!canManageUsers(currentUser)) {
    return { error: "You do not have permission to manage users." };
  }

  const userOrg = await prisma.userOrganization.findFirst({
    where: { id: userOrgId, organizationId: orgId },
  });

  if (!userOrg) {
    return { error: "User not found in organization." };
  }

  if (userOrg.isSuperAdmin) {
    return { error: "Super admins cannot be removed from the organization." };
  }

  await prisma.userOrganization.delete({
    where: { id: userOrgId },
  });

  revalidatePath("/settings/users");
  return { success: true };
}

export async function setSuperAdmin(userOrgId: string, makeSuperAdmin: boolean) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const currentUser = await getCurrentUser();
  if (!isSuperAdmin(currentUser)) {
    return { error: "Only the current super admin can assign super admin." };
  }

  const userOrg = await prisma.userOrganization.findFirst({
    where: { id: userOrgId, organizationId: orgId },
  });

  if (!userOrg) {
    return { error: "User not found." };
  }

  if (makeSuperAdmin) {
    await prisma.userOrganization.updateMany({
      where: { organizationId: orgId },
      data: { isSuperAdmin: false },
    });
  }

  await prisma.userOrganization.update({
    where: { id: userOrgId },
    data: { isSuperAdmin: makeSuperAdmin },
  });

  revalidatePath("/settings/users");
  return { success: true };
}
