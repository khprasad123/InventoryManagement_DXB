"use server";

import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

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
  const monthlySalesTotal = salesInvoices.reduce(
    (sum, inv) => sum + Number(inv.totalAmount),
    0
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
    select: { amount: true },
  });
  const monthlyExpensesTotal = expenses.reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  const monthlyRevenue = monthlySalesTotal;
  const netProfit = monthlyRevenue - monthlyCogs - monthlyExpensesTotal;

  // Revenue vs Expense for last 6 months
  const revenueExpenseByMonth: { month: string; revenue: number; expenses: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const { start, end, year, month } = getMonthStartEnd(-i);
    const [salesSum, expenseSum] = await Promise.all([
      prisma.salesInvoice
        .aggregate({
          where: {
            organizationId: orgId,
            deletedAt: null,
            invoiceDate: { gte: start, lte: end },
          },
          _sum: { totalAmount: true },
        })
        .then((r) => Number(r._sum.totalAmount ?? 0)),
      prisma.expense
        .aggregate({
          where: {
            organizationId: orgId,
            deletedAt: null,
            expenseDate: { gte: start, lte: end },
          },
          _sum: { amount: true },
        })
        .then((r) => Number(r._sum.amount ?? 0)),
    ]);
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
    select: { totalAmount: true, paidAmount: true },
  });
  const outstandingReceivablesCorrect = salesUnpaid.reduce(
    (sum, inv) => sum + Math.max(0, Number(inv.totalAmount) - Number(inv.paidAmount)),
    0
  );

  // Outstanding payables
  const purchasesUnpaid = await prisma.purchaseInvoice.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
      paymentStatus: { not: "PAID" },
    },
    select: { totalAmount: true, paidAmount: true },
  });
  const outstandingPayables = purchasesUnpaid.reduce(
    (sum, inv) => sum + Math.max(0, Number(inv.totalAmount) - Number(inv.paidAmount)),
    0
  );

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
  };
}
