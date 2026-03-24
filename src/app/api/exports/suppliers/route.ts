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
  if (!canUser(session.user, PERMISSIONS.SUPPLIERS_READ)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const orgId = session.user.organizationId as string;
  const search = req.nextUrl.searchParams.get("search")?.trim() ?? "";

  const suppliers = await prisma.supplier.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { contactName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
  });

  const csv = buildCsv(
    [
      "Name",
      "Contact Name",
      "Email",
      "Phone",
      "Address",
      "Payment Terms",
      "Credit Limit",
    ],
    suppliers.map((s) => [
      s.name,
      s.contactName ?? "",
      s.email ?? "",
      s.phone ?? "",
      s.address ?? "",
      s.defaultPaymentTerms ?? "",
      s.creditLimit != null ? Number(s.creditLimit).toFixed(2) : "",
    ])
  );

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="suppliers-export.csv"`,
    },
  });
}
