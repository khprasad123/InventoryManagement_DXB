"use server";

import { prisma } from "@/lib/prisma";
import { getOrganizationId, getCurrentUser } from "@/lib/auth-utils";
import { createAuditLog } from "@/lib/audit";
import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { uploadDocument } from "@/app/(dashboard)/documents/actions";

// -----------------------------------------------------------------------------
// Expense Categories
// -----------------------------------------------------------------------------

const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
});

const PAGE_SIZE = 10;
const searchMode = "insensitive" as const;

export async function getExpenseCategories() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  return prisma.expenseCategory.findMany({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: { name: "asc" },
  });
}

export async function getExpenseCategoriesPaginated(page: number, search?: string) {
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
            { name: { contains: q, mode: searchMode } },
            { description: { contains: q, mode: searchMode } },
          ],
        }
      : {}),
  };

  const total = await prisma.expenseCategory.count({ where });

  const categories = await prisma.expenseCategory.findMany({
    where,
    orderBy: { name: "asc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return {
    categories,
    total,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE) || 1,
    currentPage,
  };
}

export async function getExpenseCategoryById(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  return prisma.expenseCategory.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: { _count: { select: { expenses: true } } },
  });
}

export async function createExpenseCategory(formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const existing = await prisma.expenseCategory.findFirst({
    where: {
      organizationId: orgId,
      name: parsed.data.name,
      deletedAt: null,
    },
  });
  if (existing) {
    return { error: { name: ["Category name already exists"] } };
  }

  await prisma.expenseCategory.create({
    data: {
      organizationId: orgId,
      name: parsed.data.name,
      description: parsed.data.description || null,
    },
  });

  revalidatePath("/expenses");
  revalidatePath("/expenses/categories");
  redirect("/expenses/categories");
}

export async function updateExpenseCategory(id: string, formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const existing = await prisma.expenseCategory.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  });
  if (!existing) {
    return { error: { _form: ["Category not found"] } };
  }

  const duplicate = await prisma.expenseCategory.findFirst({
    where: {
      organizationId: orgId,
      name: parsed.data.name,
      deletedAt: null,
      id: { not: id },
    },
  });
  if (duplicate) {
    return { error: { name: ["Category name already exists"] } };
  }

  await prisma.expenseCategory.update({
    where: { id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
    },
  });

  revalidatePath("/expenses");
  revalidatePath("/expenses/categories");
  revalidatePath(`/expenses/categories/${id}/edit`);
  redirect("/expenses/categories");
}

export async function deleteExpenseCategory(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  const currentUser = await getCurrentUser();
  const currentUserId = (currentUser as { id?: string } | null)?.id ?? null;

  const category = await prisma.expenseCategory.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: { _count: { select: { expenses: true } } },
  });
  if (!category) {
    return { error: "Category not found" };
  }
  if (category._count.expenses > 0) {
    return {
      error: `Cannot delete: ${category._count.expenses} expense(s) use this category.`,
    };
  }

  await prisma.expenseCategory.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: currentUserId ?? undefined },
  });

  revalidatePath("/expenses");
  revalidatePath("/expenses/categories");
  redirect("/expenses/categories");
}

// -----------------------------------------------------------------------------
// Expense Entries
// -----------------------------------------------------------------------------

const expenseSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  amount: z.coerce.number().min(0.01, "Amount must be positive"),
  expenseDate: z.string().min(1, "Date is required"),
  description: z.string().max(1000).optional(),
  isRecurring: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => v === "on" || v === "true"),
  currencyCode: z.string().min(1).max(10).default("AED"),
});

export async function getExpenses() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  return prisma.expense.findMany({
    where: { organizationId: orgId, deletedAt: null },
    include: { category: true },
    orderBy: { expenseDate: "desc" },
  });
}

export async function getExpensesPaginated(page: number, search?: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const q = (search ?? "").trim();
  const where = {
    organizationId: orgId,
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { description: { contains: q, mode: searchMode } },
            { category: { name: { contains: q, mode: searchMode } } },
          ],
        }
      : {}),
  };

  const currentPage = Math.max(1, page);
  const total = await prisma.expense.count({ where });

  const expenses = await prisma.expense.findMany({
    where,
    include: { category: true },
    orderBy: { expenseDate: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return {
    expenses,
    total,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE) || 1,
    currentPage,
  };
}

export async function getExpenseById(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  return prisma.expense.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: { category: true },
  });
}

export async function createExpense(formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const parsed = expenseSchema.safeParse({
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    expenseDate: formData.get("expenseDate"),
    description: formData.get("description") || undefined,
    isRecurring: formData.get("isRecurring"),
    currencyCode: formData.get("currencyCode") || "AED",
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const category = await prisma.expenseCategory.findFirst({
    where: {
      id: parsed.data.categoryId,
      organizationId: orgId,
      deletedAt: null,
    },
  });
  if (!category) {
    return { error: { categoryId: ["Category not found"] } };
  }

  const user = await getCurrentUser();
  const userId = (user as { id?: string } | null)?.id ?? null;

  const expense = await prisma.expense.create({
    data: {
      organizationId: orgId,
      categoryId: parsed.data.categoryId,
      amount: parsed.data.amount,
      expenseDate: new Date(parsed.data.expenseDate),
      description: parsed.data.description || null,
      isRecurring: parsed.data.isRecurring ?? false,
      currencyCode: parsed.data.currencyCode || "AED",
      createdById: userId ?? undefined,
      updatedById: userId ?? undefined,
    },
  });

  await createAuditLog({
    action: "CREATE_Expense",
    entityType: "Expense",
    entityId: expense.id,
    metadata: { amount: Number(expense.amount), categoryId: expense.categoryId },
  });

  const file = formData.get("attachment") as File | null;
  if (file && file.size > 0) {
    const fd = new FormData();
    fd.set("file", file);
    fd.set("documentableType", "Expense");
    fd.set("documentableId", expense.id);
    await uploadDocument(fd);
  }

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  redirect("/expenses");
}

export async function updateExpense(id: string, formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const parsed = expenseSchema.safeParse({
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    expenseDate: formData.get("expenseDate"),
    description: formData.get("description") || undefined,
    isRecurring: formData.get("isRecurring"),
    currencyCode: formData.get("currencyCode") || "AED",
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const user = await getCurrentUser();
  const userId = (user as { id?: string } | null)?.id ?? null;

  const existing = await prisma.expense.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  });
  if (!existing) {
    return { error: { _form: ["Expense not found"] } };
  }

  const category = await prisma.expenseCategory.findFirst({
    where: {
      id: parsed.data.categoryId,
      organizationId: orgId,
      deletedAt: null,
    },
  });
  if (!category) {
    return { error: { categoryId: ["Category not found"] } };
  }

  await prisma.expense.update({
    where: { id },
    data: {
      categoryId: parsed.data.categoryId,
      amount: parsed.data.amount,
      expenseDate: new Date(parsed.data.expenseDate),
      description: parsed.data.description || null,
      isRecurring: parsed.data.isRecurring ?? false,
      currencyCode: parsed.data.currencyCode || "AED",
      updatedById: userId ?? undefined,
    },
  });

  await createAuditLog({
    action: "UPDATE_Expense",
    entityType: "Expense",
    entityId: id,
    metadata: { amount: parsed.data.amount },
  });

  revalidatePath("/expenses");
  revalidatePath(`/expenses/${id}/edit`);
  redirect("/expenses");
}

export async function deleteExpense(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  const currentUser = await getCurrentUser();
  const currentUserId = (currentUser as { id?: string } | null)?.id ?? null;

  const existing = await prisma.expense.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  });
  if (!existing) {
    return { error: "Expense not found" };
  }

  await prisma.expense.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: currentUserId ?? undefined },
  });

  await createAuditLog({
    action: "DELETE_Expense",
    entityType: "Expense",
    entityId: id,
    metadata: { amount: Number(existing.amount) },
  });

  revalidatePath("/expenses");
  redirect("/expenses");
}
