import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/auth-utils";

interface Params {
  params: { id: string };
}

export async function GET(_req: Request, { params }: Params) {
  const orgId = await getOrganizationId();
  if (!orgId) {
    return NextResponse.redirect(new URL("/login", _req.url));
  }

  const doc = await prisma.document.findFirst({
    where: {
      id: params.id,
      organizationId: orgId,
      deletedAt: null,
    },
  });

  if (!doc) {
    return new NextResponse("Not found", { status: 404 });
  }

  return NextResponse.redirect(doc.fileUrl);
}

