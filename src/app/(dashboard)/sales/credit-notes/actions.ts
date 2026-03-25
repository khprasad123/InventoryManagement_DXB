"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, getOrganizationId } from "@/lib/auth-utils";
import { PERMISSIONS, requirePermission } from "@/lib/permissions";
import { convertAmountToCurrency } from "@/lib/fx";
import { getDefaultCurrencyCodeForOrg } from "@/lib/currency";
import { postSalesCreditNoteToGl } from "@/lib/gl-posting";

const searchMode = "insensitive" as const;
const PAGE_SIZE = 10;

const salesCreditNoteSchema = z.object({
  salesInvoiceId: z.string().min(1),
  creditNoteNo: z.string().min(1).max(50),
  noteDate: z.string().min(1), // YYYY-MM-DD
  amount: z.coerce.number().min(0),
  memo: z.string().optional(),
});

export async function getApprovedSalesInvoicesForCreditNotes(params?: { search?: string }) {
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

export async function getSalesCreditNotesPaginated(page: number, search?: string) {
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
            { creditNoteNo: { contains: q, mode: searchMode } },
            { salesInvoice: { invoiceNo: { contains: q, mode: searchMode } } },
            { salesInvoice: { client: { name: { contains: q, mode: searchMode } } } },
          ],
        }
      : {}),
  };

  const total = await prisma.salesCreditNote.count({ where });

  const creditNotes = await prisma.salesCreditNote.findMany({
    where,
    include: {
      salesInvoice: {
        include: { client: true },
      },
    },
    orderBy: { noteDate: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  return {
    creditNotes,
    total,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE) || 1,
    currentPage,
  };
}

export async function createSalesCreditNote(formData: FormData) {
  await requirePermission(PERMISSIONS.SALES_CREATE);
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await getCurrentUser();
  const userId = (user as { id?: string } | null)?.id ?? null;

  const parsed = salesCreditNoteSchema.safeParse({
    salesInvoiceId: formData.get("salesInvoiceId"),
    creditNoteNo: formData.get("creditNoteNo"),
    noteDate: formData.get("noteDate"),
    amount: formData.get("amount"),
    memo: (formData.get("memo") as string | null) ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { salesInvoiceId, creditNoteNo, noteDate, amount, memo } = parsed.data;

  const invoice = await prisma.salesInvoice.findFirst({
    where: { id: salesInvoiceId, organizationId: orgId, deletedAt: null, status: "APPROVED" },
    select: { id: true, invoiceNo: true, currencyCode: true, totalAmount: true, paidAmount: true },
  });

  if (!invoice) {
    return { error: { salesInvoiceId: ["Sales invoice not found (must be APPROVED)."] } };
  }

  const existing = await prisma.salesCreditNote.findFirst({
    where: { organizationId: orgId, creditNoteNo, deletedAt: null },
  });
  if (existing) {
    return { error: { creditNoteNo: ["Credit note number already exists."] } };
  }

  const noteCurrencyCode = invoice.currencyCode ?? "AED";
  const defaultCurrencyCode = await getDefaultCurrencyCodeForOrg(orgId);
  const amountInDefaultCurrency = await convertAmountToCurrency(amount, noteCurrencyCode, defaultCurrencyCode);

  const creditNote = await prisma.salesCreditNote.create({
    data: {
      organizationId: orgId,
      salesInvoiceId: invoice.id,
      creditNoteNo,
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
    : `Credit note ${creditNoteNo} for invoice ${invoice.invoiceNo}`;

  await postSalesCreditNoteToGl({
    organizationId: orgId,
    salesCreditNoteId: creditNote.id,
    entryDate: new Date(noteDate),
    memo: resolvedMemo,
    amount: amountInDefaultCurrency,
    createdById: userId,
  });

  revalidatePath("/sales/credit-notes");
  redirect("/sales/credit-notes");
}

