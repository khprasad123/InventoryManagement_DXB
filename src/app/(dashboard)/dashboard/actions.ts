"use server";

import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { getDefaultCurrencyCodeForOrg } from "@/lib/currency";
import { convertAmountToCurrency } from "@/lib/fx";

function getMonthStartEnd(monthOffset: number = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + monthOffset);
  const year = d.getFullYear();
  const month = d.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { start, end, year, month: month + 1 };
}

export async function getDashboardData() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const now = new Date();
  const currentMonth = getMonthStartEnd(0);
  const defaultCurrencyCode = await getDefaultCurrencyCodeForOrg(orgId);

  // Total stock value: sum(stockQty * costPrice) per item
  const items = await prisma.item.findMany({
    where: { organizationId: orgId, deletedAt: null },
    select: { stockQty: true, costPrice: true },
  });
  const totalStockValue = items.reduce(
    (sum, i) => sum + i.stockQty * Number(i.costPrice),
    0
  );

  // Monthly sales total and COGS (current month)
  const salesInvoices = await prisma.salesInvoice.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
      invoiceDate: { gte: currentMonth.start, lte: currentMonth.end },
    },
    include: {
      items: { include: { item: { select: { costPrice: true } } } },
    },
  });

  // Convert all sales to default currency
  const salesByCurrency = new Map<string, number>();
  for (const inv of salesInvoices) {
    const code = (inv as any).currencyCode ?? defaultCurrencyCode;
    const current = salesByCurrency.get(code) ?? 0;
    salesByCurrency.set(code, current + Number(inv.totalAmount));
  }
  let monthlySalesTotal = 0;
  await Promise.all(
    Array.from(salesByCurrency.entries()).map(async ([code, sum]) => {
      const converted = await convertAmountToCurrency(sum, code, defaultCurrencyCode);
      monthlySalesTotal += converted;
    })
  );
  let monthlyCogs = 0;
  for (const inv of salesInvoices) {
    for (const line of inv.items) {
      monthlyCogs += line.quantity * Number(line.item.costPrice);
    }
  }

  // Monthly expenses total (current month)
  const expenses = await prisma.expense.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
      expenseDate: { gte: currentMonth.start, lte: currentMonth.end },
    },
    select: { amount: true, currencyCode: true },
  });
  const expensesByCurrency = new Map<string, number>();
  for (const e of expenses) {
    const code = e.currencyCode ?? defaultCurrencyCode;
    const current = expensesByCurrency.get(code) ?? 0;
    expensesByCurrency.set(code, current + Number(e.amount));
  }
  let monthlyExpensesTotal = 0;
  await Promise.all(
    Array.from(expensesByCurrency.entries()).map(async ([code, sum]) => {
      const converted = await convertAmountToCurrency(sum, code, defaultCurrencyCode);
      monthlyExpensesTotal += converted;
    })
  );

  const monthlyRevenue = monthlySalesTotal;
  const netProfit = monthlyRevenue - monthlyCogs - monthlyExpensesTotal;

  // Revenue vs Expense for last 6 months (converted to default currency)
  const revenueExpenseByMonth: { month: string; revenue: number; expenses: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const { start, end, year, month } = getMonthStartEnd(-i);
    const [monthSales, monthExpenses] = await Promise.all([
      prisma.salesInvoice.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          invoiceDate: { gte: start, lte: end },
        },
        select: { totalAmount: true, currencyCode: true },
      }),
      prisma.expense.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          expenseDate: { gte: start, lte: end },
        },
        select: { amount: true, currencyCode: true },
      }),
    ]);

    const monthSalesByCurrency = new Map<string, number>();
    for (const inv of monthSales) {
      const code = inv.currencyCode ?? defaultCurrencyCode;
      const current = monthSalesByCurrency.get(code) ?? 0;
      monthSalesByCurrency.set(code, current + Number(inv.totalAmount));
    }
    const monthExpensesByCurrency = new Map<string, number>();
    for (const e of monthExpenses) {
      const code = e.currencyCode ?? defaultCurrencyCode;
      const current = monthExpensesByCurrency.get(code) ?? 0;
      monthExpensesByCurrency.set(code, current + Number(e.amount));
    }

    let salesSum = 0;
    await Promise.all(
      Array.from(monthSalesByCurrency.entries()).map(async ([code, sum]) => {
        const converted = await convertAmountToCurrency(sum, code, defaultCurrencyCode);
        salesSum += converted;
      })
    );

    let expenseSum = 0;
    await Promise.all(
      Array.from(monthExpensesByCurrency.entries()).map(async ([code, sum]) => {
        const converted = await convertAmountToCurrency(sum, code, defaultCurrencyCode);
        expenseSum += converted;
      })
    );
    const monthLabel = new Date(year, month - 1, 1).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
    revenueExpenseByMonth.push({
      month: monthLabel,
      revenue: Math.round(salesSum * 100) / 100,
      expenses: Math.round(expenseSum * 100) / 100,
    });
  }

  // Top selling items (current month by quantity)
  const topSellingRaw = await prisma.salesInvoiceItem.groupBy({
    by: ["itemId"],
    where: {
      salesInvoice: {
        organizationId: orgId,
        deletedAt: null,
        invoiceDate: { gte: currentMonth.start, lte: currentMonth.end },
      },
    },
    _sum: { total: true },
    _count: { id: true },
  });
  const itemIds = topSellingRaw.map((r) => r.itemId);
  const itemDetails = await prisma.item.findMany({
    where: { id: { in: itemIds }, organizationId: orgId, deletedAt: null },
    select: { id: true, name: true, sku: true },
  });
  const itemMap = new Map(itemDetails.map((i) => [i.id, i]));
  const topSellingItems = topSellingRaw
    .map((r) => ({
      itemId: r.itemId,
      name: itemMap.get(r.itemId)?.name ?? "Unknown",
      sku: itemMap.get(r.itemId)?.sku ?? "",
      totalRevenue: Number(r._sum.total ?? 0),
      lineCount: r._count.id,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);

  // Low stock: stockQty <= minStock (filter in JS since Prisma can't compare two columns)
  const allItemsForLowStock = await prisma.item.findMany({
    where: { organizationId: orgId, deletedAt: null },
    select: { id: true, name: true, sku: true, stockQty: true, minStock: true },
  });
  const lowStockItemsFiltered = allItemsForLowStock
    .filter((i) => i.stockQty <= i.minStock)
    .sort((a, b) => a.stockQty - b.stockQty)
    .slice(0, 10);

  // Outstanding receivables (sales invoices not fully paid)
  const salesUnpaid = await prisma.salesInvoice.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
      paymentStatus: { not: "PAID" },
    },
    select: { totalAmount: true, paidAmount: true, currencyCode: true },
  });
  const receivablesByCurrency = new Map<string, number>();
  for (const inv of salesUnpaid) {
    const code = inv.currencyCode ?? defaultCurrencyCode;
    const outstanding = Math.max(
      0,
      Number(inv.totalAmount) - Number(inv.paidAmount)
    );
    const current = receivablesByCurrency.get(code) ?? 0;
    receivablesByCurrency.set(code, current + outstanding);
  }
  let outstandingReceivablesCorrect = 0;
  await Promise.all(
    Array.from(receivablesByCurrency.entries()).map(async ([code, sum]) => {
      const converted = await convertAmountToCurrency(sum, code, defaultCurrencyCode);
      outstandingReceivablesCorrect += converted;
    })
  );

  // Outstanding payables
  const purchasesUnpaid = await prisma.purchaseInvoice.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
      paymentStatus: { not: "PAID" },
    },
    select: { totalAmount: true, paidAmount: true, currencyCode: true },
  });
  const payablesByCurrency = new Map<string, number>();
  for (const inv of purchasesUnpaid) {
    const code = inv.currencyCode ?? defaultCurrencyCode;
    const outstanding = Math.max(
      0,
      Number(inv.totalAmount) - Number(inv.paidAmount)
    );
    const current = payablesByCurrency.get(code) ?? 0;
    payablesByCurrency.set(code, current + outstanding);
  }
  let outstandingPayables = 0;
  await Promise.all(
    Array.from(payablesByCurrency.entries()).map(async ([code, sum]) => {
      const converted = await convertAmountToCurrency(sum, code, defaultCurrencyCode);
      outstandingPayables += converted;
    })
  );

  // Invoices due soon (next 7 days, not fully paid)
  const soonStart = new Date();
  soonStart.setHours(0, 0, 0, 0);
  const soonEnd = new Date(soonStart);
  soonEnd.setDate(soonEnd.getDate() + 7);

  const salesDueSoonRaw = await prisma.salesInvoice.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
      paymentStatus: { not: "PAID" },
      dueDate: { gte: soonStart, lte: soonEnd },
    },
    select: {
      id: true,
      invoiceNo: true,
      dueDate: true,
      totalAmount: true,
      paidAmount: true,
      currencyCode: true,
      client: { select: { name: true } },
    },
    orderBy: { dueDate: "asc" },
    take: 10,
  });

  const purchasesDueSoonRaw = await prisma.purchaseInvoice.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
      paymentStatus: { not: "PAID" },
      dueDate: { gte: soonStart, lte: soonEnd },
    },
    select: {
      id: true,
      invoiceNo: true,
      dueDate: true,
      totalAmount: true,
      paidAmount: true,
      currencyCode: true,
      supplier: { select: { name: true } },
    },
    orderBy: { dueDate: "asc" },
    take: 10,
  });

  const dueSoonReceivables = salesDueSoonRaw.map((inv) => ({
    id: inv.id,
    invoiceNo: inv.invoiceNo,
    name: inv.client.name,
    dueDate: inv.dueDate,
    outstanding:
      Math.max(0, Number(inv.totalAmount) - Number(inv.paidAmount)),
    currencyCode: inv.currencyCode ?? defaultCurrencyCode,
  }));

  const dueSoonPayables = purchasesDueSoonRaw.map((inv) => ({
    id: inv.id,
    invoiceNo: inv.invoiceNo,
    name: inv.supplier.name,
    dueDate: inv.dueDate,
    outstanding:
      Math.max(0, Number(inv.totalAmount) - Number(inv.paidAmount)),
    currencyCode: inv.currencyCode ?? defaultCurrencyCode,
  }));

  return {
    totalStockValue: Math.round(totalStockValue * 100) / 100,
    monthlySalesTotal: Math.round(monthlySalesTotal * 100) / 100,
    monthlyExpensesTotal: Math.round(monthlyExpensesTotal * 100) / 100,
    monthlyCogs: Math.round(monthlyCogs * 100) / 100,
    monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    revenueExpenseByMonth,
    topSellingItems,
    lowStockItems: lowStockItemsFiltered,
    outstandingReceivables: Math.round(outstandingReceivablesCorrect * 100) / 100,
    outstandingPayables: Math.round(outstandingPayables * 100) / 100,
    currentMonthLabel: new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString(
      "en-US",
      { month: "long", year: "numeric" }
    ),
    defaultCurrencyCode,
    dueSoonReceivables,
    dueSoonPayables,
  };
}
