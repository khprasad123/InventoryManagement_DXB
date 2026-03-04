"use server";

import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { calculateDueDate } from "@/lib/date-utils";

const grnItemSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  purchasePrice: z.coerce.number().min(0, "Price must be ≥ 0"),
});

const grnSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  receivedDate: z.string().min(1, "Date is required"),
  grnNo: z.string().min(1, "GRN number is required").max(50),
  notes: z.string().optional(),
  items: z.array(grnItemSchema).min(1, "Add at least one item"),
});

const purchaseInvoiceSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  grnId: z.string().optional(),
  invoiceNo: z.string().min(1, "Invoice number is required").max(50),
  invoiceDate: z.string().min(1, "Date is required"),
  subtotal: z.coerce.number().min(0),
  taxAmount: z.coerce.number().min(0).default(0),
  paidAmount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
});

export async function getGrns() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  return prisma.grn.findMany({
    where: { organizationId: orgId, deletedAt: null },
    include: { supplier: true, items: { include: { item: true } } },
    orderBy: { receivedDate: "desc" },
  });
}

export async function getGrnById(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  return prisma.grn.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: {
      supplier: true,
      items: { include: { item: true } },
      purchaseInvoices: true,
    },
  });
}

export async function getNextGrnNo() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  const last = await prisma.grn.findFirst({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  const n = last ? parseInt(last.grnNo.replace(/\D/g, ""), 10) || 0 : 0;
  return `GRN-${String(n + 1).padStart(5, "0")}`;
}

export async function createGrn(formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const itemsJson = formData.get("items") as string;
  const items = itemsJson ? (JSON.parse(itemsJson) as { itemId: string; quantity: number; purchasePrice: number }[]) : [];

  const parsed = grnSchema.safeParse({
    supplierId: formData.get("supplierId"),
    receivedDate: formData.get("receivedDate"),
    grnNo: formData.get("grnNo"),
    notes: formData.get("notes") || undefined,
    items,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { supplierId, receivedDate, grnNo, notes, items: grnItems } = parsed.data;

  const existing = await prisma.grn.findFirst({
    where: { organizationId: orgId, grnNo, deletedAt: null },
  });
  if (existing) {
    return { error: { grnNo: ["GRN number already exists"] } };
  }

  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, organizationId: orgId, deletedAt: null },
  });
  if (!supplier) {
    return { error: { _form: ["Supplier not found"] } };
  }

  await prisma.$transaction(async (tx) => {
    const grn = await tx.grn.create({
      data: {
        organizationId: orgId,
        supplierId,
        grnNo,
        receivedDate: new Date(receivedDate),
        notes: notes || null,
      },
    });

    for (const it of grnItems) {
      const item = await tx.item.findFirst({
        where: { id: it.itemId, organizationId: orgId, deletedAt: null },
      });
      if (!item) throw new Error(`Item ${it.itemId} not found`);
      const total = it.quantity * it.purchasePrice;

      await tx.grnItem.create({
        data: {
          grnId: grn.id,
          itemId: it.itemId,
          quantity: it.quantity,
          purchasePrice: it.purchasePrice,
          total,
        },
      });

      const newStock = item.stockQty + it.quantity;
      const oldCost = Number(item.costPrice);
      const newCost =
        item.stockQty + it.quantity > 0
          ? (oldCost * item.stockQty + it.purchasePrice * it.quantity) /
            (item.stockQty + it.quantity)
          : it.purchasePrice;

      await tx.stockMovement.create({
        data: {
          organizationId: orgId,
          itemId: it.itemId,
          type: "IN",
          quantity: it.quantity,
          referenceType: "GRN",
          referenceId: grn.id,
          notes: `GRN ${grnNo}`,
        },
      });

      await tx.item.update({
        where: { id: it.itemId },
        data: { stockQty: newStock, costPrice: newCost },
      });
    }
  });

  revalidatePath("/purchases");
  revalidatePath("/purchases/grn");
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
  redirect("/purchases/grn");
}

export async function getPurchaseInvoices() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  return prisma.purchaseInvoice.findMany({
    where: { organizationId: orgId, deletedAt: null },
    include: { supplier: true, grn: true },
    orderBy: { invoiceDate: "desc" },
  });
}

export async function getPurchaseInvoiceById(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  return prisma.purchaseInvoice.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: {
      supplier: true,
      grn: true,
      items: { include: { item: true } },
    },
  });
}

export async function getNextInvoiceNo() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  const last = await prisma.purchaseInvoice.findFirst({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  const n = last ? parseInt(last.invoiceNo.replace(/\D/g, ""), 10) || 0 : 0;
  return `INV-${String(n + 1).padStart(5, "0")}`;
}

export async function createPurchaseInvoice(formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const parsed = purchaseInvoiceSchema.safeParse({
    supplierId: formData.get("supplierId"),
    grnId: formData.get("grnId") || undefined,
    invoiceNo: formData.get("invoiceNo"),
    invoiceDate: formData.get("invoiceDate"),
    subtotal: formData.get("subtotal"),
    taxAmount: formData.get("taxAmount") || 0,
    paidAmount: formData.get("paidAmount") || 0,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { supplierId, grnId, invoiceNo, invoiceDate, subtotal, taxAmount, paidAmount, notes } =
    parsed.data;

  const existing = await prisma.purchaseInvoice.findFirst({
    where: { organizationId: orgId, invoiceNo, deletedAt: null },
  });
  if (existing) {
    return { error: { invoiceNo: ["Invoice number already exists"] } };
  }

  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, organizationId: orgId, deletedAt: null },
  });
  if (!supplier) {
    return { error: { _form: ["Supplier not found"] } };
  }

  const invDate = new Date(invoiceDate);
  const dueDate = calculateDueDate(invDate, supplier.defaultPaymentTerms);
  const totalAmount = subtotal + taxAmount;
  const paymentStatus =
    paidAmount >= totalAmount ? "PAID" : paidAmount > 0 ? "PARTIAL" : "UNPAID";

  await prisma.purchaseInvoice.create({
    data: {
      organizationId: orgId,
      supplierId,
      grnId: grnId || null,
      invoiceNo,
      invoiceDate: invDate,
      dueDate,
      subtotal,
      taxAmount,
      totalAmount,
      paidAmount: paidAmount || 0,
      paymentStatus,
      notes: notes || null,
    },
  });

  revalidatePath("/purchases");
  revalidatePath("/dashboard");
  redirect("/purchases");
}
