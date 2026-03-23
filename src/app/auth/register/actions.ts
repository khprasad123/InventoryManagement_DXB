"use server";

import { randomBytes } from "crypto";
import { hash, compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { redirect } from "next/navigation";
import { put } from "@vercel/blob";

const registerSchema = z.object({
  name: z.string().min(1, "Your name is required"),
  companyName: z.string().min(1, "Company name is required").max(200),
  address: z.string().min(1, "Company address is required").max(500),
  phone: z.string().max(50).optional(),
  fax: z.string().max(50).optional(),
  website: z.string().max(200).optional(),
  taxRegistrationNo: z.string().max(100).optional(),
  bankDetails: z.string().max(500).optional(),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

function slugFromCompanyName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return base || "org";
}

export async function registerUser(formData: FormData) {
  if (process.env.IS_OWNER !== "true") {
    return { error: { _form: ["Registration is not enabled"] } };
  }

  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    companyName: formData.get("companyName"),
    address: formData.get("address"),
    phone: formData.get("phone") || undefined,
    fax: formData.get("fax") || undefined,
    website: formData.get("website") || undefined,
    taxRegistrationNo: formData.get("taxRegistrationNo") || undefined,
    bankDetails: formData.get("bankDetails") || undefined,
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const { name, companyName, address, phone, fax, website, taxRegistrationNo, bankDetails, email, password } =
    parsed.data;

  let logoUrl: string | null = null;
  let sealUrl: string | null = null;
  const logoFile = formData.get("logo") as File | null;
  const sealFile = formData.get("seal") as File | null;

  const existingUser = await prisma.user.findFirst({
    where: { email, deletedAt: null },
  });

  if (existingUser) {
    const validPassword = await compare(password, existingUser.passwordHash);
    if (!validPassword) {
      return { error: { email: ["This email is already registered. Enter your existing password to add a new organization."] } };
    }
  }

  let slug = slugFromCompanyName(companyName);
  const existingSlug = await prisma.organization.findFirst({
    where: { slug, deletedAt: null },
  });
  if (existingSlug) {
    slug = `${slug}-${randomBytes(4).toString("hex")}`;
  }

  const passwordHash = existingUser
    ? undefined
    : await hash(password, 12);

  // Create org (org details only)
  const org = await prisma.organization.create({
    data: {
      name: companyName.trim(),
      slug,
      logoUrl: null,
      phone: phone?.trim() || null,
      fax: fax?.trim() || null,
      website: website?.trim() || null,
    },
  });

  // Upload org logo
  if (logoFile && logoFile.size > 0 && logoFile.size <= MAX_SIZE && IMAGE_TYPES.includes(logoFile.type)) {
    const ext = logoFile.name.split(".").pop() || "png";
    const blob = await put(`org-${org.id}/logo/${Date.now()}.${ext}`, logoFile, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    logoUrl = blob.url;
    await prisma.organization.update({
      where: { id: org.id },
      data: { logoUrl },
    });
  }

  // Upload invoice seal
  if (sealFile && sealFile.size > 0 && sealFile.size <= MAX_SIZE && IMAGE_TYPES.includes(sealFile.type)) {
    const ext = sealFile.name.split(".").pop() || "png";
    const blob = await put(`org-${org.id}/seal/${Date.now()}.${ext}`, sealFile, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    sealUrl = blob.url;
  }

  // Create invoice settings (company info, bank, address, logo, stamp for invoicing)
  await prisma.invoiceSettings.create({
    data: {
      organizationId: org.id,
      companyName: companyName.trim(),
      address: address.trim(),
      phone: phone?.trim() || null,
      fax: fax?.trim() || null,
      website: website?.trim() || null,
      taxRegistrationNo: taxRegistrationNo?.trim() || null,
      bankDetails: bankDetails?.trim() || null,
      invoiceLogoUrl: logoUrl || null,
      sealUrl: sealUrl || null,
    },
  });

  await prisma.$transaction(async (tx) => {
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

    let user: { id: string };
    if (existingUser) {
      user = existingUser;
      // Optional: update name if provided and different
      if (name && name !== existingUser.name) {
        await tx.user.update({
          where: { id: existingUser.id },
          data: { name },
        });
      }
    } else {
      if (!passwordHash) throw new Error("Password required for new user");
      user = await tx.user.create({
        data: { name, email, passwordHash },
      });
    }

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
