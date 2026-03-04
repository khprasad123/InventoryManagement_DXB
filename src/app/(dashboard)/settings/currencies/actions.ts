"use server";

import { prisma } from "@/lib/prisma";
import { getOrganizationId, getCurrentUser } from "@/lib/auth-utils";
import { canManageUsers } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const currencySchema = z.object({
  code: z
    .string()
    .min(3, "Code must be at least 3 characters")
    .max(10, "Code too long")
    .transform((v) => v.toUpperCase()),
  name: z.string().min(1, "Name is required").max(100),
  symbol: z.string().max(10).optional(),
});

async function requireAdminOrg() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  const user = await getCurrentUser();
  if (!canManageUsers(user)) {
    throw new Error("Not authorized to manage currencies");
  }
  return orgId;
}

export async function getCurrenciesForSettings() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  return prisma.currency.findMany({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { code: "asc" }],
  });
}

export async function createCurrency(formData: FormData) {
  const orgId = await requireAdminOrg();

  const parsed = currencySchema.safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
    symbol: formData.get("symbol") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { code, name, symbol } = parsed.data;

  const existing = await prisma.currency.findFirst({
    where: { organizationId: orgId, code, deletedAt: null },
  });
  if (existing) {
    return { error: { code: ["Currency code already exists"] } };
  }

  await prisma.currency.create({
    data: {
      organizationId: orgId,
      code,
      name,
      symbol: symbol || null,
      isDefault: false,
    },
  });

  revalidatePath("/settings/currencies");
  return { success: true };
}

export async function setDefaultCurrency(id: string) {
  const orgId = await requireAdminOrg();

  const currency = await prisma.currency.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  });
  if (!currency) {
    return { error: "Currency not found" };
  }

  await prisma.$transaction([
    prisma.currency.updateMany({
      where: { organizationId: orgId },
      data: { isDefault: false },
    }),
    prisma.currency.update({
      where: { id },
      data: { isDefault: true },
    }),
  ]);

  revalidatePath("/settings/currencies");
  revalidatePath("/dashboard");
  return { success: true };
}

