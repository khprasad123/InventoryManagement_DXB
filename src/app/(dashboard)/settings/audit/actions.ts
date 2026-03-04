"use server";

import { prisma } from "@/lib/prisma";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";

const PAGE_SIZE = 50;

export type AuditLogFilters = {
  from?: string; // ISO date
  to?: string;
  action?: string;
  entityType?: string;
  userId?: string;
  page?: number;
};

export async function getAuditLogs(filters: AuditLogFilters = {}) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const page = Math.max(1, filters.page ?? 1);
  const from = filters.from ? new Date(filters.from) : undefined;
  const to = filters.to ? new Date(filters.to) : undefined;
  if (to) to.setHours(23, 59, 59, 999);

  const where: {
    organizationId: string;
    createdAt?: { gte?: Date; lte?: Date };
    action?: string;
    entityType?: string | null;
    userId?: string | null;
  } = { organizationId: orgId };

  if (from) where.createdAt = { ...where.createdAt, gte: from };
  if (to) where.createdAt = { ...where.createdAt, lte: to };
  if (filters.action) where.action = filters.action;
  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.userId) where.userId = filters.userId;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    totalPages: Math.ceil(total / PAGE_SIZE),
    currentPage: page,
    pageSize: PAGE_SIZE,
  };
}

/** Get distinct action values for filter dropdown */
export async function getAuditActions() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const rows = await prisma.auditLog.findMany({
    where: { organizationId: orgId },
    select: { action: true },
    distinct: ["action"],
    orderBy: { action: "asc" },
  });
  return rows.map((r) => r.action);
}

/** Get distinct entity types for filter dropdown */
export async function getAuditEntityTypes() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const rows = await prisma.auditLog.findMany({
    where: { organizationId: orgId, entityType: { not: null } },
    select: { entityType: true },
    distinct: ["entityType"],
    orderBy: { entityType: "asc" },
  });
  return rows.map((r) => r.entityType).filter(Boolean) as string[];
}
