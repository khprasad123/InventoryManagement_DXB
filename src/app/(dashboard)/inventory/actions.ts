"use server";

import { prisma } from "@/lib/prisma";
import { getOrganizationId, getCurrentUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { canAdjustStock } from "@/lib/permissions";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const ITEMS_PER_PAGE = 10;

const itemSchema = z.object({
  sku: z.string().min(1, "SKU is required").max(50),
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required").max(100),
  unit: z.string().min(1, "Unit is required").max(20).default("pcs"),
  costPrice: z.coerce.number().min(0, "Cost must be ≥ 0"),
  sellingPrice: z.coerce.number().min(0, "Selling price must be ≥ 0"),
  minStock: z.coerce.number().int().min(0, "Min stock must be ≥ 0"),
});

const stockMovementSchema = z.object({
  itemId: z.string().min(1),
  type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  notes: z.string().optional(),
});

export async function getItemsPaginated(
  page: number = 1,
  categoryFilter: string = "all",
  search: string = ""
) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const where: {
    organizationId: string;
    deletedAt: null;
    category?: string;
    OR?: Array<{ name?: { contains: string; mode: "insensitive" }; sku?: { contains: string; mode: "insensitive" } }>;
  } = {
    organizationId: orgId,
    deletedAt: null,
  };
  if (categoryFilter && categoryFilter !== "all") {
    where.category = categoryFilter;
  }
  if (search?.trim()) {
    const s = search.trim();
    where.OR = [
      { name: { contains: s, mode: "insensitive" } },
      { sku: { contains: s, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.item.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
    }),
    prisma.item.count({ where }),
  ]);

  return {
    items,
    total,
    totalPages: Math.ceil(total / ITEMS_PER_PAGE),
    currentPage: page,
  };
}

export async function getItemCategories(orgId: string) {
  const categories = await prisma.item.findMany({
    where: { organizationId: orgId, deletedAt: null, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
  });
  return categories
    .map((c) => c.category)
    .filter(Boolean)
    .sort() as string[];
}

export async function getItemById(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const item = await prisma.item.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  });
  return item;
}

export async function createItem(formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const parsed = itemSchema.safeParse({
    sku: formData.get("sku"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    category: formData.get("category") || "General",
    unit: formData.get("unit") || "pcs",
    costPrice: formData.get("costPrice"),
    sellingPrice: formData.get("sellingPrice"),
    minStock: formData.get("minStock") || 0,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { sku, name, description, category, unit, costPrice, sellingPrice, minStock } =
    parsed.data;

  const existing = await prisma.item.findFirst({
    where: { organizationId: orgId, sku, deletedAt: null },
  });
  if (existing) {
    return { error: { sku: ["SKU already exists"] } };
  }

  await prisma.item.create({
    data: {
      organizationId: orgId,
      sku,
      name,
      description: description || null,
      category: category || "General",
      unit,
      costPrice,
      sellingPrice,
      minStock,
      stockQty: 0,
    },
  });

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  redirect("/inventory");
}

export async function updateItem(id: string, formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const parsed = itemSchema.safeParse({
    sku: formData.get("sku"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    category: formData.get("category") || "General",
    unit: formData.get("unit") || "pcs",
    costPrice: formData.get("costPrice"),
    sellingPrice: formData.get("sellingPrice"),
    minStock: formData.get("minStock") || 0,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const existing = await prisma.item.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  });
  if (!existing) {
    return { error: { _form: ["Item not found"] } };
  }

  const { sku, name, description, category, unit, costPrice, sellingPrice, minStock } =
    parsed.data;

  if (sku !== existing.sku) {
    const skuTaken = await prisma.item.findFirst({
      where: { organizationId: orgId, sku, deletedAt: null },
    });
    if (skuTaken) {
      return { error: { sku: ["SKU already exists"] } };
    }
  }

  await prisma.item.update({
    where: { id },
    data: {
      sku,
      name,
      description: description || null,
      category: category || "General",
      unit,
      costPrice,
      sellingPrice,
      minStock,
    },
  });

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}/edit`);
  redirect("/inventory");
}

export async function deleteItem(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const item = await prisma.item.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  });
  if (!item) {
    return { error: "Item not found" };
  }

  await prisma.item.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function createStockMovement(formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const parsed = stockMovementSchema.safeParse({
    itemId: formData.get("itemId"),
    type: formData.get("type"),
    quantity: formData.get("quantity"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { itemId, type, quantity, notes } = parsed.data;

  if (type === "ADJUSTMENT") {
    const user = await getCurrentUser();
    if (!canAdjustStock(user?.role)) {
      return {
        error: {
          _form: ["Only Inventory can adjust stock."],
        },
      };
    }
  }

  const item = await prisma.item.findFirst({
    where: { id: itemId, organizationId: orgId, deletedAt: null },
  });
  if (!item) {
    return { error: { _form: ["Item not found"] } };
  }

  const quantityDelta = type === "OUT" ? -quantity : quantity;
  const newStock = item.stockQty + quantityDelta;

  if (newStock < 0) {
    return { error: { quantity: ["Insufficient stock. Cannot go negative."] } };
  }

  await prisma.$transaction(async (tx) => {
    await tx.stockMovement.create({
      data: {
        organizationId: orgId,
        itemId,
        type: type as "IN" | "OUT" | "ADJUSTMENT",
        quantity: quantityDelta,
        notes: notes || null,
      },
    });
    await tx.item.update({
      where: { id: itemId },
      data: { stockQty: newStock },
    });
  });

  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  return { success: true };
}
