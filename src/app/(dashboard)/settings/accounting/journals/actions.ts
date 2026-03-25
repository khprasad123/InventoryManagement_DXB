"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser, getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import type { JournalEntry, JournalLine, GlAccount } from "@prisma/client";

const MAX_LINES = 10;
const PAGE_SIZE = 10;

function toNumber(v: FormDataEntryValue | null): number {
  const s = String(v ?? "").trim();
  if (!s) return 0;
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error("Invalid number");
  return Math.round(n * 100) / 100;
}

function formatJournalSearch(q: string) {
  return q.trim();
}

export async function getGlAccountsForJournal(): Promise<Array<Pick<GlAccount, "id" | "code" | "name">>> {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  await requirePermission(PERMISSIONS.GL_ACCOUNTS_READ);

  return prisma.glAccount.findMany({
    where: { organizationId: orgId, deletedAt: null },
    select: { id: true, code: true, name: true },
    orderBy: { code: "asc" },
  });
}

export async function getJournalEntriesPaginated(page: number, search?: string): Promise<{
  entries: Array<
    JournalEntry & {
      lines: Array<JournalLine & { account: { code: string; name: string } }>;
      totalDebit: number;
      totalCredit: number;
    }
  >;
  total: number;
  pageSize: number;
  totalPages: number;
  currentPage: number;
}> {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  await requirePermission(PERMISSIONS.GL_JOURNALS_READ);

  const q = formatJournalSearch(search ?? "");
  const where: any = {
    organizationId: orgId,
    deletedAt: null,
    ...(q
      ? {
          OR: [
            { entryNo: { contains: q, mode: "insensitive" } },
            { memo: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const currentPage = Math.max(1, page);
  const total = await prisma.journalEntry.count({ where });

  const rows = await prisma.journalEntry.findMany({
    where,
    orderBy: { entryDate: "desc" },
    include: {
      lines: {
        where: { deletedAt: null },
        include: { account: { select: { code: true, name: true } } },
      },
    },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const entries = rows.map((e) => {
    const totalDebit = (e.lines ?? []).reduce((sum, l) => sum + Number(l.debitAmount), 0);
    const totalCredit = (e.lines ?? []).reduce((sum, l) => sum + Number(l.creditAmount), 0);
    return { ...e, totalDebit, totalCredit };
  });

  return {
    entries,
    total,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE) || 1,
    currentPage,
  };
}

export async function createJournalEntry(formData: FormData): Promise<{ error?: Record<string, string[]> } | void> {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  await requirePermission(PERMISSIONS.GL_JOURNALS_CREATE);

  try {
    const entryDateRaw = formData.get("entryDate");
    const entryDate = entryDateRaw ? new Date(String(entryDateRaw)) : null;
    if (!entryDateRaw || !entryDate || Number.isNaN(entryDate.getTime())) {
      return { error: { entryDate: ["Valid date is required"] } };
    }

    const memo = String(formData.get("memo") ?? "").trim();

    const rawLineCount = Number(formData.get("lineCount") ?? "0");
    const lineCount = Number.isFinite(rawLineCount) ? Math.max(0, Math.min(MAX_LINES, rawLineCount)) : 0;

    const lines: Array<{
      accountId: string;
      description?: string | null;
      debitAmount: number;
      creditAmount: number;
    }> = [];

    let sumDebit = 0;
    let sumCredit = 0;

    for (let i = 0; i < lineCount; i++) {
      const accountId = String(formData.get(`line_${i}_accountId`) ?? "").trim();
      const description = String(formData.get(`line_${i}_description`) ?? "").trim();
      const debitAmount = toNumber(formData.get(`line_${i}_debit`) as any);
      const creditAmount = toNumber(formData.get(`line_${i}_credit`) as any);

      if (!accountId) continue;

      const nonZeroDebit = debitAmount > 0;
      const nonZeroCredit = creditAmount > 0;
      if (nonZeroDebit && nonZeroCredit) {
        return { error: { _form: [`Line ${i + 1}: Use either Debit or Credit, not both.`] } };
      }
      if (!nonZeroDebit && !nonZeroCredit) continue;

      lines.push({
        accountId,
        description: description ? description : null,
        debitAmount,
        creditAmount,
      });

      sumDebit += debitAmount;
      sumCredit += creditAmount;
    }

    if (lines.length < 2) {
      return { error: { _form: ["Journal entry must contain at least 2 accounting lines (one debit and one credit)."] } };
    }

    if (Math.abs(sumDebit - sumCredit) > 0.01) {
      return { error: { _form: [`Debits ( ${sumDebit.toFixed(2)} ) must equal credits ( ${sumCredit.toFixed(2)} ).`] } };
    }

    const accountIds = Array.from(new Set(lines.map((l) => l.accountId)));
    const accounts = await prisma.glAccount.findMany({
      where: { id: { in: accountIds }, organizationId: orgId, deletedAt: null },
      select: { id: true },
    });
    if (accounts.length !== accountIds.length) {
      return { error: { _form: ["One or more GL accounts are invalid for this organization."] } };
    }

    const entryNo = `JE-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

    const entry = await prisma.journalEntry.create({
      data: {
        organizationId: orgId,
        entryNo,
        entryDate,
        memo: memo || null,
        status: "POSTED",
      },
      select: { id: true },
    });

    await prisma.journalLine.createMany({
      data: lines.map((l) => ({
        journalEntryId: entry.id,
        accountId: l.accountId,
        description: l.description ?? undefined,
        debitAmount: l.debitAmount,
        creditAmount: l.creditAmount,
      })),
    });

    return;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: { _form: [msg || "Failed to create journal entry"] } };
  }
}

export async function reverseJournalEntry(journalEntryId: string): Promise<{ error?: string } | void> {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  await requirePermission(PERMISSIONS.GL_JOURNALS_DELETE);

  const user = await getCurrentUser();
  const userId = (user as { id?: string } | null)?.id ?? null;

  const entry = await prisma.journalEntry.findFirst({
    where: { id: journalEntryId, organizationId: orgId, deletedAt: null },
    include: { lines: { where: { deletedAt: null } } },
  });

  if (!entry) return { error: "Journal entry not found" };
  if (!entry.lines?.length) return { error: "Journal entry has no lines" };
  if (entry.status === "REVERSED") return { error: "Journal entry is already reversed" };

  const reversalEntryNo = `JE-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
  const reversalEntryDate = new Date();

  const reversalEntry = await prisma.journalEntry.create({
    data: {
      organizationId: orgId,
      entryNo: reversalEntryNo,
      entryDate: reversalEntryDate,
      memo: `Reversal of ${entry.entryNo}`,
      status: "REVERSED",
    },
    select: { id: true },
  });

  await prisma.journalLine.createMany({
    data: entry.lines.map((l) => ({
      journalEntryId: reversalEntry.id,
      accountId: l.accountId,
      description: l.description ?? undefined,
      debitAmount: l.creditAmount ? Number(l.creditAmount) : 0,
      creditAmount: l.debitAmount ? Number(l.debitAmount) : 0,
    })),
  });

  await prisma.journalEntry.update({
    where: { id: entry.id },
    data: {
      status: "REVERSED",
      deletedById: userId ?? undefined,
    },
  });

  return;
}

