import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canUser, PERMISSIONS } from "@/lib/permissions";
import { getReportsData } from "@/app/(dashboard)/reports/actions";
import * as XLSX from "xlsx";

function toCsv(headers: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [headers.map(esc).join(","), ...rows.map((r) => r.map(esc).join(","))].join("\n");
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canUser(session.user, PERMISSIONS.VIEW_REPORTS)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const format = (searchParams.get("format") ?? "json").toLowerCase();
  const data = await getReportsData({});

  const payload = {
    currencyCode: data.currencyCode,
    inventoryTotalValue: data.summary.inventoryTotalValue,
    rows: data.inventoryRows,
  };

  if (format === "xlsx") {
    const ws = XLSX.utils.aoa_to_sheet([
      ["SKU", "Item", "Stock Qty", "Cost", "Stock Value", "Currency"],
      ...payload.rows.map((r) => [r.sku, r.name, r.stockQty, r.cost.toFixed(2), r.stockValue.toFixed(2), payload.currencyCode]),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventory");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="inventory-valuation.xlsx"`,
      },
    });
  }

  if (format === "csv") {
    const csv = toCsv(
      ["SKU", "Item", "Stock Qty", "Cost", "Stock Value", "Currency"],
      payload.rows.map((r) => [r.sku, r.name, r.stockQty, r.cost.toFixed(2), r.stockValue.toFixed(2), payload.currencyCode])
    );
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="inventory-valuation.csv"`,
      },
    });
  }

  return NextResponse.json(payload);
}
