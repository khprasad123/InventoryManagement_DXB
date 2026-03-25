"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import type { GlAccountType, GlNormalSide } from "@prisma/client";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 10;
const searchMode = "insensitive" as const;

function normalizeCheckboxValue(v: FormDataEntryValue | null | undefined): boolean {
  const s = String(v ?? "");
  return s === "on" || s === "true" || s === "1";
}

export async function getGlAccountsPaginated(page: number, search?: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  await requirePermission(PERMISSIONS.GL_ACCOUNTS_READ);

  const q = (search ?? "").trim();
  const where: Prisma.GlAccountWhereInput = {
    organizationId: orgId,
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { code: { contains: q, mode: searchMode } },
            { name: { contains: q, mode: searchMode } },
          ],
        }
      : {}),
  };

  const currentPage = Math.max(1, page);
  const total = await prisma.glAccount.count({ where });

  const accounts = await prisma.glAccount.findMany({
    where,
    orderBy: { code: "asc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      normalSide: true,
      isTaxAccount: true,
    },
  });

  return {
    accounts,
    total,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE) || 1,
    currentPage,
  };
}

export async function getGlAccountById(accountId: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  await requirePermission(PERMISSIONS.GL_ACCOUNTS_READ);

  return prisma.glAccount.findFirst({
    where: { id: accountId, organizationId: orgId, deletedAt: null },
  });
}

export async function createGlAccount(formData: FormData): Promise<{ error?: Record<string, string[]> } | void> {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  await requirePermission(PERMISSIONS.MANAGE_JOURNALS);

  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim() as GlAccountType;
  const normalSide = String(formData.get("normalSide") ?? "").trim() as GlNormalSide;
  const isTaxAccount = normalizeCheckboxValue(formData.get("isTaxAccount"));

  if (!code) return { error: { code: ["GL account code is required"] } };
  if (!name) return { error: { name: ["GL account name is required"] } };
  if (!type) return { error: { type: ["Account type is required"] } };
  if (!normalSide) return { error: { normalSide: ["Normal side is required"] } };

  try {
    await prisma.glAccount.create({
      data: {
        organizationId: orgId,
        code,
        name,
        type,
        normalSide,
        isTaxAccount,
      },
    });
  } catch (e) {
    return { error: { _form: ["Failed to create GL account (code may already exist)"] } };
  }
}

export async function updateGlAccount(
  accountId: string,
  formData: FormData
): Promise<{ error?: Record<string, string[]> } | void> {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  await requirePermission(PERMISSIONS.MANAGE_JOURNALS);

  const existing = await prisma.glAccount.findFirst({
    where: { id: accountId, organizationId: orgId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return { error: { _form: ["GL account not found"] } };

  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim() as GlAccountType;
  const normalSide = String(formData.get("normalSide") ?? "").trim() as GlNormalSide;
  const isTaxAccount = normalizeCheckboxValue(formData.get("isTaxAccount"));

  if (!code) return { error: { code: ["GL account code is required"] } };
  if (!name) return { error: { name: ["GL account name is required"] } };
  if (!type) return { error: { type: ["Account type is required"] } };
  if (!normalSide) return { error: { normalSide: ["Normal side is required"] } };

  try {
    await prisma.glAccount.update({
      where: { id: accountId },
      data: { code, name, type, normalSide, isTaxAccount },
    });
  } catch {
    return { error: { _form: ["Failed to update GL account (code may already exist)"] } };
  }
}

export async function updateGlAccountAction(formData: FormData) {
  const accountId = String(formData.get("accountId") ?? "").trim();
  if (!accountId) return { error: { accountId: ["GL account id is required"] } };
  return updateGlAccount(accountId, formData);
}

export async function deleteGlAccount(accountId: string): Promise<{ error?: string } | void> {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  await requirePermission(PERMISSIONS.MANAGE_JOURNALS);

  const user = await getCurrentUser();
  const userId = (user as { id?: string } | null)?.id ?? null;

  const existing = await prisma.glAccount.findFirst({
    where: { id: accountId, organizationId: orgId, deletedAt: null },
    select: { id: true },
  });
  if (!existing) return { error: "GL account not found" };

  await prisma.glAccount.update({
    where: { id: accountId },
    data: { deletedAt: new Date(), deletedById: userId ?? undefined },
  });
}

