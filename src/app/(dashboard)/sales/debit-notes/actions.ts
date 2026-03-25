"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getOrganizationId } from "@/lib/auth-utils";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { convertAmountToCurrency } from "@/lib/fx";
import { getDefaultCurrencyCodeForOrg } from "@/lib/currency";
import { postSalesDebitNoteToGl } from "@/lib/gl-posting";

const searchMode = "insensitive" as const;
const PAGE_SIZE = 10;

const salesDebitNoteSchema = z.object({
  salesInvoiceId: z.string().min(1),
  debitNoteNo: z.string().min(1).max(50),
  noteDate: z.string().min(1), // YYYY-MM-DD
  amount: z.coerce.number().min(0),
  memo: z.string().optional(),
});

export async function getApprovedSalesInvoicesForDebitNotes(params?: { search?: string }) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const q = (params?.search ?? "").trim();

  return prisma.salesInvoice.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
      status: "APPROVED",
      ...(q
        ? {
            OR: [
              { invoiceNo: { contains: q, mode: searchMode } },
              { client: { name: { contains: q, mode: searchMode } } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      invoiceNo: true,
      invoiceDate: true,
      dueDate: true,
      currencyCode: true,
      totalAmount: true,
      paidAmount: true,
      client: { select: { name: true } },
    },
    orderBy: { invoiceDate: "desc" },
    take: 50,
  });
}

export async function getSalesDebitNotesPaginated(page: number, search?: string) {
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
            { debitNoteNo: { contains: q, mode: searchMode } },
            { salesInvoice: { invoiceNo: { contains: q, mode: searchMode } } },
            { salesInvoice: { client: { name: { contains: q, mode: searchMode } } } },
          ],
        }
      : {}),
  };

  const total = await prisma.salesDebitNote.count({ where });

  const debitNotes = await prisma.salesDebitNote.findMany({
    where,
    include: {
      salesInvoice: { include: { client: true } },
    },
    orderBy: { noteDate: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return {
    debitNotes,
    total,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE) || 1,
    currentPage,
  };
}

export async function createSalesDebitNote(formData: FormData) {
  await requirePermission(PERMISSIONS.SALES_CREATE);
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await getCurrentUser();
  const userId = (user as { id?: string } | null)?.id ?? null;

  const parsed = salesDebitNoteSchema.safeParse({
    salesInvoiceId: formData.get("salesInvoiceId"),
    debitNoteNo: formData.get("debitNoteNo"),
    noteDate: formData.get("noteDate"),
    amount: formData.get("amount"),
    memo: (formData.get("memo") as string | null) ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { salesInvoiceId, debitNoteNo, noteDate, amount, memo } = parsed.data;

  const invoice = await prisma.salesInvoice.findFirst({
    where: { id: salesInvoiceId, organizationId: orgId, deletedAt: null, status: "APPROVED" },
    select: { id: true, invoiceNo: true, currencyCode: true, totalAmount: true, paidAmount: true },
  });

  if (!invoice) {
    return { error: { salesInvoiceId: ["Sales invoice not found (must be APPROVED)."] } };
  }

  const existing = await prisma.salesDebitNote.findFirst({
    where: { organizationId: orgId, debitNoteNo, deletedAt: null },
  });

  if (existing) {
    return { error: { debitNoteNo: ["Debit note number already exists."] } };
  }

  const noteCurrencyCode = invoice.currencyCode ?? "AED";
  const defaultCurrencyCode = await getDefaultCurrencyCodeForOrg(orgId);
  const amountInDefaultCurrency = await convertAmountToCurrency(amount, noteCurrencyCode, defaultCurrencyCode);

  const debitNote = await prisma.salesDebitNote.create({
    data: {
      organizationId: orgId,
      salesInvoiceId: invoice.id,
      debitNoteNo,
      noteDate: new Date(noteDate),
      amount,
      currencyCode: noteCurrencyCode,
      memo: memo || null,
      status: "POSTED",
    },
    select: { id: true },
  });

  const resolvedMemo = memo?.trim()
    ? memo
    : `Debit note ${debitNoteNo} for invoice ${invoice.invoiceNo}`;

  await postSalesDebitNoteToGl({
    organizationId: orgId,
    salesDebitNoteId: debitNote.id,
    entryDate: new Date(noteDate),
    memo: resolvedMemo,
    amount: amountInDefaultCurrency,
    createdById: userId,
  });

  revalidatePath("/sales/debit-notes");
  redirect("/sales/debit-notes");
}

