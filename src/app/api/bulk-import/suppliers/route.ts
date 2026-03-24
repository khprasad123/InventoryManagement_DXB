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
  if (!canUser(session.user, PERMISSIONS.SUPPLIERS_CREATE) && !canUser(session.user, PERMISSIONS.SUPPLIERS_UPDATE)) {
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
    const rowNumber = i + 2;

    const name = String(getVal(row, "name") ?? "").trim();
    const contactName = String(getVal(row, "contactName") ?? "").trim();
    const emailRaw = String(getVal(row, "email") ?? "").trim();
    const email = emailRaw ? emailRaw.toLowerCase() : "";
    const phone = String(getVal(row, "phone") ?? "").trim();
    const address = String(getVal(row, "address") ?? "").trim();
    const paymentTerms = String(getVal(row, "paymentTerms") ?? "").trim();
    const taxNumber = String(getVal(row, "taxNumber") ?? "").trim();
    const defaultPaymentTerms = toIntOrNull(getVal(row, "defaultPaymentTerms"));
    const creditLimit = toNumberOrNull(getVal(row, "creditLimit"));

    const identifier = email || phone || name || `row-${rowNumber}`;

    try {
      if (!name) throw new Error("Missing required column: name");

      const whereBase = { organizationId: orgId, deletedAt: null as any };

      const whereMatch: any = (() => {
        if (email) return { email: { equals: email, mode: "insensitive" } as any };
        if (phone) return { phone };
        return { name: { equals: name, mode: "insensitive" } as any };
      })();

      const existing = await prisma.supplier.findFirst({
        where: { ...whereBase, ...whereMatch },
      });

      if (existing) {
        await prisma.supplier.update({
          where: { id: existing.id },
          data: {
            name,
            contactName: contactName || null,
            email: email || null,
            phone: phone || null,
            address: address || null,
            paymentTerms: paymentTerms || null,
            taxNumber: taxNumber || null,
            defaultPaymentTerms: defaultPaymentTerms ?? null,
            creditLimit: creditLimit ?? null,
            updatedById: userId ?? undefined,
          },
        });

        results.push({ rowNumber, identifier, status: "SUCCESS", message: "Updated supplier" });
      } else {
        await prisma.supplier.create({
          data: {
            organizationId: orgId,
            name,
            contactName: contactName || null,
            email: email || null,
            phone: phone || null,
            address: address || null,
            paymentTerms: paymentTerms || null,
            taxNumber: taxNumber || null,
            defaultPaymentTerms: defaultPaymentTerms ?? null,
            creditLimit: creditLimit ?? null,
            createdById: userId ?? undefined,
            updatedById: userId ?? undefined,
          },
        });

        results.push({ rowNumber, identifier, status: "SUCCESS", message: "Created supplier" });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.push({ rowNumber, identifier, status: "FAILED", message: msg || "Row failed" });
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

