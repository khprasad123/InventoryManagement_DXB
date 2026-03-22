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
  await prisma.salesInvoice.deleteMany({});
  await prisma.salesOrderItem.deleteMany({});
  await prisma.salesOrder.deleteMany({});
  await prisma.purchaseInvoiceItem.deleteMany({});
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.purchaseRequestItem.deleteMany({});
  await prisma.purchaseRequest.deleteMany({});
  await prisma.quotationItem.deleteMany({});
  await prisma.quotation.deleteMany({});
  await prisma.grnItem.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.purchaseInvoice.deleteMany({});
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
  // Menu-based CRUD: inventory_create, inventory_read, inventory_update, inventory_delete, etc.
  const permissionData = [
    { code: "manage_users", name: "Manage users", description: "Add, edit, remove org users" },
    { code: "manage_roles", name: "Manage roles", description: "Edit role permissions" },
    { code: "record_payments", name: "Record payments", description: "Record supplier/client payments" },
    { code: "adjust_stock", name: "Adjust stock", description: "Create stock adjustments" },
    { code: "manage_inventory", name: "Manage inventory", description: "Items, stock, GRN (all actions)" },
    { code: "inventory_create", name: "Inventory - Create", description: "Create items, stock entries" },
    { code: "inventory_read", name: "Inventory - Read", description: "View inventory" },
    { code: "inventory_update", name: "Inventory - Edit", description: "Edit items, stock" },
    { code: "inventory_delete", name: "Inventory - Delete", description: "Delete items" },
    { code: "manage_suppliers", name: "Manage suppliers", description: "Suppliers (all actions)" },
    { code: "suppliers_create", name: "Suppliers - Create", description: "Create suppliers" },
    { code: "suppliers_read", name: "Suppliers - Read", description: "View suppliers" },
    { code: "suppliers_update", name: "Suppliers - Edit", description: "Edit suppliers" },
    { code: "suppliers_delete", name: "Suppliers - Delete", description: "Delete suppliers" },
    { code: "manage_clients", name: "Manage clients", description: "Clients (all actions)" },
    { code: "clients_create", name: "Clients - Create", description: "Create clients" },
    { code: "clients_read", name: "Clients - Read", description: "View clients" },
    { code: "clients_update", name: "Clients - Edit", description: "Edit clients" },
    { code: "clients_delete", name: "Clients - Delete", description: "Delete clients" },
    { code: "manage_purchases", name: "Manage purchases", description: "Purchase invoices, GRNs (all)" },
    { code: "purchases_create", name: "Purchases - Create", description: "Create purchase orders/invoices" },
    { code: "purchases_read", name: "Purchases - Read", description: "View purchases" },
    { code: "purchases_update", name: "Purchases - Edit", description: "Edit purchases" },
    { code: "purchases_delete", name: "Purchases - Delete", description: "Delete purchases" },
    { code: "manage_sales", name: "Manage sales", description: "Sales (all actions)" },
    { code: "sales_create", name: "Sales - Create", description: "Create quotations, invoices" },
    { code: "sales_read", name: "Sales - Read", description: "View sales" },
    { code: "sales_update", name: "Sales - Edit", description: "Edit sales" },
    { code: "sales_delete", name: "Sales - Delete", description: "Delete sales" },
    { code: "manage_expenses", name: "Manage expenses", description: "Expenses (all actions)" },
    { code: "expenses_create", name: "Expenses - Create", description: "Create expenses" },
    { code: "expenses_read", name: "Expenses - Read", description: "View expenses" },
    { code: "expenses_update", name: "Expenses - Edit", description: "Edit expenses" },
    { code: "expenses_delete", name: "Expenses - Delete", description: "Delete expenses" },
    { code: "approve_quotation", name: "Approve quotation", description: "Approve quotations" },
    { code: "approve_purchase_request", name: "Approve purchase request", description: "Approve purchase requests" },
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
    permByCode.approve_purchase_request,
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
