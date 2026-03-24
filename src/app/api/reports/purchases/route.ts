import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { canUser, PERMISSIONS } from "@/lib/permissions";
import { getPurchasesReportData } from "@/app/(dashboard)/reports/actions";
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
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const format = (searchParams.get("format") ?? "json").toLowerCase();
  const data = await getPurchasesReportData({ from, to });

  if (format === "xlsx") {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Invoice No", "Date", "Supplier", "Payment Status", "Currency", "Total", "Outstanding", `Total (${data.currencyCode})`, `Outstanding (${data.currencyCode})`],
      ...data.rows.map((r) => [
        r.invoiceNo,
        r.invoiceDate,
        r.supplierName,
        r.paymentStatus,
        r.currencyCode,
        r.total.toFixed(2),
        r.outstanding.toFixed(2),
        r.totalBase.toFixed(2),
        r.outstandingBase.toFixed(2),
      ]),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchases");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="purchases-report-${data.filters.from}-to-${data.filters.to}.xlsx"`,
      },
    });
  }

  if (format === "csv") {
    const csv = toCsv(
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
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="purchases-report-${data.filters.from}-to-${data.filters.to}.csv"`,
      },
    });
  }

  return NextResponse.json(data);
}
