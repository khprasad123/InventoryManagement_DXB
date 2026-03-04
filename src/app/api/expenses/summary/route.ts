import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/expenses/summary?year=2025&month=3
 * Returns monthly expense summary for the authenticated user's organization.
 * - total: sum of all expenses in the month
 * - byCategory: { categoryId, categoryName, total }
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = session.user.organizationId;
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  const yearNum = year ? parseInt(year, 10) : new Date().getFullYear();
  const monthNum = month ? parseInt(month, 10) : new Date().getMonth() + 1;

  if (Number.isNaN(yearNum) || Number.isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return NextResponse.json(
      { error: "Invalid year or month. Use year=YYYY and month=1-12" },
      { status: 400 }
    );
  }

  const start = new Date(yearNum, monthNum - 1, 1);
  const end = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

  const expenses = await prisma.expense.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
      expenseDate: { gte: start, lte: end },
    },
    include: { category: true },
  });

  const byCategory = new Map<
    string,
    { categoryId: string; categoryName: string; total: number }
  >();

  let total = 0;
  for (const e of expenses) {
    const amount = Number(e.amount);
    total += amount;
    const existing = byCategory.get(e.categoryId);
    if (existing) {
      existing.total += amount;
    } else {
      byCategory.set(e.categoryId, {
        categoryId: e.categoryId,
        categoryName: e.category.name,
        total: amount,
      });
    }
  }

  return NextResponse.json({
    year: yearNum,
    month: monthNum,
    total: Math.round(total * 100) / 100,
    byCategory: Array.from(byCategory.values()),
  });
}
