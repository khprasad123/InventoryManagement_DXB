"use server";

import { prisma } from "@/lib/prisma";
// Note: we intentionally keep this helper independent from UI layers.

type GlAccountCode = string;

const ACCOUNT_CODES = {
  CASH: "1000",
  AR: "1100",
  TAX_RECOVERABLE: "1200",
  AP: "2000",
  TAX_PAYABLE: "2100",
  EQUITY: "3000",
  SALES_REVENUE: "4000",
  PURCHASES_COGS: "5000",
  OPERATING_EXPENSES: "6000",
} as const satisfies Record<string, GlAccountCode>;

export type GlReferenceType =
  | "SalesInvoice"
  | "PurchaseInvoice"
  | "Expense"
  | "ClientPayment"
  | "SupplierPayment"
  | "SalesCreditNote"
  | "SalesDebitNote";

type JournalLineDraft = {
  accountCode: GlAccountCode;
  description?: string;
  debitAmount?: number;
  creditAmount?: number;
};

async function getAccountIdsByCode(orgId: string, codes: GlAccountCode[]) {
  const accounts = await prisma.glAccount.findMany({
    where: { organizationId: orgId, deletedAt: null, code: { in: codes } },
    select: { id: true, code: true },
  });
  const map = new Map<string, string>();
  for (const a of accounts) map.set(a.code, a.id);
  return map;
}

async function reversePostedEntriesForReference(orgId: string, referenceType: string, referenceId: string, reversedById?: string | null) {
  const existingPosted = await prisma.journalEntry.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
      referenceType,
      referenceId,
      status: "POSTED",
    },
    include: { lines: true },
  });

  for (const oldEntry of existingPosted) {
    if (!oldEntry.lines?.length) {
      await prisma.journalEntry.update({
        where: { id: oldEntry.id },
        data: { status: "REVERSED" },
      });
      continue;
    }

    const entryNo = `JE-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    const reversalEntry = await prisma.journalEntry.create({
      data: {
        organizationId: orgId,
        entryNo,
        entryDate: new Date(),
        memo: `Reversal of ${oldEntry.entryNo}`,
        status: "REVERSED",
        referenceType,
        referenceId,
      },
      select: { id: true },
    });

    const reversalLines = oldEntry.lines.map((l) => ({
      journalEntryId: reversalEntry.id,
      accountId: l.accountId,
      description: l.description ?? undefined,
      debitAmount: l.creditAmount ? Number(l.creditAmount) : 0,
      creditAmount: l.debitAmount ? Number(l.debitAmount) : 0,
    }));

    await prisma.journalLine.createMany({ data: reversalLines });

    await prisma.journalEntry.update({
      where: { id: oldEntry.id },
      data: { status: "REVERSED", deletedById: reversedById ?? undefined },
    });
  }
}

async function postJournalEntry(orgId: string, entryDate: Date, memo: string, referenceType: GlReferenceType, referenceId: string, lines: JournalLineDraft[]) {
  const codes = Array.from(new Set(lines.map((l) => l.accountCode)));
  const accountIdMap = await getAccountIdsByCode(orgId, codes);

  const entryNo = `JE-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const entry = await prisma.journalEntry.create({
    data: {
      organizationId: orgId,
      entryNo,
      entryDate,
      memo,
      status: "POSTED",
      referenceType,
      referenceId,
    },
    select: { id: true },
  });

  const mappedLines = lines.map((l) => {
    const accountId = accountIdMap.get(l.accountCode);
    if (!accountId) throw new Error(`Missing GL account ${l.accountCode}`);
    const debitAmount = l.debitAmount ?? 0;
    const creditAmount = l.creditAmount ?? 0;
    return {
      journalEntryId: entry.id,
      accountId,
      description: l.description ?? undefined,
      debitAmount,
      creditAmount,
    };
  });

  await prisma.journalLine.createMany({ data: mappedLines });
}

/**
 * Phase 1 Step 1.2: post GL journals on document creation/update.
 * - We always keep the ledger correct by reversing prior POSTED journals for the same reference on update/delete/reject.
 * - Reports can later sum all non-deleted entries (POSTED + REVERSED) because reversal lines are swapped.
 */
export async function postSalesInvoiceToGl(args: {
  organizationId: string;
  salesInvoiceId: string;
  entryDate: Date;
  memo: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  createdById?: string | null;
}) {
  const orgId = args.organizationId;
  const referenceType: GlReferenceType = "SalesInvoice";
  const referenceId = args.salesInvoiceId;

  await reversePostedEntriesForReference(orgId, referenceType, referenceId, args.createdById ?? null);

  const lines: JournalLineDraft[] = [
    { accountCode: ACCOUNT_CODES.AR, description: "Sales invoice receivable", debitAmount: args.totalAmount },
  ];

  if (args.subtotal > 0) {
    lines.push({ accountCode: ACCOUNT_CODES.SALES_REVENUE, description: "Sales revenue", creditAmount: args.subtotal });
  }
  if (args.taxAmount > 0) {
    lines.push({ accountCode: ACCOUNT_CODES.TAX_PAYABLE, description: "Output tax payable", creditAmount: args.taxAmount });
  }

  // If the invoice already has paidAmount on create/update, reflect it in GL immediately.
  if (args.paidAmount > 0) {
    lines.push({ accountCode: ACCOUNT_CODES.CASH, description: "Customer payment (initial)", debitAmount: args.paidAmount });
    lines.push({ accountCode: ACCOUNT_CODES.AR, description: "Reduce AR for initial payment", creditAmount: args.paidAmount });
  }

  await postJournalEntry(orgId, args.entryDate, args.memo, referenceType, referenceId, lines);
}

export async function postPurchaseInvoiceToGl(args: {
  organizationId: string;
  purchaseInvoiceId: string;
  entryDate: Date;
  memo: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  createdById?: string | null;
}) {
  const orgId = args.organizationId;
  const referenceType: GlReferenceType = "PurchaseInvoice";
  const referenceId = args.purchaseInvoiceId;

  await reversePostedEntriesForReference(orgId, referenceType, referenceId, args.createdById ?? null);

  const lines: JournalLineDraft[] = [
    { accountCode: ACCOUNT_CODES.PURCHASES_COGS, description: "Purchase/COGS", debitAmount: args.subtotal },
    { accountCode: ACCOUNT_CODES.TAX_RECOVERABLE, description: "Input tax recoverable", debitAmount: args.taxAmount },
    { accountCode: ACCOUNT_CODES.AP, description: "Supplier payable", creditAmount: args.totalAmount },
  ];

  if (args.paidAmount > 0) {
    // Paying the supplier reduces AP and increases cash outflow.
    lines.push({ accountCode: ACCOUNT_CODES.AP, description: "Reduce AP for initial payment", debitAmount: args.paidAmount });
    lines.push({ accountCode: ACCOUNT_CODES.CASH, description: "Supplier payment (initial)", creditAmount: args.paidAmount });
  }

  // Remove zero-amount lines to keep journal cleaner.
  const filtered = lines.filter((l) => (l.debitAmount ?? 0) > 0 || (l.creditAmount ?? 0) > 0);

  await postJournalEntry(orgId, args.entryDate, args.memo, referenceType, referenceId, filtered);
}

export async function postExpenseToGl(args: {
  organizationId: string;
  expenseId: string;
  entryDate: Date;
  memo: string;
  amount: number;
  createdById?: string | null;
}) {
  const orgId = args.organizationId;
  const referenceType: GlReferenceType = "Expense";
  const referenceId = args.expenseId;

  await reversePostedEntriesForReference(orgId, referenceType, referenceId, args.createdById ?? null);

  const lines: JournalLineDraft[] = [
    { accountCode: ACCOUNT_CODES.OPERATING_EXPENSES, description: "Expense", debitAmount: args.amount },
    { accountCode: ACCOUNT_CODES.CASH, description: "Cash outflow (expense)", creditAmount: args.amount },
  ];

  await postJournalEntry(orgId, args.entryDate, args.memo, referenceType, referenceId, lines);
}

export async function postClientPaymentToGl(args: {
  organizationId: string;
  clientPaymentId: string;
  entryDate: Date;
  memo: string;
  amount: number;
  createdById?: string | null;
}) {
  const orgId = args.organizationId;
  const referenceType: GlReferenceType = "ClientPayment";
  const referenceId = args.clientPaymentId;

  await reversePostedEntriesForReference(orgId, referenceType, referenceId, args.createdById ?? null);

  const lines: JournalLineDraft[] = [
    { accountCode: ACCOUNT_CODES.CASH, description: "Receipt (customer payment)", debitAmount: args.amount },
    { accountCode: ACCOUNT_CODES.AR, description: "Reduce AR", creditAmount: args.amount },
  ];

  await postJournalEntry(orgId, args.entryDate, args.memo, referenceType, referenceId, lines);
}

export async function postSupplierPaymentToGl(args: {
  organizationId: string;
  supplierPaymentId: string;
  entryDate: Date;
  memo: string;
  amount: number;
  createdById?: string | null;
}) {
  const orgId = args.organizationId;
  const referenceType: GlReferenceType = "SupplierPayment";
  const referenceId = args.supplierPaymentId;

  await reversePostedEntriesForReference(orgId, referenceType, referenceId, args.createdById ?? null);

  const lines: JournalLineDraft[] = [
    { accountCode: ACCOUNT_CODES.AP, description: "Reduce AP", debitAmount: args.amount },
    { accountCode: ACCOUNT_CODES.CASH, description: "Payment (supplier)", creditAmount: args.amount },
  ];

  await postJournalEntry(orgId, args.entryDate, args.memo, referenceType, referenceId, lines);
}

export async function postSalesCreditNoteToGl(args: {
  organizationId: string;
  salesCreditNoteId: string;
  entryDate: Date;
  memo: string;
  amount: number; // in org default currency
  createdById?: string | null;
}) {
  const orgId = args.organizationId;
  const referenceType: GlReferenceType = "SalesCreditNote";
  const referenceId = args.salesCreditNoteId;

  await reversePostedEntriesForReference(orgId, referenceType, referenceId, args.createdById ?? null);

  const lines: JournalLineDraft[] = [
    { accountCode: ACCOUNT_CODES.AR, description: "Reduce AR (credit note)", creditAmount: args.amount },
    { accountCode: ACCOUNT_CODES.SALES_REVENUE, description: "Reduce revenue (credit note)", debitAmount: args.amount },
  ];

  await postJournalEntry(orgId, args.entryDate, args.memo, referenceType, referenceId, lines);
}

export async function postSalesDebitNoteToGl(args: {
  organizationId: string;
  salesDebitNoteId: string;
  entryDate: Date;
  memo: string;
  amount: number; // in org default currency
  createdById?: string | null;
}) {
  const orgId = args.organizationId;
  const referenceType: GlReferenceType = "SalesDebitNote";
  const referenceId = args.salesDebitNoteId;

  await reversePostedEntriesForReference(orgId, referenceType, referenceId, args.createdById ?? null);

  const lines: JournalLineDraft[] = [
    { accountCode: ACCOUNT_CODES.AR, description: "Increase AR (debit note)", debitAmount: args.amount },
    { accountCode: ACCOUNT_CODES.SALES_REVENUE, description: "Increase revenue (debit note)", creditAmount: args.amount },
  ];

  await postJournalEntry(orgId, args.entryDate, args.memo, referenceType, referenceId, lines);
}

export async function reverseGlForReference(args: {
  organizationId: string;
  referenceType: GlReferenceType;
  referenceId: string;
  reversedById?: string | null;
}) {
  await reversePostedEntriesForReference(
    args.organizationId,
    args.referenceType,
    args.referenceId,
    args.reversedById ?? null
  );
}

