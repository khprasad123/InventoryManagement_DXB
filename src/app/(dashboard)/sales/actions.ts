"use server";

import { prisma } from "@/lib/prisma";
import { getOrganizationId, getCurrentUser } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { canRecordPayments } from "@/lib/permissions";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { calculateDueDate } from "@/lib/date-utils";

const quotationItemSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  unitPrice: z.coerce.number().min(0, "Price must be ≥ 0"),
});

const quotationSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  quotationDate: z.string().min(1, "Date is required"),
  quotationNo: z.string().min(1, "Quotation number is required").max(50),
  status: z.enum(["DRAFT", "APPROVED"]).default("DRAFT"),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(quotationItemSchema).min(1, "Add at least one item"),
});

const salesInvoiceSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  quotationId: z.string().optional(),
  invoiceNo: z.string().min(1, "Invoice number is required").max(50),
  invoiceDate: z.string().min(1, "Date is required"),
  subtotal: z.coerce.number().min(0),
  taxAmount: z.coerce.number().min(0).default(0),
  paidAmount: z.coerce.number().min(0).default(0),
  currencyCode: z.string().min(1).max(10).default("AED"),
  notes: z.string().optional(),
  items: z.array(quotationItemSchema).min(1, "Add at least one item"),
});

export async function getQuotations() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  return prisma.quotation.findMany({
    where: { organizationId: orgId, deletedAt: null },
    include: {
      client: true,
      items: { include: { item: true } },
      salesInvoice: true,
    },
    orderBy: { quotationDate: "desc" },
  });
}

export async function getQuotationById(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  return prisma.quotation.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: {
      client: true,
      items: { include: { item: true } },
      salesInvoice: true,
    },
  });
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
    ? (JSON.parse(itemsJson) as { itemId: string; quantity: number; unitPrice: number }[])
    : [];

  const parsed = quotationSchema.safeParse({
    clientId: formData.get("clientId"),
    quotationDate: formData.get("quotationDate"),
    quotationNo: formData.get("quotationNo"),
    status: formData.get("status") || "DRAFT",
    validUntil: formData.get("validUntil") || undefined,
    notes: formData.get("notes") || undefined,
    items,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { clientId, quotationDate, quotationNo, status, validUntil, notes, items: quoteItems } =
    parsed.data;

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

  await prisma.quotation.create({
    data: {
      organizationId: orgId,
      clientId,
      quotationNo,
      quotationDate: new Date(quotationDate),
      status: status as "DRAFT" | "APPROVED",
      validUntil: validUntil ? new Date(validUntil) : null,
      notes: notes || null,
      items: {
        create: quoteItems.map((it) => ({
          itemId: it.itemId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          total: it.quantity * it.unitPrice,
        })),
      },
    },
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
    include: { salesInvoice: true },
  });
  if (!existing) return { error: { _form: ["Quotation not found"] } };
  if (existing.salesInvoice) return { error: { _form: ["Cannot edit: already converted to invoice"] } };

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
    items,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { clientId, quotationDate, quotationNo, status, validUntil, notes, items: quoteItems } =
    parsed.data;

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

  await prisma.$transaction([
    prisma.quotationItem.deleteMany({ where: { quotationId: id } }),
    prisma.quotation.update({
      where: { id },
      data: {
        clientId,
        quotationNo,
        quotationDate: new Date(quotationDate),
        status: status as "DRAFT" | "APPROVED",
        validUntil: validUntil ? new Date(validUntil) : null,
        notes: notes || null,
        items: {
          create: quoteItems.map((it) => ({
            itemId: it.itemId,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            total: it.quantity * it.unitPrice,
          })),
        },
      },
    }),
  ]);

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
    include: { salesInvoice: true },
  });
  if (!q) return { error: "Quotation not found" };
  if (q.salesInvoice) return { error: "Cannot delete: already converted to invoice" };

  await prisma.quotation.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/sales");
  revalidatePath("/sales/quotations");
}

export async function approveQuotation(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const q = await prisma.quotation.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: { items: { include: { item: true } } },
  });
  if (!q) return { error: "Quotation not found" };
  if (q.status === "APPROVED") return { error: "Quotation already approved" };

  await prisma.quotation.update({
    where: { id },
    data: { status: "APPROVED" },
  });

  revalidatePath("/sales");
  revalidatePath("/sales/quotations");
  revalidatePath(`/sales/quotations/${id}`);
}

export async function convertQuotationToInvoice(quotationId: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId, organizationId: orgId, deletedAt: null },
    include: {
      client: true,
      items: { include: { item: true } },
      salesInvoice: true,
    },
  });

  if (!quotation) return { error: "Quotation not found" };
  if (quotation.salesInvoice) return { error: "Quotation already converted to invoice" };

  // Validate stock availability before transaction
  for (const qi of quotation.items) {
    const item = qi.item;
    if (item.stockQty < qi.quantity) {
      return {
        error: `Insufficient stock for ${item.sku} - ${item.name}. Available: ${item.stockQty}, required: ${qi.quantity}`,
      };
    }
  }

  const nextInvNo = await getNextInvoiceNo();
  const invDate = new Date();
  const dueDate = calculateDueDate(invDate, quotation.client.defaultPaymentTerms);

  await prisma.$transaction(async (tx) => {
    const subtotal = quotation.items.reduce((s, i) => s + Number(i.total), 0);
    const taxAmount = 0;
    const totalAmount = subtotal + taxAmount;

    const invoice = await tx.salesInvoice.create({
      data: {
        organizationId: orgId,
        clientId: quotation.clientId,
        quotationId: quotation.id,
        invoiceNo: nextInvNo,
        invoiceDate: invDate,
        dueDate,
        subtotal,
        taxAmount,
        totalAmount,
        paidAmount: 0,
        paymentStatus: "UNPAID",
        notes: quotation.notes,
      },
    });

    for (const qi of quotation.items) {
      const item = qi.item;
      const total = qi.quantity * Number(qi.unitPrice);

      await tx.salesInvoiceItem.create({
        data: {
          salesInvoiceId: invoice.id,
          itemId: qi.itemId,
          quantity: qi.quantity,
          unitPrice: qi.unitPrice,
          total,
        },
      });

      await tx.stockMovement.create({
        data: {
          organizationId: orgId,
          itemId: qi.itemId,
          type: "OUT",
          quantity: qi.quantity,
          referenceType: "SalesInvoice",
          referenceId: invoice.id,
          notes: `Sales Invoice ${nextInvNo}`,
        },
      });

      await tx.item.update({
        where: { id: qi.itemId },
        data: { stockQty: item.stockQty - qi.quantity },
      });
    }
  });

  revalidatePath("/sales");
  revalidatePath("/sales/quotations");
  revalidatePath(`/sales/quotations/${quotationId}`);
  redirect("/sales");
}

export async function getSalesInvoices() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  return prisma.salesInvoice.findMany({
    where: { organizationId: orgId, deletedAt: null },
    include: { client: true, quotation: true },
    orderBy: { invoiceDate: "desc" },
  });
}

export async function getSalesInvoiceById(id: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  return prisma.salesInvoice.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: {
      client: true,
      quotation: true,
      items: { include: { item: true } },
    },
  });
}

export async function getNextInvoiceNo() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  const last = await prisma.salesInvoice.findFirst({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  const n = last ? parseInt(last.invoiceNo.replace(/\D/g, ""), 10) || 0 : 0;
  return `INV-${String(n + 1).padStart(5, "0")}`;
}

export async function createSalesInvoice(formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

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
    taxAmount,
    paidAmount,
    currencyCode,
    notes,
    items: invItems,
  } = parsed.data;

  const existing = await prisma.salesInvoice.findFirst({
    where: { organizationId: orgId, invoiceNo, deletedAt: null },
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

  const invDate = new Date(invoiceDate);
  const dueDate = calculateDueDate(invDate, client.defaultPaymentTerms);
  const totalAmount = subtotal + taxAmount;
  const paymentStatus =
    (paidAmount ?? 0) >= totalAmount ? "PAID" : (paidAmount ?? 0) > 0 ? "PARTIAL" : "UNPAID";

  await prisma.$transaction(async (tx) => {
    const invoice = await tx.salesInvoice.create({
      data: {
        organizationId: orgId,
        clientId,
        quotationId: quotationId || null,
        invoiceNo,
        invoiceDate: invDate,
        dueDate,
        subtotal,
        taxAmount,
        totalAmount,
        paidAmount: paidAmount ?? 0,
        paymentStatus,
        currencyCode,
        notes: notes || null,
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

  revalidatePath("/sales");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
  redirect("/sales");
}

const updateSalesInvoiceSchema = z.object({
  invoiceDate: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
  paidAmount: z.coerce.number().min(0).default(0),
});

export async function updateSalesInvoice(id: string, formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const existing = await prisma.salesInvoice.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
    include: { client: true },
  });
  if (!existing) return { error: { _form: ["Invoice not found"] } };

  const parsed = updateSalesInvoiceSchema.safeParse({
    invoiceDate: formData.get("invoiceDate"),
    notes: formData.get("notes") || undefined,
    paidAmount: formData.get("paidAmount") ?? 0,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { invoiceDate, notes, paidAmount } = parsed.data;
  const invDate = new Date(invoiceDate);
  const dueDate = calculateDueDate(invDate, existing.client.defaultPaymentTerms);
  const totalAmount = Number(existing.totalAmount ?? 0);
  const paymentStatus =
    paidAmount >= totalAmount ? "PAID" : paidAmount > 0 ? "PARTIAL" : "UNPAID";

  await prisma.salesInvoice.update({
    where: { id },
    data: {
      invoiceDate: invDate,
      dueDate,
      paidAmount,
      paymentStatus,
      notes: notes ?? null,
    },
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

  await prisma.salesInvoice.update({
    where: { id },
    data: { deletedAt: new Date() },
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
  if (!canRecordPayments(user?.role)) {
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
