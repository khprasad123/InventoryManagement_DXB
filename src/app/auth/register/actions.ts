"use server";

import { randomBytes } from "crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { redirect } from "next/navigation";
const registerSchema = z.object({
  name: z.string().min(1, "Your name is required"),
  companyName: z.string().min(1, "Company name is required").max(200),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

function slugFromCompanyName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return base || "org";
}

export async function registerUser(formData: FormData) {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    companyName: formData.get("companyName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { name, companyName, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    return { error: { email: ["Email already registered"] } };
  }

  let slug = slugFromCompanyName(companyName);
  const existingSlug = await prisma.organization.findFirst({
    where: { slug, deletedAt: null },
  });
  if (existingSlug) {
    slug = `${slug}-${randomBytes(4).toString("hex")}`;
  }

  const passwordHash = await hash(password, 12);

  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: {
        name: companyName.trim(),
        slug,
      },
    });

    const [adminRole, inventoryRole, financeRole, salesRole] = await Promise.all([
      tx.role.create({ data: { name: "ADMIN", organizationId: org.id } }),
      tx.role.create({ data: { name: "INVENTORY", organizationId: org.id } }),
      tx.role.create({ data: { name: "FINANCE", organizationId: org.id } }),
      tx.role.create({ data: { name: "SALES", organizationId: org.id } }),
    ]);

    // Assign same permissions as seed: ADMIN = all, others = subset
    const permissions = await tx.permission.findMany({
      select: { id: true, code: true },
      orderBy: { code: "asc" },
    });
    const permByCode = Object.fromEntries(permissions.map((p) => [p.code, p.id]));
    const allPermIds = permissions.map((p) => p.id);
    const adminPerms = allPermIds.map((permissionId) => ({ roleId: adminRole.id, permissionId }));
    const inventoryPerms = [
      permByCode.adjust_stock,
      permByCode.manage_inventory,
      permByCode.manage_suppliers,
      permByCode.manage_purchases,
      permByCode.view_reports,
      permByCode.view_audit,
    ]
      .filter(Boolean)
      .map((permissionId) => ({ roleId: inventoryRole.id, permissionId: permissionId! }));
    const financePerms = [
      permByCode.record_payments,
      permByCode.manage_expenses,
      permByCode.manage_purchases,
      permByCode.view_reports,
      permByCode.view_audit,
    ]
      .filter(Boolean)
      .map((permissionId) => ({ roleId: financeRole.id, permissionId: permissionId! }));
    const salesPerms = [
      permByCode.manage_sales,
      permByCode.manage_clients,
      permByCode.manage_inventory,
      permByCode.view_reports,
      permByCode.view_audit,
    ]
      .filter(Boolean)
      .map((permissionId) => ({ roleId: salesRole.id, permissionId: permissionId! }));

    await tx.rolePermission.createMany({
      data: [...adminPerms, ...inventoryPerms, ...financePerms, ...salesPerms],
    });

    await Promise.all([
      tx.currency.create({
        data: {
          organizationId: org.id,
          code: "AED",
          name: "UAE Dirham",
          symbol: "د.إ",
          isDefault: true,
        },
      }),
      tx.currency.create({
        data: {
          organizationId: org.id,
          code: "USD",
          name: "US Dollar",
          symbol: "$",
          isDefault: false,
        },
      }),
    ]);

    await tx.expenseCategory.create({
      data: { organizationId: org.id, name: "General" },
    });

    const user = await tx.user.create({
      data: { name, email, passwordHash },
    });

    await tx.userOrganization.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        roleId: adminRole.id,
        isSuperAdmin: true,
      },
    });
  });

  redirect("/login?registered=1");
}
