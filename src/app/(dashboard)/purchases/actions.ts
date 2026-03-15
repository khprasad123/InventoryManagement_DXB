"use server";

import { prisma } from "@/lib/prisma";
import { getOrganizationId, getCurrentUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { canRecordPayments } from "@/lib/permissions";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { calculateDueDate } from "@/lib/date-utils";
import { uploadDocument } from "@/app/(dashboard)/documents/actions";
import { createAuditLog } from "@/lib/audit";

const grnItemSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  purchasePrice: z.coerce.number().min(0, "Price must be ≥ 0"),
});

const grnSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  purchaseOrderId: z.string().optional(),
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
  currencyCode: z.string().min(1).max(10).default("AED"),
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
    purchaseOrderId: formData.get("purchaseOrderId") || undefined,
    receivedDate: formData.get("receivedDate"),
    grnNo: formData.get("grnNo"),
    notes: formData.get("notes") || undefined,
    items,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { supplierId, purchaseOrderId, receivedDate, grnNo, notes, items: grnItems } = parsed.data;

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

  for (const it of grnItems) {
    const item = await prisma.item.findFirst({
      where: { id: it.itemId, organizationId: orgId, deletedAt: null },
    });
    if (!item) {
      return { error: { _form: [`Item not found: ${it.itemId}`] } };
    }
  }

  try {
  await prisma.$transaction(async (tx) => {
    const grn = await tx.grn.create({
      data: {
        organizationId: orgId,
        supplierId,
        purchaseOrderId: purchaseOrderId || null,
        grnNo,
        receivedDate: new Date(receivedDate),
        notes: notes || null,
      },
    });

    for (const it of grnItems) {
      const item = await tx.item.findFirst({
        where: { id: it.itemId, organizationId: orgId, deletedAt: null },
      });
      if (!item) throw new Error(`Item not found`);
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
      const oldCost = Number(item.defaultPurchaseCost);
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
        data: { stockQty: newStock, defaultPurchaseCost: newCost },
      });
    }
  });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create GRN";
    return { error: { _form: [msg] } };
  }

  revalidatePath("/purchases");
  revalidatePath("/purchases/grn");
  revalidatePath("/dashboard");
  revalidatePath("/inventory");
  redirect("/purchases/grn");
}

export async function getPurchaseOrdersForGrn() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  return prisma.purchaseOrder.findMany({
    where: { organizationId: orgId, deletedAt: null },
    include: {
      supplier: true,
      items: { include: { item: true } },
    },
    orderBy: { orderDate: "desc" },
  });
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
    currencyCode: formData.get("currencyCode") || "AED",
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { supplierId, grnId, invoiceNo, invoiceDate, subtotal, taxAmount, paidAmount, currencyCode, notes } =
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

  const user = await getCurrentUser();
  const userId = (user as { id?: string } | null)?.id ?? null;

  const invDate = new Date(invoiceDate);
  const dueDate = calculateDueDate(invDate, supplier.defaultPaymentTerms);
  const totalAmount = subtotal + taxAmount;
  const paymentStatus =
    paidAmount >= totalAmount ? "PAID" : paidAmount > 0 ? "PARTIAL" : "UNPAID";

  const invoice = await prisma.purchaseInvoice.create({
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
      currencyCode: currencyCode || "AED",
      notes: notes || null,
      createdById: userId ?? undefined,
      updatedById: userId ?? undefined,
    },
  });

  await createAuditLog({
    action: "CREATE_PurchaseInvoice",
    entityType: "PurchaseInvoice",
    entityId: invoice.id,
    metadata: { invoiceNo: invoice.invoiceNo },
  });

  const file = formData.get("attachment") as File | null;
  if (file && file.size > 0) {
    const fd = new FormData();
    fd.set("file", file);
    fd.set("documentableType", "PurchaseInvoice");
    fd.set("documentableId", invoice.id);
    await uploadDocument(fd);
  }

  revalidatePath("/purchases");
  revalidatePath("/dashboard");
  redirect("/purchases");
}

export async function updatePurchaseInvoice(id: string, formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const existing = await prisma.purchaseInvoice.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: { supplier: true },
  });
  if (!existing) return { error: { _form: ["Invoice not found"] } };

  const parsed = purchaseInvoiceSchema.safeParse({
    supplierId: formData.get("supplierId"),
    grnId: formData.get("grnId") || undefined,
    invoiceNo: formData.get("invoiceNo"),
    invoiceDate: formData.get("invoiceDate"),
    subtotal: formData.get("subtotal"),
    taxAmount: formData.get("taxAmount") || 0,
    paidAmount: formData.get("paidAmount") || 0,
    currencyCode: formData.get("currencyCode") || "AED",
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { supplierId, invoiceDate, subtotal, taxAmount, paidAmount, currencyCode, notes } =
    parsed.data;

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

  await prisma.purchaseInvoice.update({
    where: { id },
    data: {
      supplierId,
      invoiceDate: invDate,
      dueDate,
      subtotal,
      taxAmount,
      totalAmount,
      paidAmount: paidAmount || 0,
      paymentStatus,
      currencyCode: currencyCode || "AED",
      notes: notes || null,
    },
  });

  revalidatePath("/purchases");
  revalidatePath("/dashboard");
  revalidatePath(`/purchases/${id}`);
  redirect("/purchases");
}

export async function deletePurchaseInvoice(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const inv = await prisma.purchaseInvoice.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  });
  if (!inv) return { error: "Invoice not found" };

  await prisma.purchaseInvoice.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await createAuditLog({
    action: "DELETE_PurchaseInvoice",
    entityType: "PurchaseInvoice",
    entityId: id,
    metadata: { invoiceNo: inv.invoiceNo },
  });

  revalidatePath("/purchases");
  revalidatePath("/dashboard");
}

const supplierPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  paymentDate: z.string().min(1, "Payment date is required"),
  method: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export async function recordSupplierPayment(formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await getCurrentUser();
  if (!canRecordPayments(user)) {
    return { error: { _form: ["Only Finance can record payments."] } };
  }

  const parsed = supplierPaymentSchema.safeParse({
    invoiceId: formData.get("invoiceId"),
    amount: formData.get("amount"),
    paymentDate: formData.get("paymentDate"),
    method: formData.get("method") || undefined,
    reference: formData.get("reference") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { invoiceId, amount, paymentDate, method, reference, notes } =
    parsed.data;

  const invoice = await prisma.purchaseInvoice.findFirst({
    where: { id: invoiceId, organizationId: orgId, deletedAt: null },
  });

  if (!invoice) {
    return { error: { _form: ["Invoice not found"] } };
  }

  const total = Number(invoice.totalAmount);
  const alreadyPaid = Number(invoice.paidAmount);
  const outstanding = total - alreadyPaid;

  if (amount > outstanding + 0.0001) {
    return {
      error: {
        amount: [
          `Amount exceeds outstanding balance (${outstanding.toFixed(2)})`,
        ],
      },
    };
  }

  const payDate = new Date(paymentDate);

  await prisma.$transaction(async (tx) => {
    await tx.supplierPayment.create({
      data: {
        organizationId: orgId,
        purchaseInvoiceId: invoice.id,
        amount,
        paymentDate: payDate,
        method: method || null,
        reference: reference || null,
        notes: notes || null,
      },
    });

    const newPaid = alreadyPaid + amount;
    const newStatus =
      newPaid >= total ? "PAID" : newPaid > 0 ? "PARTIAL" : "UNPAID";

    await tx.purchaseInvoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: newPaid,
        paymentStatus: newStatus,
      },
    });
  });

  revalidatePath("/purchases");
  revalidatePath(`/purchases/${parsed.data.invoiceId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

// ============ Purchase Requests ============

export async function getPurchaseRequests() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  return prisma.purchaseRequest.findMany({
    where: { organizationId: orgId, deletedAt: null },
    include: {
      items: { include: { item: true } },
      salesOrder: { include: { quotation: { include: { client: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getPurchaseRequestById(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  return prisma.purchaseRequest.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: {
      items: { include: { item: true } },
      purchaseOrders: { include: { supplier: true } },
    },
  });
}

export async function getSalesOrdersForPr() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  return prisma.salesOrder.findMany({
    where: { organizationId: orgId, deletedAt: null },
    include: {
      items: { include: { item: true } },
      quotation: { include: { client: true } },
    },
    orderBy: { orderDate: "desc" },
  });
}

export async function getNextPrNo() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  const last = await prisma.purchaseRequest.findFirst({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  const n = last ? parseInt(last.prNo.replace(/\D/g, ""), 10) || 0 : 0;
  return `PR-${String(n + 1).padStart(5, "0")}`;
}

const purchaseRequestItemSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
});

export async function createPurchaseRequest(formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const itemsJson = formData.get("items") as string;
  let items: { itemId: string; quantity: number }[] = [];
  try {
    items = itemsJson ? (JSON.parse(itemsJson) as { itemId: string; quantity: number }[]) : [];
  } catch {
    return { error: { _form: ["Invalid items data"] } };
  }

  const prNo = (formData.get("prNo") as string)?.trim() || (await getNextPrNo());
  const notes = (formData.get("notes") as string)?.trim() || undefined;
  const salesOrderId = (formData.get("salesOrderId") as string)?.trim() || undefined;
  const jobId = (formData.get("jobId") as string)?.trim() || undefined;

  const parsed = z.array(purchaseRequestItemSchema).min(1, "Add at least one item").safeParse(items);
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  if (salesOrderId) {
    const so = await prisma.salesOrder.findFirst({
      where: { id: salesOrderId, organizationId: orgId, deletedAt: null },
    });
    if (!so) return { error: { _form: ["Sales order not found"] } };
  }

  // Merge duplicate items: one item per PR line (sum quantities for same itemId)
  const mergedItems = parsed.data.reduce(
    (acc, it) => {
      const existing = acc.find((x) => x.itemId === it.itemId);
      if (existing) {
        existing.quantity += it.quantity;
      } else {
        acc.push({ itemId: it.itemId, quantity: it.quantity });
      }
      return acc;
    },
    [] as { itemId: string; quantity: number }[]
  );

  const existing = await prisma.purchaseRequest.findFirst({
    where: { organizationId: orgId, prNo, deletedAt: null },
  });
  if (existing) return { error: { prNo: ["PR number already exists"] } };

  const user = await getCurrentUser();
  const userId = (user as { id?: string } | null)?.id ?? null;

  await prisma.$transaction(async (tx) => {
    const pr = await tx.purchaseRequest.create({
      data: {
        organizationId: orgId,
        prNo,
        salesOrderId: salesOrderId || null,
        jobId: jobId || null,
        status: "DRAFT",
        notes: notes || null,
        createdById: userId ?? undefined,
      },
    });
    for (const it of mergedItems) {
      await tx.purchaseRequestItem.create({
        data: {
          purchaseRequestId: pr.id,
          itemId: it.itemId,
          quantity: it.quantity,
        },
      });
    }
  });

  revalidatePath("/purchases/purchase-requests");
  return { success: true };
}

export async function updatePurchaseRequest(prId: string, formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const pr = await prisma.purchaseRequest.findFirst({
    where: { id: prId, organizationId: orgId, deletedAt: null },
  });
  if (!pr) return { error: "Purchase request not found" };
  if (pr.status !== "DRAFT") return { error: "Only draft PRs can be edited" };

  const itemsJson = formData.get("items") as string;
  let items: { itemId: string; quantity: number }[] = [];
  try {
    items = itemsJson ? (JSON.parse(itemsJson) as { itemId: string; quantity: number }[]) : [];
  } catch {
    return { error: { _form: ["Invalid items data"] } };
  }

  const prNo = (formData.get("prNo") as string)?.trim();
  const notes = (formData.get("notes") as string)?.trim() || null;
  const salesOrderId = (formData.get("salesOrderId") as string)?.trim() || null;
  const jobId = (formData.get("jobId") as string)?.trim() || null;

  const parsed = z.array(purchaseRequestItemSchema).min(1, "Add at least one item").safeParse(items);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  if (!prNo) return { error: { prNo: ["PR number is required"] } };

  const mergedItems = parsed.data.reduce(
    (acc, it) => {
      const existing = acc.find((x) => x.itemId === it.itemId);
      if (existing) existing.quantity += it.quantity;
      else acc.push({ itemId: it.itemId, quantity: it.quantity });
      return acc;
    },
    [] as { itemId: string; quantity: number }[]
  );

  const existing = await prisma.purchaseRequest.findFirst({
    where: { organizationId: orgId, prNo, deletedAt: null, id: { not: prId } },
  });
  if (existing) return { error: { prNo: ["PR number already exists"] } };

  if (salesOrderId) {
    const so = await prisma.salesOrder.findFirst({
      where: { id: salesOrderId, organizationId: orgId, deletedAt: null },
    });
    if (!so) return { error: { _form: ["Sales order not found"] } };
  }

  await prisma.$transaction(async (tx) => {
    await tx.purchaseRequest.update({
      where: { id: prId },
      data: {
        prNo,
        notes: notes || undefined,
        salesOrderId: salesOrderId || null,
        jobId: jobId || null,
      },
    });
    await tx.purchaseRequestItem.deleteMany({ where: { purchaseRequestId: prId } });
    for (const it of mergedItems) {
      await tx.purchaseRequestItem.create({
        data: { purchaseRequestId: prId, itemId: it.itemId, quantity: it.quantity },
      });
    }
  });

  revalidatePath("/purchases/purchase-requests");
  revalidatePath(`/purchases/purchase-requests/${prId}`);
  return { success: true };
}

export async function deletePurchaseRequest(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const pr = await prisma.purchaseRequest.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: { purchaseOrders: true },
  });
  if (!pr) return { error: "Purchase request not found" };
  if (pr.status !== "DRAFT") return { error: "Only draft PRs can be deleted" };
  if (pr.purchaseOrders?.length) return { error: "Cannot delete: PR has purchase orders (job in progress or fulfilled)." };

  await prisma.purchaseRequest.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/purchases/purchase-requests");
  revalidatePath(`/purchases/purchase-requests/${id}`);
  return { success: true };
}

export async function submitPurchaseRequestForApproval(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const pr = await prisma.purchaseRequest.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  });
  if (!pr) return { error: "Purchase request not found" };
  if (pr.status !== "DRAFT") return { error: "Only draft PRs can be submitted for approval" };

  await prisma.purchaseRequest.update({
    where: { id },
    data: { status: "PENDING_APPROVAL" },
  });

  revalidatePath("/purchases/purchase-requests");
  revalidatePath(`/purchases/purchase-requests/${id}`);
  return { success: true };
}

export async function approvePurchaseRequest(id: string, remarks?: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const pr = await prisma.purchaseRequest.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  });
  if (!pr) return { error: "Purchase request not found" };
  if (pr.status !== "PENDING_APPROVAL") return { error: "Only pending approval PRs can be approved" };

  const user = await getCurrentUser();
  const userId = (user as { id?: string } | null)?.id ?? null;

  await prisma.purchaseRequest.update({
    where: { id },
    data: {
      status: "APPROVED",
      approvedById: userId ?? undefined,
      approvedAt: new Date(),
      approvalRemarks: remarks?.trim() || null,
    },
  });

  revalidatePath("/purchases/purchase-requests");
  revalidatePath(`/purchases/purchase-requests/${id}`);
  return { success: true };
}

export async function rejectPurchaseRequest(id: string, remarks: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const trimmed = remarks?.trim();
  if (!trimmed) return { error: "Rejection reason (remarks) is required" };

  const pr = await prisma.purchaseRequest.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  });
  if (!pr) return { error: "Purchase request not found" };
  if (pr.status !== "PENDING_APPROVAL") return { error: "Only pending approval PRs can be rejected" };

  await prisma.purchaseRequest.update({
    where: { id },
    data: {
      status: "REJECTED",
      approvalRemarks: trimmed,
    },
  });

  revalidatePath("/purchases/purchase-requests");
  revalidatePath(`/purchases/purchase-requests/${id}`);
  return { success: true };
}

// ============ Purchase Orders ============

export async function getPurchaseOrders() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  return prisma.purchaseOrder.findMany({
    where: { organizationId: orgId, deletedAt: null },
    include: {
      purchaseRequest: true,
      supplier: true,
      items: { include: { item: true } },
    },
    orderBy: { orderDate: "desc" },
  });
}

export async function getPurchaseOrderById(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  return prisma.purchaseOrder.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: {
      purchaseRequest: { include: { items: { include: { item: true } } } },
      supplier: true,
      items: { include: { item: true } },
    },
  });
}

export async function getApprovedPurchaseRequests() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  const prs = await prisma.purchaseRequest.findMany({
    where: { organizationId: orgId, status: "APPROVED", deletedAt: null },
    include: { items: { include: { item: true } } },
    orderBy: { createdAt: "desc" },
  });
  // Only return PRs that have at least one item with remaining quantity to fulfill
  return prs.filter((pr) =>
    pr.items.some((i) => i.quantity > (i.fulfilledQuantity ?? 0))
  );
}

export async function getNextPoNo() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  const last = await prisma.purchaseOrder.findFirst({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  const n = last ? parseInt(last.poNo.replace(/\D/g, ""), 10) || 0 : 0;
  return `PO-${String(n + 1).padStart(5, "0")}`;
}

const purchaseOrderItemSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  unitPrice: z.coerce.number().min(0),
});

export async function createPurchaseOrder(formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const purchaseRequestId = formData.get("purchaseRequestId") as string;
  const supplierId = formData.get("supplierId") as string;
  const orderDate = formData.get("orderDate") as string;
  const notes = (formData.get("notes") as string) || undefined;
  const itemsJson = formData.get("items") as string;
  const items = itemsJson ? (JSON.parse(itemsJson) as { itemId: string; quantity: number; unitPrice: number }[]) : [];

  if (!purchaseRequestId || !supplierId || !orderDate) {
    return { error: { _form: ["Missing required fields"] } };
  }

  const pr = await prisma.purchaseRequest.findFirst({
    where: { id: purchaseRequestId, organizationId: orgId, status: "APPROVED", deletedAt: null },
    include: { items: true },
  });
  if (!pr) return { error: { _form: ["Approved purchase request not found"] } };

  const prItemMap = new Map(pr.items.map((i) => [i.itemId, i]));
  const validItems = items.filter((i) => prItemMap.has(i.itemId));
  if (validItems.length === 0) return { error: { items: ["Add at least one item from the PR"] } };

  for (const it of validItems) {
    const prItem = prItemMap.get(it.itemId)!;
    const remaining = prItem.quantity - (prItem.fulfilledQuantity ?? 0);
    if (it.quantity > remaining) {
      return { error: { items: [`Quantity exceeds remaining PR quantity (max ${remaining})`] } };
    }
  }

  const parsed = z.array(purchaseOrderItemSchema).safeParse(validItems);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, organizationId: orgId, deletedAt: null },
  });
  if (!supplier) return { error: { _form: ["Supplier not found"] } };

  const user = await getCurrentUser();
  const userId = (user as { id?: string } | null)?.id ?? null;
  const poNo = (formData.get("poNo") as string) || (await getNextPoNo());

  const existingPo = await prisma.purchaseOrder.findFirst({
    where: { organizationId: orgId, poNo, deletedAt: null },
  });
  if (existingPo) return { error: { poNo: ["PO number already exists"] } };

  await prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.create({
      data: {
        organizationId: orgId,
        purchaseRequestId,
        supplierId,
        poNo,
        orderDate: new Date(orderDate),
        notes: notes || null,
        createdById: userId ?? undefined,
      },
    });
    for (const it of parsed.data) {
      const total = it.quantity * it.unitPrice;
      await tx.purchaseOrderItem.create({
        data: {
          purchaseOrderId: po.id,
          itemId: it.itemId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          total,
        },
      });
      // Update PR item fulfilled quantity so PR can be fulfilled by multiple POs
      const prItem = await tx.purchaseRequestItem.findFirst({
        where: { purchaseRequestId, itemId: it.itemId },
      });
      if (prItem) {
        await tx.purchaseRequestItem.update({
          where: { id: prItem.id },
          data: { fulfilledQuantity: prItem.fulfilledQuantity + it.quantity },
        });
      }
    }
  });

  revalidatePath("/purchases/purchase-orders");
  redirect("/purchases/purchase-orders");
}
