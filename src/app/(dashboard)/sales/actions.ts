"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrganizationId, getCurrentUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { canRecordPayments } from "@/lib/permissions";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { calculateDueDate } from "@/lib/date-utils";
import { uploadDocument } from "@/app/(dashboard)/documents/actions";
import { createAuditLog } from "@/lib/audit";

const quotationItemSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  purchaseCost: z.coerce.number().min(0, "Cost must be ≥ 0"),
  margin: z.coerce.number().min(0, "Margin must be ≥ 0"),
});

const invoiceItemSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  unitPrice: z.coerce.number().min(0, "Price must be ≥ 0"),
});

const quotationSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  quotationDate: z.string().min(1, "Date is required"),
  quotationNo: z.string().min(1, "Quotation number is required").max(50),
  status: z.enum(["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED"]).default("DRAFT"),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
  taxPercent: z.coerce.number().min(0).max(100).optional(),
  items: z.array(quotationItemSchema).min(1, "Add at least one item"),
});

const salesInvoiceSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  quotationId: z.string().optional(),
  invoiceNo: z.string().min(1, "Invoice number is required").max(50),
  invoiceDate: z.string().min(1, "Date is required"),
  subtotal: z.coerce.number().min(0),
  taxPercent: z.coerce.number().min(0).max(100).default(5),
  taxAmount: z.coerce.number().min(0).default(0),
  paidAmount: z.coerce.number().min(0).default(0),
  currencyCode: z.string().min(1).max(10).default("AED"),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "Add at least one item"),
});

export async function getQuotations() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  return prisma.quotation.findMany({
    where: { organizationId: orgId, deletedAt: null },
    include: {
      client: true,
      items: { include: { item: true } },
      salesOrder: { include: { salesInvoices: true } },
    },
    orderBy: { quotationDate: "desc" },
  });
}

export async function getQuotationById(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  const quotation = await prisma.quotation.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: {
      client: true,
      items: { include: { item: true } },
      salesOrder: { include: { salesInvoices: true } },
      createdBy: { select: { name: true, signatureUrl: true } },
    },
  });
  if (!quotation) return null;

  // Quotation has `approvedById` but no `approvedBy` relation field in Prisma.
  // Fetch approver name separately for UI + print rendering.
  let approvedByName: string | null = null;
  let approvedBySignatureUrl: string | null = null;
  if (quotation.approvedById) {
    const approver = await prisma.user.findFirst({
      where: { id: quotation.approvedById, deletedAt: null },
      select: { name: true, signatureUrl: true },
    });
    approvedByName = approver?.name ?? null;
    approvedBySignatureUrl = approver?.signatureUrl ?? null;
  }

  return {
    ...quotation,
    approvedByName,
    approvedBySignatureUrl,
    preparedByName: quotation.createdBy?.name ?? null,
    preparedBySignatureUrl: quotation.createdBy?.signatureUrl ?? null,
  };
}

export async function getNextQuotationNo() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  const last = await prisma.quotation.findFirst({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  const n = last ? parseInt(last.quotationNo.replace(/\D/g, ""), 10) || 0 : 0;
  return `QT-${String(n + 1).padStart(5, "0")}`;
}

export async function createQuotation(formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const itemsJson = formData.get("items") as string;
  const items = itemsJson
    ? (JSON.parse(itemsJson) as { itemId: string; quantity: number; purchaseCost: number; margin: number }[])
    : [];

  const parsed = quotationSchema.safeParse({
    clientId: formData.get("clientId"),
    quotationDate: formData.get("quotationDate"),
    quotationNo: formData.get("quotationNo"),
    status: formData.get("status") || "DRAFT",
    validUntil: formData.get("validUntil") || undefined,
    notes: formData.get("notes") || undefined,
    taxPercent: formData.get("taxPercent") || undefined,
    items,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const {
    clientId,
    quotationDate,
    quotationNo,
    status,
    validUntil,
    notes,
    taxPercent,
    items: quoteItems,
  } = parsed.data;

  const existing = await prisma.quotation.findFirst({
    where: { organizationId: orgId, quotationNo, deletedAt: null },
  });
  if (existing) {
    return { error: { quotationNo: ["Quotation number already exists"] } };
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: orgId, deletedAt: null },
  });
  if (!client) {
    return { error: { _form: ["Client not found"] } };
  }

  const user = await getCurrentUser();
  const userId = (user as { id?: string } | null)?.id ?? null;

  const invoiceSettings = await prisma.invoiceSettings.findUnique({
    where: { organizationId: orgId },
  });
  const defaultTaxPercent = invoiceSettings
    ? Number(invoiceSettings.defaultTaxPercent)
    : 5;
  const finalTaxPercent = taxPercent ?? defaultTaxPercent;
  const taxRegistrationNo = invoiceSettings?.taxRegistrationNo ?? null;
  const sealUrl = invoiceSettings?.sealUrl ?? null;

  const computedQuoteItems = quoteItems.map((it) => {
    const cost = Number(it.purchaseCost);
    const marginPct = Number(it.margin);
    const unitPrice = cost * (1 + marginPct / 100);
    return {
      itemId: it.itemId,
      quantity: it.quantity,
      purchaseCost: cost,
      margin: marginPct,
      unitPrice,
      total: it.quantity * unitPrice,
    };
  });
  const subtotal = computedQuoteItems.reduce((s, i) => s + i.total, 0);
  const taxAmount = (subtotal * finalTaxPercent) / 100;
  const totalAmount = subtotal + taxAmount;

  const jobId = `JOB-${quotationNo}`;
  const quotation = await prisma.quotation.create({
    data: {
      organizationId: orgId,
      clientId,
      jobId,
      quotationNo,
      quotationDate: new Date(quotationDate),
      status: status as "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED",
      validUntil: validUntil ? new Date(validUntil) : null,
      notes: notes || null,
      taxPercent: finalTaxPercent,
      taxAmount,
      totalAmount,
      taxRegistrationNo,
      sealUrl,
      createdById: userId ?? undefined,
      updatedById: userId ?? undefined,
      items: {
        create: computedQuoteItems.map((it) => ({
          itemId: it.itemId,
          quantity: it.quantity,
          purchaseCost: it.purchaseCost,
          margin: it.margin,
          unitPrice: it.unitPrice,
          total: it.total,
        })),
      },
    },
  });

  await createAuditLog({
    action: "CREATE_Quotation",
    entityType: "Quotation",
    entityId: quotation.id,
    metadata: { quotationNo: quotation.quotationNo },
  });

  revalidatePath("/sales");
  revalidatePath("/sales/quotations");
  redirect("/sales/quotations");
}

export async function updateQuotation(id: string, formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const existing = await prisma.quotation.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: { salesOrder: { include: { salesInvoices: true } } },
  });
  if (!existing) return { error: { _form: ["Quotation not found"] } };
  if (existing.salesOrder?.salesInvoices?.length) return { error: { _form: ["Cannot edit: already converted to invoice"] } };

  const itemsJson = formData.get("items") as string;
  const items = itemsJson
    ? (JSON.parse(itemsJson) as { itemId: string; quantity: number; unitPrice: number }[])
    : [];

  const parsed = quotationSchema.safeParse({
    clientId: formData.get("clientId"),
    quotationDate: formData.get("quotationDate"),
    quotationNo: formData.get("quotationNo"),
    status: formData.get("status") || "DRAFT",
    validUntil: formData.get("validUntil") || undefined,
    notes: formData.get("notes") || undefined,
    taxPercent: formData.get("taxPercent") || undefined,
    items,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const {
    clientId,
    quotationDate,
    quotationNo,
    status,
    validUntil,
    notes,
    taxPercent,
    items: quoteItems,
  } = parsed.data;

  const duplicateNo = await prisma.quotation.findFirst({
    where: { organizationId: orgId, quotationNo, deletedAt: null, id: { not: id } },
  });
  if (duplicateNo) {
    return { error: { quotationNo: ["Quotation number already in use"] } };
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: orgId, deletedAt: null },
  });
  if (!client) {
    return { error: { _form: ["Client not found"] } };
  }

  const user = await getCurrentUser();
  const userId = (user as { id?: string } | null)?.id ?? null;

  const invoiceSettings = await prisma.invoiceSettings.findUnique({
    where: { organizationId: orgId },
  });
  const defaultTaxPercent = invoiceSettings
    ? Number(invoiceSettings.defaultTaxPercent)
    : 5;
  const finalTaxPercent = taxPercent ?? defaultTaxPercent;

  const computedQuoteItems = quoteItems.map((it) => {
    const cost = Number(it.purchaseCost);
    const marginPct = Number(it.margin);
    const unitPrice = cost * (1 + marginPct / 100);
    return {
      itemId: it.itemId,
      quantity: it.quantity,
      purchaseCost: cost,
      margin: marginPct,
      unitPrice,
      total: it.quantity * unitPrice,
    };
  });
  const subtotal = computedQuoteItems.reduce((s, i) => s + i.total, 0);
  const taxAmount = (subtotal * finalTaxPercent) / 100;
  const totalAmount = subtotal + taxAmount;

  await prisma.$transaction([
    prisma.quotationItem.deleteMany({ where: { quotationId: id } }),
    prisma.quotation.update({
      where: { id },
      data: {
        clientId,
        quotationNo,
        quotationDate: new Date(quotationDate),
        status: status as "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED",
        validUntil: validUntil ? new Date(validUntil) : null,
        notes: notes || null,
        taxPercent: finalTaxPercent,
        taxAmount,
        totalAmount,
        updatedById: userId ?? undefined,
        items: {
          create: computedQuoteItems.map((it) => ({
            itemId: it.itemId,
            quantity: it.quantity,
            purchaseCost: it.purchaseCost,
            margin: it.margin,
            unitPrice: it.unitPrice,
            total: it.total,
          })),
        },
      },
    }),
  ]);

  await createAuditLog({
    action: "UPDATE_Quotation",
    entityType: "Quotation",
    entityId: id,
    metadata: { quotationNo: parsed.data.quotationNo },
  });

  revalidatePath("/sales");
  revalidatePath("/sales/quotations");
  revalidatePath(`/sales/quotations/${id}`);
  redirect("/sales/quotations");
}

export async function deleteQuotation(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const q = await prisma.quotation.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: { salesOrder: { include: { salesInvoices: true } } },
  });
  if (!q) return { error: "Quotation not found" };
  if (q.status !== "DRAFT") return { error: "Only draft quotations can be deleted. Approved or submitted quotations cannot be deleted." };
  if (q.salesOrder?.salesInvoices?.length) return { error: "Cannot delete: already converted to invoice" };

  await prisma.quotation.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await createAuditLog({
    action: "DELETE_Quotation",
    entityType: "Quotation",
    entityId: id,
    metadata: { quotationNo: q.quotationNo },
  });

  revalidatePath("/sales");
  revalidatePath("/sales/quotations");
}

export async function submitQuotationForApproval(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const q = await prisma.quotation.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  });
  if (!q) return { error: "Quotation not found" };
  if (q.status !== "DRAFT") return { error: "Only draft quotations can be submitted for approval" };

  await prisma.quotation.update({
    where: { id },
    data: { status: "PENDING_APPROVAL" },
  });

  revalidatePath("/sales");
  revalidatePath("/sales/quotations");
  revalidatePath(`/sales/quotations/${id}`);
  return { success: true };
}

export async function approveQuotation(id: string, remarks?: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const q = await prisma.quotation.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: { items: { include: { item: true } } },
  });
  if (!q) return { error: "Quotation not found" };
  if (q.status !== "PENDING_APPROVAL") return { error: "Only pending approval quotations can be approved" };

  const user = await getCurrentUser();
  const userId = (user as { id?: string } | null)?.id ?? null;

  await prisma.quotation.update({
    where: { id },
    data: {
      status: "APPROVED",
      approvedById: userId ?? undefined,
      approvedAt: new Date(),
      approvalRemarks: remarks?.trim() || null,
    },
  });

  revalidatePath("/sales");
  revalidatePath("/sales/quotations");
  revalidatePath(`/sales/quotations/${id}`);
  return { success: true };
}

export async function rejectQuotation(id: string, remarks: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const trimmed = remarks?.trim();
  if (!trimmed) return { error: "Rejection reason (remarks) is required" };

  const q = await prisma.quotation.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  });
  if (!q) return { error: "Quotation not found" };
  if (q.status !== "PENDING_APPROVAL") return { error: "Only pending approval quotations can be rejected" };

  await prisma.quotation.update({
    where: { id },
    data: {
      status: "REJECTED",
      approvalRemarks: trimmed,
    },
  });

  revalidatePath("/sales");
  revalidatePath("/sales/quotations");
  revalidatePath(`/sales/quotations/${id}`);
  return { success: true };
}

export async function getSalesOrders() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  return prisma.salesOrder.findMany({
    where: { organizationId: orgId, deletedAt: null },
    include: {
      quotation: { include: { client: true } },
      items: { include: { item: true } },
      salesInvoices: true,
    },
    orderBy: { orderDate: "desc" },
  });
}

export async function getSalesOrderById(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  return prisma.salesOrder.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: {
      quotation: { include: { client: true } },
      items: { include: { item: true } },
      salesInvoices: true,
    },
  });
}

export async function createSalesOrderFromQuotation(quotationId: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, organizationId: orgId, deletedAt: null },
    include: {
      client: true,
      items: { include: { item: true } },
      salesOrder: { include: { salesInvoices: true } },
    },
  });

  if (!quotation) return { error: "Quotation not found" };
  if (quotation.status !== "APPROVED") return { error: "Quotation must be approved first" };
  if (quotation.salesOrder) return { error: "Sales Order already created for this quotation" };

  const invDate = new Date();
  const lastOrder = await prisma.salesOrder.findFirst({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  const orderNo = `SO-${String((lastOrder ? parseInt(lastOrder.orderNo.replace(/\D/g, ""), 10) || 0 : 0) + 1).padStart(5, "0")}`;
  const jobId = quotation.jobId || `JOB-${quotation.quotationNo}`;

  await prisma.salesOrder.create({
    data: {
      organizationId: orgId,
      quotationId: quotation.id,
      clientId: quotation.clientId,
      jobId,
      orderNo,
      orderDate: invDate,
      notes: quotation.notes,
      items: {
        create: quotation.items.map((qi) => ({
          itemId: qi.itemId,
          quantity: qi.quantity,
          unitPrice: qi.unitPrice,
          total: qi.quantity * Number(qi.unitPrice),
        })),
      },
    },
  });

  revalidatePath("/sales");
  revalidatePath("/sales/quotations");
  revalidatePath("/sales/sales-orders");
  revalidatePath(`/sales/quotations/${quotationId}`);
  return { success: true };
}

export async function createInvoiceFromSalesOrder(
  salesOrderId: string,
  sendForApproval: boolean = false
) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const salesOrder = await prisma.salesOrder.findFirst({
    where: { id: salesOrderId, organizationId: orgId, deletedAt: null },
    include: {
      quotation: { include: { client: true } },
      items: { include: { item: true } },
      salesInvoices: true,
    },
  });

  if (!salesOrder) return { error: "Sales order not found" };
  if (salesOrder.salesInvoices?.length) return { error: "Invoice already created for this sales order" };

  const quotation = salesOrder.quotation;
  if (!quotation) return { error: "Sales order has no quotation" };

  for (const soi of salesOrder.items) {
    const item = soi.item;
    if (item.stockQty < soi.quantity) {
      return {
        error: `Insufficient stock for ${item.sku} - ${item.name}. Available: ${item.stockQty}, required: ${soi.quantity}`,
      };
    }
  }

  const invDate = new Date();
  const dueDate = calculateDueDate(invDate, quotation.client.agreedDueDays);
  const subtotal = salesOrder.items.reduce((s, i) => s + Number(i.total), 0);
  const invoiceSettings = await prisma.invoiceSettings.findUnique({
    where: { organizationId: orgId },
  });
  const vatPercent = invoiceSettings
    ? Number(invoiceSettings.defaultTaxPercent)
    : 5;
  const taxRegistrationNo = invoiceSettings?.taxRegistrationNo ?? null;
  const sealUrl = invoiceSettings?.sealUrl ?? null;
  const taxAmount = (subtotal * vatPercent) / 100;
  const totalAmount = subtotal + taxAmount;

  const user = await getCurrentUser();
  const userId = (user as { id?: string } | null)?.id ?? null;

  // Retry on invoice number collisions (e.g. double-click / concurrent requests).
  const maxAttempts = 5;
  const isInvoiceNoUniqueCollision = (err: unknown) => {
    if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
    if (err.code !== "P2002") return false;
    // Message usually contains the duplicated unique index ("invoice_no").
    const msg = err.message.toLowerCase();
    if (msg.includes("invoice_no") || msg.includes("invoice no")) return true;
    const target = (err as any).meta?.target;
    if (Array.isArray(target)) {
      return target.join(",").toLowerCase().includes("invoice");
    }
    return false;
  };

  let didCreateInvoiceOverall = false;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const nextInvNo = await getNextInvoiceNo();

    let didCreateInvoice = false;
    let alreadyHadInvoice = false;

    try {
      await prisma.$transaction(async (tx) => {
        // Re-check inside the transaction to reduce duplicate invoice creation per SO.
        const existingForOrder = await tx.salesInvoice.findFirst({
          where: {
            organizationId: orgId,
            salesOrderId: salesOrder.id,
            deletedAt: null,
          },
          select: { id: true },
        });

        if (existingForOrder) {
          alreadyHadInvoice = true;
          return;
        }

        const invoice = await tx.salesInvoice.create({
          data: {
            organizationId: orgId,
            salesOrderId: salesOrder.id,
            clientId: salesOrder.clientId,
            jobId: salesOrder.jobId,
            invoiceNo: nextInvNo,
            invoiceDate: invDate,
            dueDate,
            subtotal,
            taxAmount,
            totalAmount,
            paidAmount: 0,
            paymentStatus: "UNPAID",
            notes: salesOrder.notes,
            status: sendForApproval ? "PENDING_APPROVAL" : "APPROVED",
            defaultTaxPercent: vatPercent,
            taxRegistrationNo,
            sealUrl,
            approvedById: sendForApproval ? undefined : userId ?? undefined,
            approvedAt: sendForApproval ? undefined : new Date(),
            createdById: userId ?? undefined,
            updatedById: userId ?? undefined,
          },
        });

        didCreateInvoice = true;

        for (const soi of salesOrder.items) {
          const item = soi.item;
          await tx.salesInvoiceItem.create({
            data: {
              salesInvoiceId: invoice.id,
              itemId: soi.itemId,
              quantity: soi.quantity,
              unitPrice: soi.unitPrice,
              taxPercent: vatPercent,
              total: soi.quantity * Number(soi.unitPrice),
            },
          });
          await tx.stockMovement.create({
            data: {
              organizationId: orgId,
              itemId: soi.itemId,
              type: "OUT",
              quantity: soi.quantity,
              referenceType: "SalesInvoice",
              referenceId: invoice.id,
              notes: `Sales Invoice ${nextInvNo}`,
            },
          });
          await tx.item.update({
            where: { id: soi.itemId },
            data: { stockQty: item.stockQty - soi.quantity },
          });
        }
      });

      if (alreadyHadInvoice) return { error: "Invoice already created for this sales order" };
      if (didCreateInvoice) {
        didCreateInvoiceOverall = true;
        break;
      }
    } catch (err) {
      if (isInvoiceNoUniqueCollision(err)) {
        // Try again with a new invoice number.
        continue;
      }
      throw err;
    }
  }

  // If we reached here, either invoice was created in the loop or we failed all attempts.
  if (!didCreateInvoiceOverall) {
    return { error: "Could not create invoice due to invoice number collision. Please try again." };
  }

  revalidatePath("/sales");
  revalidatePath("/sales/sales-orders");
  revalidatePath(`/sales/quotations/${quotation.id}`);
  return { success: true };
}

export async function getSalesInvoices() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  return prisma.salesInvoice.findMany({
    where: { organizationId: orgId, deletedAt: null },
    include: {
      client: true,
      salesOrder: { include: { quotation: true } },
      createdBy: { select: { name: true, signatureUrl: true } },
      approvedBy: { select: { name: true, signatureUrl: true } },
    },
    orderBy: { invoiceDate: "desc" },
  });
}

export type SalesInvoiceWithRelations = Prisma.SalesInvoiceGetPayload<{
  include: {
    client: true;
    salesOrder: { include: { quotation: true } };
    items: { include: { item: true } };
    createdBy: { select: { name: true; signatureUrl: true } };
    approvedBy: { select: { name: true; signatureUrl: true } };
  };
}>;

export async function getOrgForInvoice() {
  const orgId = await getOrganizationId();
  if (!orgId) return null;
  const [org, invoiceSettings] = await Promise.all([
    prisma.organization.findFirst({
      where: { id: orgId, deletedAt: null },
      select: { timezone: true, name: true },
    }),
    prisma.invoiceSettings.findUnique({
      where: { organizationId: orgId },
    }),
  ]);
  if (!org) return null;
  return {
    name: invoiceSettings?.companyName ?? org.name,
    address: invoiceSettings?.address ?? null,
    logoUrl: invoiceSettings?.invoiceLogoUrl ?? null,
    sealUrl: invoiceSettings?.sealUrl ?? null,
    phone: invoiceSettings?.phone ?? null,
    fax: invoiceSettings?.fax ?? null,
    website: invoiceSettings?.website ?? null,
    taxRegistrationNo: invoiceSettings?.taxRegistrationNo ?? null,
    bankDetails: invoiceSettings?.bankDetails ?? null,
    timezone: org.timezone ?? "UTC",
  };
}

export async function getSalesInvoiceById(
  id: string
): Promise<SalesInvoiceWithRelations | null> {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  const inv = await prisma.salesInvoice.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: {
      client: true,
      salesOrder: { include: { quotation: true } },
      items: { include: { item: true } },
      createdBy: { select: { name: true, signatureUrl: true } },
      approvedBy: { select: { name: true, signatureUrl: true } },
    },
  });
  return inv as SalesInvoiceWithRelations | null;
}

export async function submitSalesInvoiceForApproval(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const inv = await prisma.salesInvoice.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  });
  if (!inv) return { error: "Invoice not found" };
  if (inv.status !== "DRAFT") return { error: "Only draft invoices can be submitted for approval" };

  await prisma.salesInvoice.update({
    where: { id },
    data: { status: "PENDING_APPROVAL" },
  });

  revalidatePath("/sales");
  revalidatePath(`/sales/${id}`);
  return { success: true };
}

export async function approveSalesInvoice(id: string, remarks?: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const inv = await prisma.salesInvoice.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  });
  if (!inv) return { error: "Invoice not found" };
  if (inv.status !== "PENDING_APPROVAL") return { error: "Only pending approval invoices can be approved" };

  const user = await getCurrentUser();
  const userId = (user as { id?: string } | null)?.id ?? null;

  await prisma.salesInvoice.update({
    where: { id },
    data: {
      status: "APPROVED",
      approvedById: userId ?? undefined,
      approvedAt: new Date(),
      approvalRemarks: remarks?.trim() || null,
    },
  });

  revalidatePath("/sales");
  revalidatePath(`/sales/${id}`);
  return { success: true };
}

export async function rejectSalesInvoice(id: string, remarks: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const trimmed = remarks?.trim();
  if (!trimmed) return { error: "Rejection reason (remarks) is required" };

  const inv = await prisma.salesInvoice.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  });
  if (!inv) return { error: "Invoice not found" };
  if (inv.status !== "PENDING_APPROVAL") return { error: "Only pending approval invoices can be rejected" };

  await prisma.salesInvoice.update({
    where: { id },
    data: {
      status: "REJECTED",
      approvalRemarks: trimmed,
    },
  });

  revalidatePath("/sales");
  revalidatePath(`/sales/${id}`);
  return { success: true };
}

export async function getNextInvoiceNo() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  // Use max numeric part of existing `invoice_no` (not `createdAt`),
  // because `invoice_no` might not be strictly increasing by `createdAt`.
  const rows = await prisma.$queryRaw<Array<{ max_num: number | null }>>`
    SELECT
      COALESCE(
        MAX(
          CAST(
            NULLIF(regexp_replace(invoice_no, '[^0-9]', '', 'g'), '') AS INTEGER
          )
        ),
        0
      ) AS max_num
    FROM sales_invoices
    WHERE organization_id = ${orgId}
  `;

  const maxNumeric = rows?.[0]?.max_num ?? 0;
  // Ensure we return an invoice_no that is NOT already taken.
  // (Under concurrency, we still rely on the unique constraint + retry.)
  const start = maxNumeric + 1;
  const maxTries = 100;
  for (let i = 0; i < maxTries; i++) {
    const candidate = `INV-${String(start + i).padStart(5, "0")}`;
    const exists = await prisma.salesInvoice.findFirst({
      // DB-level uniqueness doesn't exclude soft-deleted rows,
      // so we must check regardless of `deletedAt`.
      where: { organizationId: orgId, invoiceNo: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }

  throw new Error("Unable to generate a unique invoice number");
}

export async function createSalesInvoice(formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const sendForApprovalRaw = formData.get("sendForApproval");
  const sendForApproval =
    sendForApprovalRaw === "true" ||
    sendForApprovalRaw === "1" ||
    sendForApprovalRaw === "on";

  const itemsJson = formData.get("items") as string;
  const items = itemsJson
    ? (JSON.parse(itemsJson) as { itemId: string; quantity: number; unitPrice: number }[])
    : [];

  const parsed = salesInvoiceSchema.safeParse({
    clientId: formData.get("clientId"),
    quotationId: formData.get("quotationId") || undefined,
    invoiceNo: formData.get("invoiceNo"),
    invoiceDate: formData.get("invoiceDate"),
    subtotal: formData.get("subtotal"),
    taxPercent: formData.get("taxPercent") || undefined,
    taxAmount: formData.get("taxAmount") || 0,
    paidAmount: formData.get("paidAmount") || 0,
    currencyCode: formData.get("currencyCode") || "AED",
    notes: formData.get("notes") || undefined,
    items,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const {
    clientId,
    quotationId,
    invoiceNo,
    invoiceDate,
    subtotal,
    taxPercent,
    paidAmount,
    currencyCode,
    notes,
    items: invItems,
  } = parsed.data;

  const existing = await prisma.salesInvoice.findFirst({
    // DB-level uniqueness doesn't exclude soft-deleted rows.
    where: { organizationId: orgId, invoiceNo },
  });
  if (existing) {
    return { error: { invoiceNo: ["Invoice number already exists"] } };
  }

  const client = await prisma.client.findFirst({
    where: { id: clientId, organizationId: orgId, deletedAt: null },
  });
  if (!client) {
    return { error: { _form: ["Client not found"] } };
  }

  // Validate stock availability
  for (const it of invItems) {
    const item = await prisma.item.findFirst({
      where: { id: it.itemId, organizationId: orgId, deletedAt: null },
    });
    if (!item) return { error: { _form: [`Item ${it.itemId} not found`] } };
    if (item.stockQty < it.quantity) {
      return {
        error: {
          _form: [
            `Insufficient stock for ${item.sku} - ${item.name}. Available: ${item.stockQty}, required: ${it.quantity}`,
          ],
        },
      };
    }
  }

  const user = await getCurrentUser();
  const userId = (user as { id?: string } | null)?.id ?? null;

  const invDate = new Date(invoiceDate);
  const dueDate = calculateDueDate(invDate, client.agreedDueDays);
  const taxAmount = (subtotal * taxPercent) / 100;
  const totalAmount = subtotal + taxAmount;
  const invoiceSettings = await prisma.invoiceSettings.findUnique({
    where: { organizationId: orgId },
  });
  const taxRegistrationNo = invoiceSettings?.taxRegistrationNo ?? null;
  const sealUrl = invoiceSettings?.sealUrl ?? null;
  const paymentStatus =
    (paidAmount ?? 0) >= totalAmount ? "PAID" : (paidAmount ?? 0) > 0 ? "PARTIAL" : "UNPAID";

  if (!quotationId) {
    return { error: { _form: ["Sales invoice must be created from an approved quotation"] } };
  }

  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, organizationId: orgId, deletedAt: null, status: "APPROVED" },
    include: { items: { include: { item: true } }, salesOrder: { include: { salesInvoices: true } } },
  });
  if (!quotation) return { error: { _form: ["Quotation not found or not approved"] } };
  if (quotation.salesOrder?.salesInvoices?.length) return { error: { _form: ["Quotation already converted to invoice"] } };

  const jobId = quotation.jobId || `JOB-${quotation.quotationNo}`;
  const lastOrder = await prisma.salesOrder.findFirst({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  const orderNo = `SO-${String((lastOrder ? parseInt(lastOrder.orderNo.replace(/\D/g, ""), 10) || 0 : 0) + 1).padStart(5, "0")}`;

  await prisma.$transaction(async (tx) => {
    const salesOrder = await tx.salesOrder.create({
      data: {
        organizationId: orgId,
        quotationId: quotation.id,
        clientId,
        jobId,
        orderNo,
        orderDate: invDate,
        notes: notes || null,
        items: {
          create: invItems.map((it) => ({
            itemId: it.itemId,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            total: it.quantity * it.unitPrice,
          })),
        },
      },
    });

    const invoice = await tx.salesInvoice.create({
      data: {
        organizationId: orgId,
        salesOrderId: salesOrder.id,
        clientId,
        jobId,
        invoiceNo,
        invoiceDate: invDate,
        dueDate,
        subtotal,
        taxAmount,
        totalAmount,
        defaultTaxPercent: taxPercent,
        taxRegistrationNo,
        sealUrl,
        paidAmount: paidAmount ?? 0,
        paymentStatus,
        currencyCode,
        notes: notes || null,
        status: sendForApproval ? "PENDING_APPROVAL" : "APPROVED",
        approvedById: sendForApproval ? undefined : userId ?? undefined,
        approvedAt: sendForApproval ? undefined : new Date(),
        createdById: userId ?? undefined,
        updatedById: userId ?? undefined,
      },
    });

    for (const it of invItems) {
      const item = await tx.item.findFirst({
        where: { id: it.itemId, organizationId: orgId, deletedAt: null },
      });
      if (!item) throw new Error(`Item ${it.itemId} not found`);
      const total = it.quantity * it.unitPrice;

      await tx.salesInvoiceItem.create({
        data: {
          salesInvoiceId: invoice.id,
          itemId: it.itemId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          taxPercent: taxPercent,
          total,
        },
      });

      await tx.stockMovement.create({
        data: {
          organizationId: orgId,
          itemId: it.itemId,
          type: "OUT",
          quantity: it.quantity,
          referenceType: "SalesInvoice",
          referenceId: invoice.id,
          notes: `Sales Invoice ${invoiceNo}`,
        },
      });

      await tx.item.update({
        where: { id: it.itemId },
        data: { stockQty: item.stockQty - it.quantity },
      });
    }
  });

  const created = await prisma.salesInvoice.findFirst({
    where: { organizationId: orgId, invoiceNo },
    select: { id: true },
  });
  if (created) {
    await createAuditLog({
      action: "CREATE_SalesInvoice",
      entityType: "SalesInvoice",
      entityId: created.id,
      metadata: { invoiceNo },
    });
  }

  const file = formData.get("attachment") as File | null;
  if (file && file.size > 0 && created) {
    const fd = new FormData();
    fd.set("file", file);
    fd.set("documentableType", "SalesInvoice");
    fd.set("documentableId", created.id);
    await uploadDocument(fd);
  }

  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  redirect("/sales");
}

const updateSalesInvoiceSchema = z.object({
  invoiceDate: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  paidAmount: z.coerce.number().min(0).default(0),
  taxPercent: z.coerce.number().min(0).max(100).default(5),
});

export async function updateSalesInvoice(id: string, formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const existing = await prisma.salesInvoice.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: { client: true },
  });
  if (!existing) return { error: { _form: ["Invoice not found"] } };
  if (existing.status !== "DRAFT") return { error: { _form: ["Only draft invoices can be edited"] } };

  const parsed = updateSalesInvoiceSchema.safeParse({
    invoiceDate: formData.get("invoiceDate"),
    notes: formData.get("notes") || undefined,
    paidAmount: formData.get("paidAmount") ?? 0,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const user = await getCurrentUser();
  const userId = (user as { id?: string } | null)?.id ?? null;

  const { invoiceDate, notes, paidAmount, taxPercent } = parsed.data;
  const invDate = new Date(invoiceDate);
  const dueDate = calculateDueDate(invDate, existing.client.agreedDueDays);
  const subtotal = Number(existing.subtotal ?? 0);
  const taxAmount = (subtotal * taxPercent) / 100;
  const totalAmount = subtotal + taxAmount;
  const paymentStatus =
    paidAmount >= totalAmount ? "PAID" : paidAmount > 0 ? "PARTIAL" : "UNPAID";

  await prisma.$transaction(async (tx) => {
    await tx.salesInvoice.update({
      where: { id },
      data: {
        invoiceDate: invDate,
        dueDate,
        paidAmount,
        paymentStatus,
        notes: notes ?? null,
        updatedById: userId ?? undefined,
        defaultTaxPercent: taxPercent,
        taxAmount,
        totalAmount,
      },
    });

    await tx.salesInvoiceItem.updateMany({
      where: { salesInvoiceId: id },
      data: { taxPercent },
    });
  });

  await createAuditLog({
    action: "UPDATE_SalesInvoice",
    entityType: "SalesInvoice",
    entityId: id,
    metadata: { invoiceNo: existing.invoiceNo },
  });

  revalidatePath("/sales");
  revalidatePath("/dashboard");
  revalidatePath(`/sales/${id}`);
  redirect("/sales");
}

export async function deleteSalesInvoice(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const inv = await prisma.salesInvoice.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  });
  if (!inv) return { error: "Invoice not found" };
  if (inv.status !== "DRAFT") return { error: "Only draft invoices can be deleted. Submit for approval first." };

  const total = Number(inv.totalAmount);
  const paid = Number(inv.paidAmount);
  if (inv.paymentStatus === "PAID" || (total > 0 && paid >= total)) {
    return { error: "Cannot delete: invoice is fully paid (job finished)." };
  }

  await prisma.salesInvoice.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await createAuditLog({
    action: "DELETE_SalesInvoice",
    entityType: "SalesInvoice",
    entityId: id,
    metadata: { invoiceNo: inv.invoiceNo },
  });

  revalidatePath("/sales");
  revalidatePath("/dashboard");
}

const clientPaymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  paymentDate: z.string().min(1, "Payment date is required"),
  method: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export async function recordClientPayment(formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await getCurrentUser();
  if (!canRecordPayments(user)) {
    return { error: { _form: ["Only Finance can record payments."] } };
  }

  const parsed = clientPaymentSchema.safeParse({
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

  const invoice = await prisma.salesInvoice.findFirst({
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
    await tx.clientPayment.create({
      data: {
        organizationId: orgId,
        salesInvoiceId: invoice.id,
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

    await tx.salesInvoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: newPaid,
        paymentStatus: newStatus,
      },
    });
  });

  revalidatePath("/sales");
  revalidatePath(`/sales/${parsed.data.invoiceId}`);
  revalidatePath("/dashboard");
  return { success: true };
}
