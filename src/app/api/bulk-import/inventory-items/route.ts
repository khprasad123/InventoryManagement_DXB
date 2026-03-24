import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canUser, PERMISSIONS } from "@/lib/permissions";
import {
  generateImportLogCsv,
  normalizeHeaderKey,
  parseCsvToRows,
  toIntOrNull,
  toNumberOrNull,
} from "@/lib/csv-import-utils";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

type ResultRow = {
  rowNumber: number;
  identifier: string;
  status: "SUCCESS" | "FAILED";
  message: string;
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canUser(session.user, PERMISSIONS.INVENTORY_CREATE) && !canUser(session.user, PERMISSIONS.INVENTORY_UPDATE)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId as string;
  const userId = session.user.id as string | undefined;

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "CSV file is required." }, { status: 400 });
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: "CSV file too large." }, { status: 400 });
  }

  const buf = await file.arrayBuffer();
  const csvText = Buffer.from(buf).toString("utf-8");
  const parsedRows = parseCsvToRows(csvText);
  if (parsedRows.length < 2) {
    return NextResponse.json({ error: "CSV must include a header row and at least 1 data row." }, { status: 400 });
  }

  const header = parsedRows[0].map(normalizeHeaderKey);
  const dataRows = parsedRows.slice(1);

  const getVal = (row: string[], key: string) => {
    const idx = header.indexOf(normalizeHeaderKey(key));
    if (idx === -1) return "";
    return row[idx] ?? "";
  };

  const results: ResultRow[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNumber = i + 2; // 1 = header

    const sku = String(getVal(row, "sku") ?? "").trim();
    const name = String(getVal(row, "name") ?? "").trim();
    const description = String(getVal(row, "description") ?? "").trim();
    const category = String(getVal(row, "category") ?? "").trim() || "General";
    const unit = String(getVal(row, "unit") ?? "").trim() || "pcs";
    const defaultPurchaseCost = toNumberOrNull(getVal(row, "defaultPurchaseCost"));
    const defaultMargin = toNumberOrNull(getVal(row, "defaultMargin"));
    const minStock = toIntOrNull(getVal(row, "minStock"));

    const identifier = sku || `row-${rowNumber}`;

    try {
      if (!sku) throw new Error("Missing required column: sku");
      if (!name) throw new Error("Missing required column: name");
      if (defaultPurchaseCost === null) throw new Error("Invalid defaultPurchaseCost (number)");
      if (defaultMargin === null) throw new Error("Invalid defaultMargin (number)");
      if (minStock === null) throw new Error("Invalid minStock (integer)");

      const existing = await prisma.item.findFirst({
        where: { organizationId: orgId, sku, deletedAt: null },
      });

      if (existing) {
        await prisma.item.update({
          where: { id: existing.id },
          data: {
            name,
            description: description || null,
            category: category || "General",
            unit: unit || "pcs",
            defaultPurchaseCost,
            defaultMargin,
            minStock,
            updatedById: userId ?? undefined,
          },
        });

        results.push({
          rowNumber,
          identifier,
          status: "SUCCESS",
          message: "Updated item",
        });
      } else {
        await prisma.item.create({
          data: {
            organizationId: orgId,
            sku,
            name,
            description: description || null,
            category,
            unit,
            defaultPurchaseCost,
            defaultMargin,
            minStock,
            stockQty: 0,
            createdById: userId ?? undefined,
            updatedById: userId ?? undefined,
          },
        });

        results.push({
          rowNumber,
          identifier,
          status: "SUCCESS",
          message: "Created item",
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({
        rowNumber,
        identifier,
        status: "FAILED",
        message: msg || "Row failed",
      });
    }
  }

  const logCsv = generateImportLogCsv(
    results.map((r) => ({
      rowNumber: r.rowNumber,
      identifier: r.identifier,
      status: r.status,
      message: r.message,
    }))
  );

  return NextResponse.json({
    results,
    logCsv,
    summary: {
      total: results.length,
      success: results.filter((r) => r.status === "SUCCESS").length,
      failed: results.filter((r) => r.status === "FAILED").length,
    },
  });
}

