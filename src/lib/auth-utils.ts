import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user ?? null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function getOrganizationId(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.organizationId ?? null;
}

/** Get the current org's timezone for date display. DB stores UTC. */
export async function getOrgTimezone(): Promise<string> {
  const orgId = await getOrganizationId();
  if (!orgId) return "UTC";
  const org = await prisma.organization.findFirst({
    where: { id: orgId, deletedAt: null },
    select: { timezone: true },
  });
  return org?.timezone ?? "UTC";
}
