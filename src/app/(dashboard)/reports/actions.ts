"use server";

import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/auth-utils";
import { getDefaultCurrencyCodeForOrg } from "@/lib/currency";
import { convertAmountToCurrency } from "@/lib/fx";
import { PERMISSIONS, requirePermission, canGenerateReportType, type ReportType } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { put } from "@vercel/blob";
import * as XLSX from "xlsx";

function toStartOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function toEndOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function parseDateOrDefault(input: string | undefined, fallback: Date) {
  if (!input) return fallback;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return fallback;
  return d;
}

function toYmd(d: Date) {
  return d.toISOString().slice(0, 10);
}

type AgingBuckets = {
  current: number;
  "1_30": number;
  "31_60": number;
  "61_90": number;
  over_90: number;
};

function emptyBuckets(): AgingBuckets {
  return { current: 0, "1_30": 0, "31_60": 0, "61_90": 0, over_90: 0 };
}

function addToBucket(buckets: AgingBuckets, daysOverdue: number, amount: number) {
  if (daysOverdue <= 0) buckets.current += amount;
  else if (daysOverdue <= 30) buckets["1_30"] += amount;
  else if (daysOverdue <= 60) buckets["31_60"] += amount;
  else if (daysOverdue <= 90) buckets["61_90"] += amount;
  else buckets.over_90 += amount;
}

function roundBuckets(b: AgingBuckets): AgingBuckets {
  return {
    current: Math.round(b.current * 100) / 100,
    "1_30": Math.round(b["1_30"] * 100) / 100,
    "31_60": Math.round(b["31_60"] * 100) / 100,
    "61_90": Math.round(b["61_90"] * 100) / 100,
    over_90: Math.round(b.over_90 * 100) / 100,
  };
}

const REPORT_RETENTION_DAYS = 90;

async function purgeExpiredReportExports(orgId: string) {
  const now = new Date();
  const expired = await prisma.$queryRaw<Array<{ id: string; document_id: string }>>`
    SELECT id, document_id
    FROM report_exports
    WHERE organization_id = ${orgId}
      AND expires_at <= ${now}
  `;
  if (!expired.length) return;

  const documentIds = expired.map((r) => r.document_id);
  await prisma.document.updateMany({
    where: { id: { in: documentIds }, deletedAt: null },
    data: { deletedAt: now, deletedById: null },
  });
  await prisma.$executeRaw`
    DELETE FROM report_exports
    WHERE id = ANY(${expired.map((r) => r.id)}::text[])
  `;
}

export async function getReportsData(params: {
  from?: string;
  to?: string;
  asOf?: string;
}) {
  await requirePermission(PERMISSIONS.VIEW_REPORTS);
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  await purgeExpiredReportExports(orgId);

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const from = toStartOfDay(parseDateOrDefault(params.from, defaultFrom));
  const to = toEndOfDay(parseDateOrDefault(params.to, now));
  const asOf = toStartOfDay(parseDateOrDefault(params.asOf, now));
  const defaultCurrencyCode = await getDefaultCurrencyCodeForOrg(orgId);

  const [salesInvoices, purchaseInvoices, salesItems, items] = await Promise.all([
    prisma.salesInvoice.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        invoiceDate: { gte: from, lte: to },
      },
      select: {
        id: true,
        clientId: true,
        totalAmount: true,
        paidAmount: true,
        currencyCode: true,
        client: { select: { name: true } },
      },
    }),
    prisma.purchaseInvoice.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        invoiceDate: { gte: from, lte: to },
      },
      select: {
        totalAmount: true,
        paidAmount: true,
        currencyCode: true,
      },
    }),
    prisma.salesInvoiceItem.findMany({
      where: {
        salesInvoice: {
          organizationId: orgId,
          deletedAt: null,
          invoiceDate: { gte: from, lte: to },
        },
      },
      select: {
        itemId: true,
        quantity: true,
        total: true,
        salesInvoice: { select: { currencyCode: true } },
        item: { select: { sku: true, name: true } },
      },
    }),
    prisma.item.findMany({
      where: { organizationId: orgId, deletedAt: null },
      select: { id: true, sku: true, name: true, stockQty: true, defaultPurchaseCost: true },
      orderBy: { name: "asc" },
    }),
  ]);

  let salesTotal = 0;
  let purchasesTotal = 0;
  let receivables = 0;
  let payables = 0;

  for (const inv of salesInvoices) {
    const code = inv.currencyCode ?? defaultCurrencyCode;
    const total = Number(inv.totalAmount);
    const paid = Number(inv.paidAmount ?? 0);
    salesTotal += await convertAmountToCurrency(total, code, defaultCurrencyCode);
    receivables += await convertAmountToCurrency(Math.max(0, total - paid), code, defaultCurrencyCode);
  }
  for (const inv of purchaseInvoices) {
    const code = inv.currencyCode ?? defaultCurrencyCode;
    const total = Number(inv.totalAmount);
    const paid = Number(inv.paidAmount ?? 0);
    purchasesTotal += await convertAmountToCurrency(total, code, defaultCurrencyCode);
    payables += await convertAmountToCurrency(Math.max(0, total - paid), code, defaultCurrencyCode);
  }

  const customerRevenueMap = new Map<string, { clientName: string; revenue: number }>();
  for (const inv of salesInvoices) {
    const key = inv.clientId;
    const code = inv.currencyCode ?? defaultCurrencyCode;
    const converted = await convertAmountToCurrency(Number(inv.totalAmount), code, defaultCurrencyCode);
    const row = customerRevenueMap.get(key) ?? { clientName: inv.client.name, revenue: 0 };
    row.revenue += converted;
    customerRevenueMap.set(key, row);
  }
  const topCustomers = Array.from(customerRevenueMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const itemRevenueMap = new Map<string, { sku: string; name: string; qty: number; revenue: number }>();
  for (const line of salesItems) {
    const key = line.itemId;
    const code = line.salesInvoice.currencyCode ?? defaultCurrencyCode;
    const converted = await convertAmountToCurrency(Number(line.total), code, defaultCurrencyCode);
    const row = itemRevenueMap.get(key) ?? {
      sku: line.item.sku,
      name: line.item.name,
      qty: 0,
      revenue: 0,
    };
    row.qty += line.quantity;
    row.revenue += converted;
    itemRevenueMap.set(key, row);
  }
  const topItems = Array.from(itemRevenueMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const inventoryRows = items
    .map((it) => {
      const cost = Number(it.defaultPurchaseCost);
      const stockValue = it.stockQty * cost;
      return {
        id: it.id,
        sku: it.sku,
        name: it.name,
        stockQty: it.stockQty,
        cost,
        stockValue,
      };
    })
    .sort((a, b) => b.stockValue - a.stockValue);
  const inventoryTotalValue = inventoryRows.reduce((s, r) => s + r.stockValue, 0);

  const [salesAging, purchasesAging] = await Promise.all([
    prisma.salesInvoice.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        paymentStatus: { not: "PAID" },
      },
      select: { totalAmount: true, paidAmount: true, dueDate: true, currencyCode: true },
    }),
    prisma.purchaseInvoice.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        paymentStatus: { not: "PAID" },
      },
      select: { totalAmount: true, paidAmount: true, dueDate: true, currencyCode: true },
    }),
  ]);

  const ar = emptyBuckets();
  const ap = emptyBuckets();

  for (const inv of salesAging) {
    const code = inv.currencyCode ?? defaultCurrencyCode;
    const balance = Math.max(0, Number(inv.totalAmount) - Number(inv.paidAmount ?? 0));
    if (balance <= 0) continue;
    const converted = await convertAmountToCurrency(balance, code, defaultCurrencyCode);
    const due = inv.dueDate ? toStartOfDay(new Date(inv.dueDate)) : asOf;
    const daysOverdue = Math.floor((asOf.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    addToBucket(ar, daysOverdue, converted);
  }
  for (const inv of purchasesAging) {
    const code = inv.currencyCode ?? defaultCurrencyCode;
    const balance = Math.max(0, Number(inv.totalAmount) - Number(inv.paidAmount ?? 0));
    if (balance <= 0) continue;
    const converted = await convertAmountToCurrency(balance, code, defaultCurrencyCode);
    const due = inv.dueDate ? toStartOfDay(new Date(inv.dueDate)) : asOf;
    const daysOverdue = Math.floor((asOf.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    addToBucket(ap, daysOverdue, converted);
  }

  const generatedFilesRaw = await prisma.$queryRaw<Array<{
    id: string;
    report_type: string;
    format: string;
    metadata: unknown;
    created_at: Date;
    expires_at: Date;
    document_id: string;
    file_name: string;
  }>>`
    SELECT
      re.id,
      re.report_type,
      re.format,
      re.metadata,
      re.created_at,
      re.expires_at,
      d.id AS document_id,
      d.file_name
    FROM report_exports re
    JOIN documents d ON d.id = re.document_id
    WHERE re.organization_id = ${orgId}
      AND d.deleted_at IS NULL
    ORDER BY re.created_at DESC
    LIMIT 20
  `;

  return {
    filters: { from: toYmd(from), to: toYmd(to), asOf: toYmd(asOf) },
    currencyCode: defaultCurrencyCode,
    summary: {
      salesTotal: Math.round(salesTotal * 100) / 100,
      purchasesTotal: Math.round(purchasesTotal * 100) / 100,
      receivables: Math.round(receivables * 100) / 100,
      payables: Math.round(payables * 100) / 100,
      inventoryTotalValue: Math.round(inventoryTotalValue * 100) / 100,
    },
    topCustomers: topCustomers.map((r) => ({
      clientName: r.clientName,
      revenue: Math.round(r.revenue * 100) / 100,
    })),
    topItems: topItems.map((r) => ({
      sku: r.sku,
      name: r.name,
      qty: r.qty,
      revenue: Math.round(r.revenue * 100) / 100,
    })),
    inventoryRows: inventoryRows.slice(0, 25).map((r) => ({
      ...r,
      stockValue: Math.round(r.stockValue * 100) / 100,
    })),
    aging: {
      ar: roundBuckets(ar),
      ap: roundBuckets(ap),
    },
    generatedFiles: generatedFilesRaw.map((row) => ({
      id: row.id,
      reportType: row.report_type,
      format: row.format,
      metadata: row.metadata,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      document: {
        id: row.document_id,
        fileName: row.file_name,
      },
    })),
  };
}

export async function getSalesReportData(params: { from?: string; to?: string }) {
  await requirePermission(PERMISSIONS.VIEW_REPORTS);
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const from = toStartOfDay(parseDateOrDefault(params.from, defaultFrom));
  const to = toEndOfDay(parseDateOrDefault(params.to, now));
  const defaultCurrencyCode = await getDefaultCurrencyCodeForOrg(orgId);

  const invoices = await prisma.salesInvoice.findMany({
    where: { organizationId: orgId, deletedAt: null, invoiceDate: { gte: from, lte: to } },
    include: { client: { select: { id: true, name: true } } },
    orderBy: { invoiceDate: "desc" },
  });

  const rows = await Promise.all(
    invoices.map(async (inv) => {
      const code = inv.currencyCode ?? defaultCurrencyCode;
      const total = Number(inv.totalAmount);
      const paid = Number(inv.paidAmount ?? 0);
      const outstanding = Math.max(0, total - paid);
      const totalBase = await convertAmountToCurrency(total, code, defaultCurrencyCode);
      const outstandingBase = await convertAmountToCurrency(outstanding, code, defaultCurrencyCode);
      return {
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        invoiceDate: toYmd(new Date(inv.invoiceDate)),
        clientId: inv.clientId,
        clientName: inv.client.name,
        status: inv.status,
        paymentStatus: inv.paymentStatus,
        total,
        totalBase,
        outstanding,
        outstandingBase,
        currencyCode: code,
      };
    })
  );

  const summary = rows.reduce(
    (acc, r) => {
      acc.totalBase += r.totalBase;
      acc.outstandingBase += r.outstandingBase;
      return acc;
    },
    { totalBase: 0, outstandingBase: 0 }
  );

  return {
    filters: { from: toYmd(from), to: toYmd(to) },
    currencyCode: defaultCurrencyCode,
    summary: {
      totalBase: Math.round(summary.totalBase * 100) / 100,
      outstandingBase: Math.round(summary.outstandingBase * 100) / 100,
      count: rows.length,
    },
    rows,
  };
}

export async function getPurchasesReportData(params: { from?: string; to?: string }) {
  await requirePermission(PERMISSIONS.VIEW_REPORTS);
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const from = toStartOfDay(parseDateOrDefault(params.from, defaultFrom));
  const to = toEndOfDay(parseDateOrDefault(params.to, now));
  const defaultCurrencyCode = await getDefaultCurrencyCodeForOrg(orgId);

  const invoices = await prisma.purchaseInvoice.findMany({
    where: { organizationId: orgId, deletedAt: null, invoiceDate: { gte: from, lte: to } },
    include: { supplier: { select: { id: true, name: true } } },
    orderBy: { invoiceDate: "desc" },
  });

  const rows = await Promise.all(
    invoices.map(async (inv) => {
      const code = inv.currencyCode ?? defaultCurrencyCode;
      const total = Number(inv.totalAmount);
      const paid = Number(inv.paidAmount ?? 0);
      const outstanding = Math.max(0, total - paid);
      const totalBase = await convertAmountToCurrency(total, code, defaultCurrencyCode);
      const outstandingBase = await convertAmountToCurrency(outstanding, code, defaultCurrencyCode);
      return {
        id: inv.id,
        invoiceNo: inv.invoiceNo,
        invoiceDate: toYmd(new Date(inv.invoiceDate)),
        supplierId: inv.supplierId,
        supplierName: inv.supplier.name,
        paymentStatus: inv.paymentStatus,
        total,
        totalBase,
        outstanding,
        outstandingBase,
        currencyCode: code,
      };
    })
  );

  const summary = rows.reduce(
    (acc, r) => {
      acc.totalBase += r.totalBase;
      acc.outstandingBase += r.outstandingBase;
      return acc;
    },
    { totalBase: 0, outstandingBase: 0 }
  );

  return {
    filters: { from: toYmd(from), to: toYmd(to) },
    currencyCode: defaultCurrencyCode,
    summary: {
      totalBase: Math.round(summary.totalBase * 100) / 100,
      outstandingBase: Math.round(summary.outstandingBase * 100) / 100,
      count: rows.length,
    },
    rows,
  };
}

export async function getSuppliersReportData(params: { from?: string; to?: string }) {
  await requirePermission(PERMISSIONS.VIEW_REPORTS);
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const from = toStartOfDay(parseDateOrDefault(params.from, defaultFrom));
  const to = toEndOfDay(parseDateOrDefault(params.to, now));
  const defaultCurrencyCode = await getDefaultCurrencyCodeForOrg(orgId);

  const invoices = await prisma.purchaseInvoice.findMany({
    where: { organizationId: orgId, deletedAt: null, invoiceDate: { gte: from, lte: to } },
    include: { supplier: { select: { id: true, name: true } } },
    orderBy: { invoiceDate: "desc" },
  });

  const bySupplier = new Map<string, { supplierName: string; invoiceCount: number; totalBase: number; outstandingBase: number }>();
  for (const inv of invoices) {
    const code = inv.currencyCode ?? defaultCurrencyCode;
    const total = Number(inv.totalAmount);
    const paid = Number(inv.paidAmount ?? 0);
    const outstanding = Math.max(0, total - paid);
    const totalBase = await convertAmountToCurrency(total, code, defaultCurrencyCode);
    const outstandingBase = await convertAmountToCurrency(outstanding, code, defaultCurrencyCode);
    const row = bySupplier.get(inv.supplierId) ?? {
      supplierName: inv.supplier.name,
      invoiceCount: 0,
      totalBase: 0,
      outstandingBase: 0,
    };
    row.invoiceCount += 1;
    row.totalBase += totalBase;
    row.outstandingBase += outstandingBase;
    bySupplier.set(inv.supplierId, row);
  }

  return {
    filters: { from: toYmd(from), to: toYmd(to) },
    currencyCode: defaultCurrencyCode,
    rows: Array.from(bySupplier.values()).sort((a, b) => b.totalBase - a.totalBase),
  };
}

export async function getInventoryReportData(params: { asOf?: string }) {
  await requirePermission(PERMISSIONS.VIEW_REPORTS);
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  const now = new Date();
  const asOf = toStartOfDay(parseDateOrDefault(params.asOf, now));

  const items = await prisma.item.findMany({
    where: { organizationId: orgId, deletedAt: null },
    select: { sku: true, name: true, stockQty: true, defaultPurchaseCost: true },
    orderBy: { name: "asc" },
  });

  return {
    filters: { asOf: toYmd(asOf) },
    rows: items.map((it) => {
      const cost = Number(it.defaultPurchaseCost);
      const stockValue = it.stockQty * cost;
      return {
        sku: it.sku,
        name: it.name,
        stockQty: it.stockQty,
        cost,
        stockValue,
      };
    }),
  };
}

export async function getProfitLossReportData(params: { from?: string; to?: string }) {
  const sales = await getSalesReportData(params);
  const purchases = await getPurchasesReportData(params);
  const revenue = sales.summary.totalBase;
  const cogs = purchases.summary.totalBase;
  const grossProfit = revenue - cogs;

  return {
    filters: sales.filters,
    currencyCode: sales.currencyCode,
    rows: [
      { metric: "Revenue", value: revenue },
      { metric: "Cost of Goods Sold", value: cogs },
      { metric: "Gross Profit", value: grossProfit },
    ],
  };
}

function buildWorkbook(
  sheetName: string,
  headers: string[],
  rows: (string | number)[][]
) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
}

export async function generateAndStoreReportFile(
  type: ReportType,
  params: { from?: string; to?: string; asOf?: string }
) {
  const currentUser = await requirePermission(PERMISSIONS.VIEW_REPORTS);
  if (!canGenerateReportType(currentUser, type)) {
    throw new Error(`Forbidden: you do not have permission to generate ${type} reports.`);
  }
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");
  await purgeExpiredReportExports(orgId);
  const now = new Date();
  const stamp = now.toISOString().replace(/[:T]/g, "-").slice(0, 19);

  let fileName = "";
  let workbook: XLSX.WorkBook;
  let metadata: Record<string, unknown> = {};

  if (type === "sales") {
    const data = await getSalesReportData(params);
    fileName = `sales-report-${data.filters.from}-to-${data.filters.to}-${stamp}.xlsx`;
    workbook = buildWorkbook(
      "Sales",
      ["Invoice No", "Date", "Client", "Status", "Payment Status", "Currency", "Total", "Outstanding", `Total (${data.currencyCode})`, `Outstanding (${data.currencyCode})`],
      data.rows.map((r) => [
        r.invoiceNo,
        r.invoiceDate,
        r.clientName,
        r.status,
        r.paymentStatus,
        r.currencyCode,
        r.total.toFixed(2),
        r.outstanding.toFixed(2),
        r.totalBase.toFixed(2),
        r.outstandingBase.toFixed(2),
      ])
    );
    metadata = {
      reportType: type,
      filters: data.filters,
      rowCount: data.rows.length,
      currencyCode: data.currencyCode,
      generatedAt: now.toISOString(),
      retentionDays: REPORT_RETENTION_DAYS,
    };
  } else if (type === "purchases") {
    const data = await getPurchasesReportData(params);
    fileName = `purchases-report-${data.filters.from}-to-${data.filters.to}-${stamp}.xlsx`;
    workbook = buildWorkbook(
      "Purchases",
      ["Invoice No", "Date", "Supplier", "Payment Status", "Currency", "Total", "Outstanding", `Total (${data.currencyCode})`, `Outstanding (${data.currencyCode})`],
      data.rows.map((r) => [
        r.invoiceNo,
        r.invoiceDate,
        r.supplierName,
        r.paymentStatus,
        r.currencyCode,
        r.total.toFixed(2),
        r.outstanding.toFixed(2),
        r.totalBase.toFixed(2),
        r.outstandingBase.toFixed(2),
      ])
    );
    metadata = {
      reportType: type,
      filters: data.filters,
      rowCount: data.rows.length,
      currencyCode: data.currencyCode,
      generatedAt: now.toISOString(),
      retentionDays: REPORT_RETENTION_DAYS,
    };
  } else if (type === "profit_loss") {
    const data = await getProfitLossReportData(params);
    fileName = `profit-loss-report-${data.filters.from}-to-${data.filters.to}-${stamp}.xlsx`;
    workbook = buildWorkbook(
      "ProfitLoss",
      ["Metric", `Amount (${data.currencyCode})`],
      data.rows.map((r) => [r.metric, r.value.toFixed(2)])
    );
    metadata = {
      reportType: type,
      filters: data.filters,
      rowCount: data.rows.length,
      currencyCode: data.currencyCode,
      generatedAt: now.toISOString(),
      retentionDays: REPORT_RETENTION_DAYS,
    };
  } else if (type === "suppliers") {
    const data = await getSuppliersReportData(params);
    fileName = `supplier-report-${data.filters.from}-to-${data.filters.to}-${stamp}.xlsx`;
    workbook = buildWorkbook(
      "Suppliers",
      ["Supplier", "Invoices", `Total (${data.currencyCode})`, `Outstanding (${data.currencyCode})`],
      data.rows.map((r) => [
        r.supplierName,
        r.invoiceCount,
        r.totalBase.toFixed(2),
        r.outstandingBase.toFixed(2),
      ])
    );
    metadata = {
      reportType: type,
      filters: data.filters,
      rowCount: data.rows.length,
      currencyCode: data.currencyCode,
      generatedAt: now.toISOString(),
      retentionDays: REPORT_RETENTION_DAYS,
    };
  } else if (type === "inventory") {
    const data = await getInventoryReportData(params);
    fileName = `inventory-report-asof-${data.filters.asOf}-${stamp}.xlsx`;
    workbook = buildWorkbook(
      "Inventory",
      ["SKU", "Item", "Stock Qty", "Cost", "Stock Value"],
      data.rows.map((r) => [
        r.sku,
        r.name,
        r.stockQty,
        r.cost.toFixed(2),
        r.stockValue.toFixed(2),
      ])
    );
    metadata = {
      reportType: type,
      filters: data.filters,
      rowCount: data.rows.length,
      generatedAt: now.toISOString(),
      retentionDays: REPORT_RETENTION_DAYS,
    };
  } else {
    const data = await getReportsData(params);
    fileName = `overview-report-${data.filters.from}-to-${data.filters.to}-${stamp}.xlsx`;
    workbook = buildWorkbook(
      "Overview",
      ["Metric", "Value", "Currency"],
      [
        ["Sales Total", data.summary.salesTotal.toFixed(2), data.currencyCode],
        ["Purchases Total", data.summary.purchasesTotal.toFixed(2), data.currencyCode],
        ["Receivables", data.summary.receivables.toFixed(2), data.currencyCode],
        ["Payables", data.summary.payables.toFixed(2), data.currencyCode],
        ["Inventory Value", data.summary.inventoryTotalValue.toFixed(2), data.currencyCode],
      ]
    );
    metadata = {
      reportType: type,
      filters: data.filters,
      rowCount: 5,
      currencyCode: data.currencyCode,
      generatedAt: now.toISOString(),
      retentionDays: REPORT_RETENTION_DAYS,
    };
  }

  const userId = (currentUser as { id?: string } | null)?.id;
  const xlsxBuffer = XLSX.write(workbook!, { type: "buffer", bookType: "xlsx" });

  const key = `org-${orgId}/Report/generated/${Date.now()}-${fileName}`;
  const blob = await put(key, xlsxBuffer, {
    access: "public",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const doc = await prisma.document.create({
    data: {
      organizationId: orgId,
      fileName,
      fileUrl: blob.url,
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sizeBytes: xlsxBuffer.byteLength,
      documentableType: "Report",
      documentableId: type,
      createdById: userId ?? undefined,
      updatedById: userId ?? undefined,
    },
    select: { id: true, fileName: true },
  });

  const expiresAt = new Date(now.getTime() + REPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.$executeRaw`
    INSERT INTO report_exports
      (id, organization_id, document_id, report_type, format, metadata, generated_by_id, created_at, expires_at)
    VALUES
      (${`re_${doc.id}`}, ${orgId}, ${doc.id}, ${type}, ${"XLSX"}, ${metadata as any}, ${userId ?? null}, ${now}, ${expiresAt})
  `;

  return {
    success: true,
    reportId: doc.id,
    fileName: doc.fileName,
    generatedFile: {
      id: `re_${doc.id}`,
      reportType: type,
      format: "XLSX",
      metadata,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      document: {
        id: doc.id,
        fileName: doc.fileName,
      },
    },
  };
}

export async function deleteReportFile(documentId: string) {
  await requirePermission(PERMISSIONS.SETTINGS_USERS_MANAGE);
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const now = new Date();
  await prisma.$executeRaw`
    DELETE FROM report_exports
    WHERE organization_id = ${orgId}
      AND document_id = ${documentId}
  `;
  await prisma.document.updateMany({
    where: { id: documentId, organizationId: orgId, deletedAt: null },
    data: { deletedAt: now },
  });
  return { success: true };
}
