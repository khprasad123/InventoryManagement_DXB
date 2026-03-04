import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

/** When IS_DEV=true, clear all DB data before seeding (dev only; never set in production). */
async function clearAllDataIfDev() {
  if (process.env.IS_DEV !== "true") return;

  console.log("IS_DEV=true: clearing all DB data before seed...");
  await prisma.auditLog.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.userOrganization.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.expense.deleteMany({});
  await prisma.clientPayment.deleteMany({});
  await prisma.supplierPayment.deleteMany({});
  await prisma.salesInvoiceItem.deleteMany({});
  await prisma.purchaseInvoiceItem.deleteMany({});
  await prisma.quotationItem.deleteMany({});
  await prisma.grnItem.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.salesInvoice.deleteMany({});
  await prisma.purchaseInvoice.deleteMany({});
  await prisma.quotation.deleteMany({});
  await prisma.grn.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.item.deleteMany({});
  await prisma.currency.deleteMany({});
  await prisma.expenseCategory.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.organization.deleteMany({});
  console.log("Cleared.");
}

async function main() {
  await clearAllDataIfDev();

  // Create default organization
  const org = await prisma.organization.upsert({
    where: { slug: "default" },
    update: {},
    create: {
      name: "Default Organization",
      slug: "default",
    },
  });

  // Create currencies: AED (default) and USD
  const [aedCurrency, usdCurrency] = await Promise.all([
    prisma.currency.upsert({
      where: {
        organizationId_code: { organizationId: org.id, code: "AED" },
      },
      update: {
        name: "UAE Dirham",
        symbol: "د.إ",
        isDefault: true,
      },
      create: {
        organizationId: org.id,
        code: "AED",
        name: "UAE Dirham",
        symbol: "د.إ",
        isDefault: true,
      },
    }),
    prisma.currency.upsert({
      where: {
        organizationId_code: { organizationId: org.id, code: "USD" },
      },
      update: {
        name: "US Dollar",
        symbol: "$",
      },
      create: {
        organizationId: org.id,
        code: "USD",
        name: "US Dollar",
        symbol: "$",
        isDefault: false,
      },
    }),
  ]);

  // Permissions (global codes; roles get assigned these)
  const permissionData = [
    { code: "manage_users", name: "Manage users", description: "Add, edit, remove org users" },
    { code: "manage_roles", name: "Manage roles", description: "Edit role permissions" },
    { code: "record_payments", name: "Record payments", description: "Record supplier/client payments" },
    { code: "adjust_stock", name: "Adjust stock", description: "Create stock adjustments" },
    { code: "manage_inventory", name: "Manage inventory", description: "Items, stock, GRN" },
    { code: "manage_suppliers", name: "Manage suppliers", description: "Suppliers and purchase invoices" },
    { code: "manage_clients", name: "Manage clients", description: "Clients, quotations, sales" },
    { code: "manage_purchases", name: "Manage purchases", description: "Purchase invoices, GRNs" },
    { code: "manage_sales", name: "Manage sales", description: "Sales invoices, quotations" },
    { code: "manage_expenses", name: "Manage expenses", description: "Expenses and categories" },
    { code: "view_reports", name: "View reports", description: "Access reports" },
    { code: "view_audit", name: "View audit log", description: "Access audit log" },
  ];
  const permissions: { id: string; code: string }[] = [];
  for (const p of permissionData) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name, description: p.description ?? undefined },
      create: p,
    });
    permissions.push(perm);
  }
  const permByCode = Object.fromEntries(permissions.map((p) => [p.code, p.id]));

  // Create roles for this organization: Admin, Inventory, Finance, Sales
  const [adminRole, inventoryRole, financeRole, salesRole] = await Promise.all([
    prisma.role.upsert({
      where: {
        name_organizationId: { name: "ADMIN", organizationId: org.id },
      },
      update: {},
      create: { name: "ADMIN", organizationId: org.id },
    }),
    prisma.role.upsert({
      where: {
        name_organizationId: { name: "INVENTORY", organizationId: org.id },
      },
      update: {},
      create: { name: "INVENTORY", organizationId: org.id },
    }),
    prisma.role.upsert({
      where: {
        name_organizationId: { name: "FINANCE", organizationId: org.id },
      },
      update: {},
      create: { name: "FINANCE", organizationId: org.id },
    }),
    prisma.role.upsert({
      where: {
        name_organizationId: { name: "SALES", organizationId: org.id },
      },
      update: {},
      create: { name: "SALES", organizationId: org.id },
    }),
  ]);

  // Assign permissions to roles (ADMIN = all; others = subset)
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

  await prisma.rolePermission.deleteMany({
    where: {
      roleId: { in: [adminRole.id, inventoryRole.id, financeRole.id, salesRole.id] },
    },
  });
  await prisma.rolePermission.createMany({
    data: [
      ...adminPerms,
      ...inventoryPerms,
      ...financePerms,
      ...salesPerms,
    ],
  });

  // Create admin user
  const passwordHash = await hash("admin123", 12);
  const user = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin User",
      passwordHash,
    },
  });

  // Link user to organization with ADMIN role and set as org super admin
  await prisma.userOrganization.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: org.id,
      },
    },
    update: { isSuperAdmin: true },
    create: {
      userId: user.id,
      organizationId: org.id,
      roleId: adminRole.id,
      isSuperAdmin: true,
    },
  });

  // Create default expense category for the org
  await prisma.expenseCategory.upsert({
    where: {
      organizationId_name: {
        organizationId: org.id,
        name: "General",
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: "General",
    },
  });

  console.log("Seed completed:");
  console.log("  - Organization: Default (slug: default)");
  console.log("  - User: admin@example.com / admin123");
  console.log("  - Roles: ADMIN, INVENTORY, FINANCE, SALES");
  console.log("  - Currencies: AED (default), USD");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
