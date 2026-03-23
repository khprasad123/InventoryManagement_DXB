"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getOrganizationId } from "@/lib/auth-utils";
import { redirect } from "next/navigation";
import { isSuperAdmin } from "@/lib/permissions";

export async function getOrgPlan() {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await import("@/lib/auth-utils").then((m) => m.getCurrentUser());
  if (!isSuperAdmin(user)) redirect("/settings");

  return prisma.orgPlan.findUnique({
    where: { organizationId: orgId },
  });
}

const updatePlanSchema = z.object({
  monthlyAmount: z.coerce.number().min(0, "Must be ≥ 0"),
  maxUsers: z.coerce.number().int().min(1, "Must be ≥ 1"),
  contractStartDate: z.string().min(1, "Start date is required"),
  contractEndDate: z.string().optional(),
});

export async function updateOrgPlan(formData: FormData) {
  const orgId = await getOrganizationId();
  if (!orgId) redirect("/login");

  const user = await import("@/lib/auth-utils").then((m) => m.getCurrentUser());
  if (!isSuperAdmin(user)) {
    return { error: "Only the organization super admin can update the plan." };
  }

  const parsed = updatePlanSchema.safeParse({
    monthlyAmount: formData.get("monthlyAmount"),
    maxUsers: formData.get("maxUsers"),
    contractStartDate: formData.get("contractStartDate"),
    contractEndDate: formData.get("contractEndDate") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const startDate = new Date(parsed.data.contractStartDate);
  const endDate = parsed.data.contractEndDate ? new Date(parsed.data.contractEndDate) : null;

  await prisma.orgPlan.upsert({
    where: { organizationId: orgId },
    create: {
      organizationId: orgId,
      monthlyAmount: parsed.data.monthlyAmount,
      maxUsers: parsed.data.maxUsers,
      contractStartDate: startDate,
      contractEndDate: endDate,
    },
    update: {
      monthlyAmount: parsed.data.monthlyAmount,
      maxUsers: parsed.data.maxUsers,
      contractStartDate: startDate,
      contractEndDate: endDate,
    },
  });

  revalidatePath("/settings/plan");
  revalidatePath("/settings/org");
  return { success: true };
}
