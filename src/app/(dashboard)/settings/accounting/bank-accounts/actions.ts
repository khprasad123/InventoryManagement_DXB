"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, getOrganizationId } from "@/lib/auth-utils";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { parseCsvToRows, normalizeHeaderKey, toNumberOrNull } from "@/lib/csv-import-utils";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_MATCH_CANDIDATES = 20;
const MATCH_WINDOW_DAYS = 14;

function parseDateOrNull(v: unknown): Date | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function toMoneyAbs(n: unknown): { abs: number; isValid: boolean } {
  const num = typeof n === "number" ? n : Number(String(n ?? "").trim());
  if (!Number.isFinite(num)) return { abs: 0, isValid: false };
  const abs = Math.abs(Math.round(num * 100) / 100);
  return { abs, isValid: true };
}

export async function getBankAccounts(search?: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  await requirePermission(PERMISSIONS.BANK_ACCOUNTS_READ);

  const q = (search ?? "").trim();
  return prisma.bankAccount.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function createBankAccount(formData: FormData): Promise<{ error?: Record<string, string[]> } | void> {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  await requirePermission(PERMISSIONS.BANK_ACCOUNTS_CREATE);

  const name = String(formData.get("name") ?? "").trim();
  const bankName = String(formData.get("bankName") ?? "").trim();
  const accountNumberMasked = String(formData.get("accountNumberMasked") ?? "").trim();
  const currencyCode = String(formData.get("currencyCode") ?? "AED").trim() || "AED";

  if (!name) return { error: { name: ["Bank account name is required"] } };

  await prisma.bankAccount.create({
    data: {
      organizationId: orgId,
      name,
      bankName: bankName || null,
      accountNumberMasked: accountNumberMasked || null,
      currencyCode,
    },
  });

  return;
}

export async function getBankStatementsForAccount(bankAccountId: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  await requirePermission(PERMISSIONS.BANK_ACCOUNTS_READ);

  return prisma.bankStatement.findMany({
    where: { bankAccountId, organizationId: orgId, deletedAt: null },
    orderBy: { statementDate: "desc" },
  });
}

export async function importBankStatement({
  bankAccountId,
  formData,
}: {
  bankAccountId: string;
  formData: FormData;
}): Promise<{ error?: Record<string, string[]>; imported?: number } | void> {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  await requirePermission(PERMISSIONS.BANK_STATEMENTS_IMPORT);

  const statementDateRaw = formData.get("statementDate");
  const statementDate = statementDateRaw ? parseDateOrNull(statementDateRaw) : null;
  if (!statementDate) return { error: { statementDate: ["Statement date is required"] } };

  const file = formData.get("file") as File | null;
  if (!file) return { error: { file: ["CSV file is required"] } };
  if (file.size > MAX_FILE_SIZE_BYTES) return { error: { file: ["CSV file too large"] } };

  const account = await prisma.bankAccount.findFirst({
    where: { id: bankAccountId, organizationId: orgId, deletedAt: null },
    select: { id: true, currencyCode: true },
  });
  if (!account) return { error: { bankAccountId: ["Bank account not found"] } };

  const buf = Buffer.from(await file.arrayBuffer());
  const csvText = buf.toString("utf-8");
  const parsedRows = parseCsvToRows(csvText);
  if (parsedRows.length < 2) {
    return { error: { file: ["CSV must include a header row and at least 1 data row"] } };
  }

  const header = parsedRows[0].map(normalizeHeaderKey);
  const dataRows = parsedRows.slice(1);

  const getVal = (row: string[], key: string) => {
    const idx = header.indexOf(normalizeHeaderKey(key));
    if (idx === -1) return "";
    return row[idx] ?? "";
  };

  // Create statement first, then transactions.
  const statement = await prisma.bankStatement.create({
    data: {
      organizationId: orgId,
      bankAccountId,
      statementDate,
      sourceFileUrl: null,
    },
    select: { id: true, bankAccountId: true },
  });

  let imported = 0;
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const transactionDate = parseDateOrNull(getVal(row, "date") || getVal(row, "transactionDate"));
    const amountNum = toNumberOrNull(getVal(row, "amount") || getVal(row, "value"));

    if (!transactionDate || amountNum === null) continue;

    const reference = String(getVal(row, "reference") || "").trim() || null;
    const description = String(getVal(row, "description") || getVal(row, "memo") || "").trim() || null;

    await prisma.bankTransaction.create({
      data: {
        organizationId: orgId,
        bankStatementId: statement.id,
        bankAccountId,
        transactionDate,
        reference,
        description,
        amount: amountNum,
        currencyCode: account.currencyCode,
      },
    });
    imported++;
  }

  return { imported };
}

export async function importBankStatementAction(formData: FormData) {
  const bankAccountId = String(formData.get("bankAccountId") ?? "").trim();
  if (!bankAccountId) return { error: { bankAccountId: ["Bank account is required"] } };
  return importBankStatement({ bankAccountId, formData });
}

export async function getBankStatementMatchingData(bankStatementId: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  await requirePermission(PERMISSIONS.BANK_RECONCILIATIONS_READ);

  const statement = await prisma.bankStatement.findFirst({
    where: { id: bankStatementId, organizationId: orgId, deletedAt: null },
    select: { id: true, statementDate: true, bankAccountId: true },
  });
  if (!statement) return null;

  const reconciliation = await prisma.bankReconciliation.findFirst({
    where: { bankStatementId, organizationId: orgId, deletedAt: null },
    select: { id: true, status: true },
  });

  const matchedItems = reconciliation
    ? await prisma.bankReconciliationItem.findMany({
        where: { bankReconciliationId: reconciliation.id, deletedAt: null },
        select: { bankTransactionId: true, paymentType: true, paymentId: true, matchedAmount: true, notes: true },
      })
    : [];
  const matchedByTransactionId = new Map(matchedItems.map((m) => [m.bankTransactionId, m]));

  const matchedClientPaymentIds = matchedItems.filter((m) => m.paymentType === "ClientPayment").map((m) => m.paymentId);
  const matchedSupplierPaymentIds = matchedItems.filter((m) => m.paymentType === "SupplierPayment").map((m) => m.paymentId);

  const [matchedClientPayments, matchedSupplierPayments] = await Promise.all([
    matchedClientPaymentIds.length
      ? prisma.clientPayment.findMany({
          where: { organizationId: orgId, deletedAt: null, id: { in: matchedClientPaymentIds } },
          select: { id: true, paymentDate: true, reference: true, amount: true, paymentType: true },
        })
      : Promise.resolve([]),
    matchedSupplierPaymentIds.length
      ? prisma.supplierPayment.findMany({
          where: { organizationId: orgId, deletedAt: null, id: { in: matchedSupplierPaymentIds } },
          select: { id: true, paymentDate: true, reference: true, amount: true, method: true },
        })
      : Promise.resolve([]),
  ]);

  const matchedClientPaymentById = new Map(matchedClientPayments.map((p) => [p.id, p]));
  const matchedSupplierPaymentById = new Map(matchedSupplierPayments.map((p) => [p.id, p]));

  const transactions = await prisma.bankTransaction.findMany({
    where: { bankStatementId, organizationId: orgId, deletedAt: null },
    orderBy: { transactionDate: "asc" },
  });

  const start = (d: Date) => {
    const nd = new Date(d);
    nd.setDate(nd.getDate() - MATCH_WINDOW_DAYS);
    return nd;
  };
  const end = (d: Date) => {
    const nd = new Date(d);
    nd.setDate(nd.getDate() + MATCH_WINDOW_DAYS);
    return nd;
  };

  // For MVP: build candidates per transaction (bounded by amount + date window).
  const enriched = [];
  for (const t of transactions) {
    const amountParsed = toMoneyAbs(t.amount);
    const abs = amountParsed.abs;
    const windowStart = start(t.transactionDate);
    const windowEnd = end(t.transactionDate);

    const clientCandidates =
      abs > 0
        ? await prisma.clientPayment.findMany({
            where: {
              organizationId: orgId,
              deletedAt: null,
              amount: abs,
              paymentDate: { gte: windowStart, lte: windowEnd },
              ...(matchedClientPaymentIds.length ? { id: { notIn: matchedClientPaymentIds } } : {}),
            },
            select: { id: true, amount: true, paymentDate: true, reference: true, paymentType: true },
            take: MAX_MATCH_CANDIDATES,
            orderBy: { paymentDate: "desc" },
          })
        : [];

    const supplierCandidates =
      abs > 0
        ? await prisma.supplierPayment.findMany({
            where: {
              organizationId: orgId,
              deletedAt: null,
              amount: abs,
              paymentDate: { gte: windowStart, lte: windowEnd },
              ...(matchedSupplierPaymentIds.length ? { id: { notIn: matchedSupplierPaymentIds } } : {}),
            },
            select: { id: true, amount: true, paymentDate: true, reference: true, method: true },
            take: MAX_MATCH_CANDIDATES,
            orderBy: { paymentDate: "desc" },
          })
        : [];

    const match = matchedByTransactionId.get(t.id) ?? null;
    const matchedPayment =
      match?.paymentType === "ClientPayment"
        ? matchedClientPaymentById.get(match.paymentId) ?? null
        : match?.paymentType === "SupplierPayment"
          ? (() => {
              const p = matchedSupplierPaymentById.get(match.paymentId) as any;
              if (!p) return null;
              return { ...p, paymentType: p.method ?? null };
            })()
          : null;

    enriched.push({
      transaction: t,
      match,
      matchedPayment,
      clientCandidates,
      supplierCandidates: supplierCandidates.map((p: any) => ({ ...p, paymentType: p.method ?? null })),
    });
  }

  return {
    statement,
    reconciled: Boolean(reconciliation),
    reconciliationStatus: reconciliation?.status ?? null,
    items: enriched,
  };
}

export async function matchBankTransaction({
  bankStatementId,
  bankTransactionId,
  paymentType,
  paymentId,
  notes,
}: {
  bankStatementId: string;
  bankTransactionId: string;
  paymentType: "ClientPayment" | "SupplierPayment";
  paymentId: string;
  notes?: string;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  await requirePermission(PERMISSIONS.BANK_RECONCILIATIONS_MATCH);

  const tx = await prisma.bankTransaction.findFirst({
    where: { id: bankTransactionId, organizationId: orgId, deletedAt: null, bankStatementId },
    select: {
      id: true,
      organizationId: true,
      bankStatementId: true,
      bankAccountId: true,
      amount: true,
      currencyCode: true,
      transactionDate: true,
    },
  });
  if (!tx) return { error: "Bank transaction not found" };

  const abs = Math.abs(Number(tx.amount));
  if (!Number.isFinite(abs) || abs <= 0) return { error: "Invalid transaction amount" };

  let paymentAmount: number | null = null;
  if (paymentType === "ClientPayment") {
    const p = await prisma.clientPayment.findFirst({
      where: { id: paymentId, organizationId: orgId, deletedAt: null },
      select: { id: true, amount: true },
    });
    if (!p) return { error: "Client payment not found" };
    paymentAmount = Number(p.amount);
  } else {
    const p = await prisma.supplierPayment.findFirst({
      where: { id: paymentId, organizationId: orgId, deletedAt: null },
      select: { id: true, amount: true },
    });
    if (!p) return { error: "Supplier payment not found" };
    paymentAmount = Number(p.amount);
  }

  if (paymentAmount === null) return { error: "Invalid payment" };
  if (Math.abs(paymentAmount - abs) > 0.01) return { error: "Payment amount must match transaction amount" };

  const reconciliation = await prisma.bankReconciliation.upsert({
    where: { organizationId_bankStatementId: { organizationId: orgId, bankStatementId } },
    update: {},
    create: {
      organizationId: orgId,
      bankStatementId,
      bankAccountId: tx.bankAccountId,
      status: "OPEN",
    },
    select: { id: true },
  });

  // If session is closed, block modifications.
  const existingReconciliation = await prisma.bankReconciliation.findFirst({
    where: { organizationId: orgId, bankStatementId, deletedAt: null },
    select: { id: true, status: true },
  });
  if (existingReconciliation?.status === "CLOSED") {
    return { error: "Reconciliation session is CLOSED" };
  }

  await prisma.bankReconciliationItem.upsert({
    where: { bankTransactionId },
    update: {
      paymentType,
      paymentId,
      matchedAmount: abs,
      notes: notes ?? null,
      deletedAt: null,
      deletedById: null,
    },
    create: {
      bankReconciliationId: reconciliation.id,
      bankTransactionId,
      paymentType,
      paymentId,
      matchedAmount: abs,
      notes: notes ?? null,
    },
  });

  const [totalTxCount, matchedCount] = await Promise.all([
    prisma.bankTransaction.count({
      where: { bankStatementId, organizationId: orgId, deletedAt: null },
    }),
    prisma.bankReconciliationItem.count({
      where: {
        deletedAt: null,
        bankReconciliation: { organizationId: orgId, bankStatementId },
      },
    }),
  ]);

  const nextStatus: "OPEN" | "MATCHED" =
    totalTxCount > 0 && matchedCount >= totalTxCount ? "MATCHED" : "OPEN";

  await prisma.bankReconciliation.update({
    where: { organizationId_bankStatementId: { organizationId: orgId, bankStatementId } },
    data: { status: nextStatus },
  });

  return;
}

export async function unmatchBankTransaction({
  bankStatementId,
  bankTransactionId,
}: {
  bankStatementId: string;
  bankTransactionId: string;
}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  await requirePermission(PERMISSIONS.BANK_RECONCILIATIONS_MATCH);

  const user = await getCurrentUser();
  const userId = (user as { id?: string } | null)?.id ?? null;

  const tx = await prisma.bankTransaction.findFirst({
    where: { id: bankTransactionId, organizationId: orgId, deletedAt: null },
    select: { id: true, bankStatementId: true },
  });
  if (!tx) return { error: "Bank transaction not found" };
  if (tx.bankStatementId !== bankStatementId) return { error: "Transaction not in this statement" };

  const reconciliation = await prisma.bankReconciliation.findFirst({
    where: { organizationId: orgId, bankStatementId, deletedAt: null },
    select: { id: true, status: true },
  });
  if (reconciliation?.status === "CLOSED") {
    return { error: "Reconciliation session is CLOSED" };
  }
  if (!reconciliation) return { error: "Reconciliation session not started" };

  const item = await prisma.bankReconciliationItem.findFirst({
    where: { bankTransactionId, deletedAt: null },
    select: { id: true },
  });
  if (!item) return { error: "Transaction is not matched" };

  const now = new Date();
  await prisma.bankReconciliationItem.update({
    where: { bankTransactionId },
    data: { deletedAt: now, deletedById: userId ?? undefined },
  });

  const [totalTxCount, matchedCount] = await Promise.all([
    prisma.bankTransaction.count({
      where: { bankStatementId, organizationId: orgId, deletedAt: null },
    }),
    prisma.bankReconciliationItem.count({
      where: {
        deletedAt: null,
        bankReconciliation: { organizationId: orgId, bankStatementId },
      },
    }),
  ]);

  const nextStatus: "OPEN" | "MATCHED" =
    totalTxCount > 0 && matchedCount >= totalTxCount ? "MATCHED" : "OPEN";

  await prisma.bankReconciliation.update({
    where: { organizationId_bankStatementId: { organizationId: orgId, bankStatementId } },
    data: { status: nextStatus },
  });

  return;
}

export async function closeBankReconciliationSession(bankStatementId: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  await requirePermission(PERMISSIONS.BANK_RECONCILIATIONS_MATCH);

  const statement = await prisma.bankStatement.findFirst({
    where: { id: bankStatementId, organizationId: orgId, deletedAt: null },
    select: { id: true, bankAccountId: true },
  });
  if (!statement) return { error: "Bank statement not found" };

  await prisma.bankReconciliation.upsert({
    where: { organizationId_bankStatementId: { organizationId: orgId, bankStatementId } },
    update: { status: "CLOSED" },
    create: {
      organizationId: orgId,
      bankStatementId,
      bankAccountId: statement.bankAccountId,
      status: "CLOSED",
    },
  });

  revalidatePath(`/settings/accounting/bank-accounts/${statement.bankAccountId}/statements/${bankStatementId}`);
  revalidatePath(`/settings/accounting/bank-accounts/${statement.bankAccountId}/statements`);
}

export async function reopenBankReconciliationSession(bankStatementId: string) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  await requirePermission(PERMISSIONS.BANK_RECONCILIATIONS_MATCH);

  const statement = await prisma.bankStatement.findFirst({
    where: { id: bankStatementId, organizationId: orgId, deletedAt: null },
    select: { id: true, bankAccountId: true },
  });
  if (!statement) return { error: "Bank statement not found" };

  await prisma.bankReconciliation.upsert({
    where: { organizationId_bankStatementId: { organizationId: orgId, bankStatementId } },
    update: { status: "OPEN" },
    create: {
      organizationId: orgId,
      bankStatementId,
      bankAccountId: statement.bankAccountId,
      status: "OPEN",
    },
  });

  revalidatePath(`/settings/accounting/bank-accounts/${statement.bankAccountId}/statements/${bankStatementId}`);
  revalidatePath(`/settings/accounting/bank-accounts/${statement.bankAccountId}/statements`);
}

