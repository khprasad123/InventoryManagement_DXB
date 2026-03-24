"use server";

import { prisma } from "@/lib/prisma";
import { getOrganizationId, getCurrentUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { hash } from "bcryptjs";
import { z } from "zod";
import { isSuperAdmin, PERMISSIONS, requirePermission } from "@/lib/permissions";

export async function getOrgUsers() {
  await requirePermission(PERMISSIONS.SETTINGS_USERS_READ);
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  return prisma.userOrganization.findMany({
    where: { organizationId: orgId, deletedAt: null },
    include: {
      user: { select: { id: true, email: true, name: true } },
      role: { select: { id: true, name: true } },
    },
    orderBy: { user: { name: "asc" } },
  });
}

const PAGE_SIZE = 10;
const searchMode = "insensitive" as const;

export async function getOrgUsersPaginated(page: number, search?: string) {
  await requirePermission(PERMISSIONS.SETTINGS_USERS_READ);
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const currentPage = Math.max(1, page);
  const q = (search ?? "").trim();

  const where = {
    organizationId: orgId,
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { user: { name: { contains: q, mode: searchMode } } },
            { user: { email: { contains: q, mode: searchMode } } },
          ],
        }
      : {}),
  };

  const total = await prisma.userOrganization.count({ where });

  const orgUsers = await prisma.userOrganization.findMany({
    where,
    include: {
      user: { select: { id: true, email: true, name: true } },
      role: { select: { id: true, name: true } },
    },
    orderBy: { user: { name: "asc" } },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return {
    orgUsers,
    total,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE) || 1,
    currentPage,
  };
}

export async function getRolesForOrg() {
  await requirePermission(PERMISSIONS.SETTINGS_USERS_READ);
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
  addAsSuperAdmin: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "on"),
});

export async function createOrgUser(formData: FormData) {
  try {
  await requirePermission(PERMISSIONS.SETTINGS_USERS_CREATE);
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const currentUser = await getCurrentUser();

  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name") || undefined,
    password: formData.get("password"),
    roleId: formData.get("roleId"),
    addAsSuperAdmin: formData.get("isSuperAdmin") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { email, name, password, roleId, addAsSuperAdmin } = parsed.data;

  const existingUser = await prisma.user.findFirst({
    where: { email, deletedAt: null },
  });

  const role = await prisma.role.findFirst({
    where: { id: roleId, organizationId: orgId, deletedAt: null },
  });
  if (!role) {
    return { error: { _form: ["Invalid role. Please select a role from the list."] } };
  }

  const canSetSuperAdmin = isSuperAdmin(currentUser);
  const newUserIsSuperAdmin = canSetSuperAdmin && addAsSuperAdmin;
  
  let existingLink: { id: string; deletedAt: Date | null } | null = null;
  if (existingUser) {
    existingLink = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: { userId: existingUser.id, organizationId: orgId },
      },
    });
    if (existingLink?.deletedAt == null) {
      return { error: { email: ["This user is already in your organization."] } };
    }
  }

  // Enforce org plan max users (excluding super admin) only when we are about to create a new membership
  const plan = await prisma.orgPlan.findUnique({
    where: { organizationId: orgId },
  });
  if (plan && !newUserIsSuperAdmin) {
    const nonSuperAdminCount = await prisma.userOrganization.count({
      where: {
        organizationId: orgId,
        isSuperAdmin: false,
        deletedAt: null,
      },
    });
    if (nonSuperAdminCount >= plan.maxUsers) {
      return {
        error: {
          _form: [
            `Organization plan allows max ${plan.maxUsers} users (excluding super admin). You currently have ${nonSuperAdminCount}. Upgrade the plan in Settings > Plan to add more users.`,
          ],
        },
      };
    }
  }

  if (existingUser) {
    if (existingLink?.deletedAt != null) {
      await prisma.userOrganization.update({
        where: { id: existingLink.id },
        data: {
          roleId: role.id,
          isSuperAdmin: newUserIsSuperAdmin,
          deletedAt: null,
          deletedById: null,
        },
      });
    } else {
      await prisma.userOrganization.create({
        data: {
          userId: existingUser.id,
          organizationId: orgId,
          roleId: role.id,
          isSuperAdmin: newUserIsSuperAdmin,
        },
      });
    }
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
        isSuperAdmin: newUserIsSuperAdmin,
      },
    });
  }

  revalidatePath("/settings/users");
  return { success: true };
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err && String((err as { digest?: string }).digest ?? "").startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err ?? "Failed to add user.");
    return { error: { _form: [message] } };
  }
}

const updateUserSchema = z.object({
  roleId: z.string().min(1, "Role is required"),
});

export async function updateOrgUser(userOrgId: string, formData: FormData) {
  await requirePermission(PERMISSIONS.SETTINGS_USERS_UPDATE);
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const parsed = updateUserSchema.safeParse({
    roleId: formData.get("roleId"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const userOrg = await prisma.userOrganization.findFirst({
    where: { id: userOrgId, organizationId: orgId, deletedAt: null },
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
  await requirePermission(PERMISSIONS.SETTINGS_USERS_DELETE);
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const currentUser = await getCurrentUser();

  const userOrg = await prisma.userOrganization.findFirst({
    where: { id: userOrgId, organizationId: orgId, deletedAt: null },
  });

  if (!userOrg) {
    return { error: "User not found in organization." };
  }

  if (userOrg.isSuperAdmin) {
    return { error: "Super admins cannot be removed from the organization." };
  }

  const currentUserId = (currentUser as { id?: string }).id;
  if (userOrg.userId === currentUserId) {
    return { error: "You cannot remove yourself from the organization." };
  }

  await prisma.userOrganization.update({
    where: { id: userOrgId },
    data: {
      deletedAt: new Date(),
      deletedById: currentUserId ?? undefined,
    },
  });

  revalidatePath("/settings/users");
  return { success: true };
}

const resetPasswordSchema = z.object({
  userId: z.string().min(1, "User is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password"),
});

export async function resetUserPassword(formData: FormData): Promise<{ error?: string }> {
  await requirePermission(PERMISSIONS.SETTINGS_USERS_RESET_PASSWORD);
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const currentUser = await getCurrentUser();
  if (!isSuperAdmin(currentUser)) {
    return { error: "Only super admins can reset user passwords." };
  }

  const parsed = resetPasswordSchema.safeParse({
    userId: formData.get("userId"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors.newPassword?.[0] ?? "Invalid input." };
  }

  if (parsed.data.newPassword !== parsed.data.confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const userOrg = await prisma.userOrganization.findFirst({
    where: { userId: parsed.data.userId, organizationId: orgId, deletedAt: null },
  });
  if (!userOrg) {
    return { error: "User not found in this organization." };
  }

  const passwordHash = await hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: parsed.data.userId },
    data: { passwordHash },
  });

  revalidatePath("/settings/users");
  return {};
}

export async function setSuperAdmin(userOrgId: string, makeSuperAdmin: boolean) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const currentUser = await getCurrentUser();
  if (!isSuperAdmin(currentUser)) {
    return { error: "Only the current super admin can assign super admin." };
  }

  const userOrg = await prisma.userOrganization.findFirst({
    where: { id: userOrgId, organizationId: orgId, deletedAt: null },
  });

  if (!userOrg) {
    return { error: "User not found." };
  }

  if (makeSuperAdmin) {
    await prisma.userOrganization.updateMany({
      where: { organizationId: orgId, deletedAt: null },
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
