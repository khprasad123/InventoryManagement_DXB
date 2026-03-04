import { prisma } from "@/lib/prisma";

export async function getDefaultCurrencyCodeForOrg(
  organizationId: string
): Promise<string> {
  const currency = await prisma.currency.findFirst({
    where: { organizationId, deletedAt: null, isDefault: true },
    select: { code: true },
  });
  return currency?.code ?? "AED";
}

export async function getOrganizationCurrencies(organizationId: string) {
  return prisma.currency.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { code: "asc" }],
  });
}

