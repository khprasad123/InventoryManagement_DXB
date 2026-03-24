import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canUser, PERMISSIONS } from "@/lib/permissions";
import { buildCsv } from "@/lib/csv-export";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canUser(session.user, PERMISSIONS.SALES_READ)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId as string;
  const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";

  const invoices = await prisma.salesInvoice.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { invoiceNo: { contains: search, mode: "insensitive" } },
              { client: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { client: { select: { name: true } } },
    orderBy: { invoiceDate: "desc" },
  });

  const csv = buildCsv(
    [
      "Invoice No",
      "Invoice Date",
      "Due Date",
      "Client",
      "Currency",
      "Total Amount",
      "Paid Amount",
      "Balance",
      "Approval Status",
      "Payment Status",
    ],
    invoices.map((inv) => {
      const total = Number(inv.totalAmount);
      const paid = Number(inv.paidAmount ?? 0);
      return [
        inv.invoiceNo,
        new Date(inv.invoiceDate).toISOString().slice(0, 10),
        inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : "",
        inv.client.name,
        inv.currencyCode,
        total.toFixed(2),
        paid.toFixed(2),
        Math.max(0, total - paid).toFixed(2),
        inv.status,
        inv.paymentStatus,
      ];
    })
  );

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sales-export.csv"`,
    },
  });
}
