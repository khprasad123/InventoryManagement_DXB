"use server";

import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { getDefaultCurrencyCodeForOrg } from "@/lib/currency";
import { convertAmountToCurrency } from "@/lib/fx";
import { getAllowedWidgets, type DashboardWidgetId } from "./widgets";
import { canUser, PERMISSIONS } from "@/lib/permissions";

function getMonthStartEnd(monthOffset: number = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + monthOffset);
  const year = d.getFullYear();
  const month = d.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { start, end, year, month: month + 1 };
}

type SessionUser = {
  role?: string;
  permissions?: string[];
  isSuperAdmin?: boolean;
} | null;

type DueSoonRow = {
  id: string;
  invoiceNo: string;
  name: string;
  dueDate: Date | null;
  outstanding: number;
  currencyCode: string;
};

type ApprovalRow = {
  id: string;
  number: string;
  party: string;
  date: Date;
  amount: number;
  href: string;
};

export async function getDashboardData(user: SessionUser) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const allowedWidgets = getAllowedWidgets(user);
  const has = (id: DashboardWidgetId) => allowedWidgets.includes(id);

  const now = new Date();
  const currentMonth = getMonthStartEnd(0);
  const defaultCurrencyCode = await getDefaultCurrencyCodeForOrg(orgId);
  const currentMonthLabel = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric" }
  );

  let totalStockValue = 0;
  let lowStockItemsFiltered: Array<{ id: string; name: string; sku: string; stockQty: number; minStock: number }> = [];
  let highValueItems: Array<{ id: string; name: string; sku: string; stockValue: number }> = [];
  if (has("kpi_stock_value") || has("low_stock_items") || has("high_value_items")) {
    const items = await prisma.item.findMany({
      where: { organizationId: orgId, deletedAt: null },
      select: { id: true, name: true, sku: true, stockQty: true, minStock: true, defaultPurchaseCost: true },
    });
    totalStockValue = items.reduce((sum, i) => sum + i.stockQty * Number(i.defaultPurchaseCost), 0);
    lowStockItemsFiltered = items
      .filter((i) => i.stockQty <= i.minStock)
      .sort((a, b) => a.stockQty - b.stockQty)
      .slice(0, 10)
      .map((i) => ({ id: i.id, name: i.name, sku: i.sku, stockQty: i.stockQty, minStock: i.minStock }));
    highValueItems = items
      .map((i) => ({ id: i.id, name: i.name, sku: i.sku, stockValue: i.stockQty * Number(i.defaultPurchaseCost) }))
      .sort((a, b) => b.stockValue - a.stockValue)
      .slice(0, 10);
  }

  let monthlySalesTotal = 0;
  let monthlyCogs = 0;
  let topSellingItems: Array<{ itemId: string; name: string; sku: string; totalRevenue: number; lineCount: number }> = [];
  if (has("kpi_monthly_sales") || has("kpi_net_profit") || has("profit_breakdown") || has("top_selling_items") || has("monthly_progress")) {
    const salesInvoices = await prisma.salesInvoice.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        invoiceDate: { gte: currentMonth.start, lte: currentMonth.end },
      },
      include: {
        items: { include: { item: { select: { defaultPurchaseCost: true } } } },
      },
    });

    const salesByCurrency = new Map<string, number>();
    for (const inv of salesInvoices) {
      const code = inv.currencyCode ?? defaultCurrencyCode;
      const current = salesByCurrency.get(code) ?? 0;
      salesByCurrency.set(code, current + Number(inv.totalAmount));
    }
    await Promise.all(
      Array.from(salesByCurrency.entries()).map(async ([code, sum]) => {
        const converted = await convertAmountToCurrency(sum, code, defaultCurrencyCode);
        monthlySalesTotal += converted;
      })
    );
    for (const inv of salesInvoices) {
      for (const line of inv.items) {
        monthlyCogs += line.quantity * Number(line.item.defaultPurchaseCost);
      }
    }

    if (has("top_selling_items")) {
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
      topSellingItems = topSellingRaw
        .map((r) => ({
          itemId: r.itemId,
          name: itemMap.get(r.itemId)?.name ?? "Unknown",
          sku: itemMap.get(r.itemId)?.sku ?? "",
          totalRevenue: Number(r._sum.total ?? 0),
          lineCount: r._count.id,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10);
    }
  }

  let monthlyExpensesTotal = 0;
  if (has("kpi_monthly_expenses") || has("kpi_net_profit") || has("profit_breakdown") || has("monthly_progress")) {
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
    await Promise.all(
      Array.from(expensesByCurrency.entries()).map(async ([code, sum]) => {
        const converted = await convertAmountToCurrency(sum, code, defaultCurrencyCode);
        monthlyExpensesTotal += converted;
      })
    );
  }

  const monthlyRevenue = monthlySalesTotal;
  const netProfit = monthlyRevenue - monthlyCogs - monthlyExpensesTotal;

  const revenueExpenseByMonth: { month: string; revenue: number; expenses: number }[] = [];
  if (has("revenue_expense_chart") || has("monthly_progress")) {
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
  }

  let outstandingReceivablesCorrect = 0;
  let outstandingPayables = 0;
  if (has("outstanding_summary") || has("due_soon_receivables") || has("due_soon_payables")) {
    const [salesUnpaid, purchasesUnpaid] = await Promise.all([
      prisma.salesInvoice.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          paymentStatus: { not: "PAID" },
        },
        select: { totalAmount: true, paidAmount: true, currencyCode: true },
      }),
      prisma.purchaseInvoice.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
          paymentStatus: { not: "PAID" },
        },
        select: { totalAmount: true, paidAmount: true, currencyCode: true },
      }),
    ]);

    const receivablesByCurrency = new Map<string, number>();
    for (const inv of salesUnpaid) {
      const code = inv.currencyCode ?? defaultCurrencyCode;
      const outstanding = Math.max(0, Number(inv.totalAmount) - Number(inv.paidAmount));
      const current = receivablesByCurrency.get(code) ?? 0;
      receivablesByCurrency.set(code, current + outstanding);
    }
    await Promise.all(
      Array.from(receivablesByCurrency.entries()).map(async ([code, sum]) => {
        const converted = await convertAmountToCurrency(sum, code, defaultCurrencyCode);
        outstandingReceivablesCorrect += converted;
      })
    );

    const payablesByCurrency = new Map<string, number>();
    for (const inv of purchasesUnpaid) {
      const code = inv.currencyCode ?? defaultCurrencyCode;
      const outstanding = Math.max(0, Number(inv.totalAmount) - Number(inv.paidAmount));
      const current = payablesByCurrency.get(code) ?? 0;
      payablesByCurrency.set(code, current + outstanding);
    }
    await Promise.all(
      Array.from(payablesByCurrency.entries()).map(async ([code, sum]) => {
        const converted = await convertAmountToCurrency(sum, code, defaultCurrencyCode);
        outstandingPayables += converted;
      })
    );
  }

  // Invoices due soon (next 7 days, not fully paid)
  const soonStart = new Date();
  soonStart.setHours(0, 0, 0, 0);
  const soonEnd = new Date(soonStart);
  soonEnd.setDate(soonEnd.getDate() + 7);

  let dueSoonReceivables: DueSoonRow[] = [];
  let dueSoonPayables: DueSoonRow[] = [];
  if (has("due_soon_receivables") || has("due_soon_payables")) {
    const [salesDueSoonRaw, purchasesDueSoonRaw] = await Promise.all([
      has("due_soon_receivables")
        ? prisma.salesInvoice.findMany({
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
          })
        : Promise.resolve([]),
      has("due_soon_payables")
        ? prisma.purchaseInvoice.findMany({
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
          })
        : Promise.resolve([]),
    ]);

    dueSoonReceivables = salesDueSoonRaw.map((inv) => ({
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      name: inv.client.name,
      dueDate: inv.dueDate,
      outstanding: Math.max(0, Number(inv.totalAmount) - Number(inv.paidAmount)),
      currencyCode: inv.currencyCode ?? defaultCurrencyCode,
    }));

    dueSoonPayables = purchasesDueSoonRaw.map((inv) => ({
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      name: inv.supplier.name,
      dueDate: inv.dueDate,
      outstanding: Math.max(0, Number(inv.totalAmount) - Number(inv.paidAmount)),
      currencyCode: inv.currencyCode ?? defaultCurrencyCode,
    }));
  }

  let inventoryMovement = { inQty: 0, outQty: 0, adjustmentQty: 0 };
  if (has("inventory_movement")) {
    const moves = await prisma.stockMovement.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        createdAt: { gte: currentMonth.start, lte: currentMonth.end },
      },
      select: { type: true, quantity: true },
    });
    inventoryMovement = moves.reduce(
      (acc, m) => {
        if (m.type === "IN") acc.inQty += m.quantity;
        else if (m.type === "OUT") acc.outQty += m.quantity;
        else acc.adjustmentQty += m.quantity;
        return acc;
      },
      { inQty: 0, outQty: 0, adjustmentQty: 0 }
    );
  }

  let approvalSummary = {
    purchaseRequests: 0,
    quotations: 0,
    salesInvoices: 0,
  };
  let approvalItems: {
    purchaseRequests: ApprovalRow[];
    quotations: ApprovalRow[];
    salesInvoices: ApprovalRow[];
  } = {
    purchaseRequests: [],
    quotations: [],
    salesInvoices: [],
  };

  if (has("approvals_purchase_requests") || has("approvals_quotations") || has("approvals_sales_invoices")) {
    if (canUser(user, PERMISSIONS.PURCHASES_APPROVE) || canUser(user, PERMISSIONS.APPROVE_PURCHASE_REQUEST)) {
      const [count, rows] = await Promise.all([
        prisma.purchaseRequest.count({
          where: { organizationId: orgId, deletedAt: null, status: "PENDING_APPROVAL" },
        }),
        prisma.purchaseRequest.findMany({
          where: { organizationId: orgId, deletedAt: null, status: "PENDING_APPROVAL" },
          include: { items: true },
          orderBy: { createdAt: "asc" },
          take: 5,
        }),
      ]);
      approvalSummary.purchaseRequests = count;
      approvalItems.purchaseRequests = rows.map((r) => ({
        id: r.id,
        number: r.prNo,
        party: "Internal",
        date: r.createdAt,
        amount: r.items.reduce((sum, i) => sum + Number(i.quantity), 0),
        href: `/purchases/purchase-requests/${r.id}`,
      }));
    }

    if (canUser(user, PERMISSIONS.APPROVE_QUOTATION)) {
      const [qCount, qRows, iCount, iRows] = await Promise.all([
        prisma.quotation.count({
          where: { organizationId: orgId, deletedAt: null, status: "PENDING_APPROVAL" },
        }),
        prisma.quotation.findMany({
          where: { organizationId: orgId, deletedAt: null, status: "PENDING_APPROVAL" },
          include: { client: { select: { name: true } } },
          orderBy: { quotationDate: "asc" },
          take: 5,
        }),
        prisma.salesInvoice.count({
          where: { organizationId: orgId, deletedAt: null, status: "PENDING_APPROVAL" },
        }),
        prisma.salesInvoice.findMany({
          where: { organizationId: orgId, deletedAt: null, status: "PENDING_APPROVAL" },
          include: { client: { select: { name: true } } },
          orderBy: { invoiceDate: "asc" },
          take: 5,
        }),
      ]);

      approvalSummary.quotations = qCount;
      approvalSummary.salesInvoices = iCount;
      approvalItems.quotations = qRows.map((r) => ({
        id: r.id,
        number: r.quotationNo,
        party: r.client.name,
        date: r.quotationDate,
        amount: Number(r.totalAmount),
        href: `/sales/quotations/${r.id}`,
      }));
      approvalItems.salesInvoices = iRows.map((r) => ({
        id: r.id,
        number: r.invoiceNo,
        party: r.client.name,
        date: r.invoiceDate,
        amount: Number(r.totalAmount),
        href: `/sales/${r.id}`,
      }));
    }
  }

  const monthlyProgress = {
    revenueVsExpenseRatio:
      monthlyExpensesTotal > 0 ? Math.round((monthlyRevenue / monthlyExpensesTotal) * 100) / 100 : monthlyRevenue > 0 ? 999 : 0,
    netMarginPercent:
      monthlyRevenue > 0 ? Math.round((netProfit / monthlyRevenue) * 10000) / 100 : 0,
  };

  return {
    allowedWidgets,
    approvalSummary,
    approvalItems,
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
    currentMonthLabel,
    defaultCurrencyCode,
    dueSoonReceivables,
    dueSoonPayables,
    highValueItems,
    inventoryMovement,
    monthlyProgress,
  };
}
