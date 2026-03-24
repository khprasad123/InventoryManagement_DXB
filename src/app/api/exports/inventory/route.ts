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
  if (!canUser(session.user, PERMISSIONS.INVENTORY_READ)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId as string;
  const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";
  const category = req.nextUrl.searchParams.get("category")?.trim() ?? "all";

  const items = await prisma.item.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
      ...(category !== "all" ? { category } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
  });

  const csv = buildCsv(
    ["SKU", "Name", "Category", "Unit", "Stock Qty", "Min Stock", "Cost", "Margin %"],
    items.map((i) => [
      i.sku,
      i.name,
      i.category ?? "",
      i.unit,
      i.stockQty,
      i.minStock,
      Number(i.defaultPurchaseCost).toFixed(2),
      Number(i.defaultMargin).toFixed(2),
    ])
  );

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inventory-export.csv"`,
    },
  });
}
