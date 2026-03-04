import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type AgingBuckets = {
  current: number;
  "1_30": number;
  "31_60": number;
  "61_90": number;
  over_90: number;
};

function emptyBuckets(): AgingBuckets {
  return {
    current: 0,
    "1_30": 0,
    "31_60": 0,
    "61_90": 0,
    over_90: 0,
  };
}

function addToBucket(buckets: AgingBuckets, daysOverdue: number, amount: number) {
  if (daysOverdue <= 0) {
    buckets.current += amount;
  } else if (daysOverdue <= 30) {
    buckets["1_30"] += amount;
  } else if (daysOverdue <= 60) {
    buckets["31_60"] += amount;
  } else if (daysOverdue <= 90) {
    buckets["61_90"] += amount;
  } else {
    buckets.over_90 += amount;
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orgId = session.user.organizationId;
  const { searchParams } = new URL(request.url);
  const asOfParam = searchParams.get("asOf");
  const asOf = asOfParam ? new Date(asOfParam) : new Date();

  if (Number.isNaN(asOf.getTime())) {
    return NextResponse.json(
      { error: "Invalid asOf date. Use YYYY-MM-DD." },
      { status: 400 }
    );
  }

  const asOfStartOfDay = new Date(
    asOf.getFullYear(),
    asOf.getMonth(),
    asOf.getDate()
  );

  const [sales, purchases] = await Promise.all([
    prisma.salesInvoice.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        paymentStatus: { not: "PAID" },
      },
      select: {
        totalAmount: true,
        paidAmount: true,
        dueDate: true,
      },
    }),
    prisma.purchaseInvoice.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        paymentStatus: { not: "PAID" },
      },
      select: {
        totalAmount: true,
        paidAmount: true,
        dueDate: true,
      },
    }),
  ]);

  const ar: AgingBuckets = emptyBuckets();
  const ap: AgingBuckets = emptyBuckets();

  for (const inv of sales) {
    const balance =
      Number(inv.totalAmount) - Number(inv.paidAmount ?? 0);
    if (balance <= 0) continue;

    const due = inv.dueDate ? new Date(inv.dueDate) : asOfStartOfDay;
    const diffMs = asOfStartOfDay.getTime() - due.getTime();
    const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    addToBucket(ar, daysOverdue, balance);
  }

  for (const inv of purchases) {
    const balance =
      Number(inv.totalAmount) - Number(inv.paidAmount ?? 0);
    if (balance <= 0) continue;

    const due = inv.dueDate ? new Date(inv.dueDate) : asOfStartOfDay;
    const diffMs = asOfStartOfDay.getTime() - due.getTime();
    const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    addToBucket(ap, daysOverdue, balance);
  }

  const roundBuckets = (b: AgingBuckets): AgingBuckets => ({
    current: Math.round(b.current * 100) / 100,
    "1_30": Math.round(b["1_30"] * 100) / 100,
    "31_60": Math.round(b["31_60"] * 100) / 100,
    "61_90": Math.round(b["61_90"] * 100) / 100,
    over_90: Math.round(b.over_90 * 100) / 100,
  });

  return NextResponse.json({
    asOf: asOfStartOfDay.toISOString().slice(0, 10),
    ar: roundBuckets(ar),
    ap: roundBuckets(ap),
  });
}

