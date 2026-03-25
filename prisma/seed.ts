import { PrismaClient, type GlAccountType, type GlNormalSide } from "@prisma/client";
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
  await prisma.journalLine.deleteMany({});
  await prisma.journalEntry.deleteMany({});
  await prisma.glAccount.deleteMany({});
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

  // Create invoice settings for the org
  await prisma.invoiceSettings.upsert({
    where: { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      companyName: org.name,
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

  // Create default Chart of Accounts (GL) for the org
  const glAccounts: Array<{
    code: string;
    name: string;
    type: GlAccountType;
    normalSide: GlNormalSide;
    isTaxAccount?: boolean;
  }> = [
    { code: "1000", name: "Cash / Bank", type: "ASSET", normalSide: "DEBIT" },
    { code: "1100", name: "Accounts Receivable", type: "ASSET", normalSide: "DEBIT" },
    { code: "1200", name: "Tax Recoverable", type: "ASSET", normalSide: "DEBIT", isTaxAccount: true },
    { code: "2000", name: "Accounts Payable", type: "LIABILITY", normalSide: "CREDIT" },
    { code: "2100", name: "Tax Payable", type: "LIABILITY", normalSide: "CREDIT", isTaxAccount: true },
    { code: "3000", name: "Equity", type: "EQUITY", normalSide: "CREDIT" },
    { code: "4000", name: "Sales Revenue", type: "REVENUE", normalSide: "CREDIT" },
    { code: "5000", name: "Purchases / COGS", type: "EXPENSE", normalSide: "DEBIT" },
    { code: "6000", name: "Operating Expenses", type: "EXPENSE", normalSide: "DEBIT" },
  ];

  await Promise.all(
    glAccounts.map((a) =>
      prisma.glAccount.upsert({
        where: { organizationId_code: { organizationId: org.id, code: a.code } },
        update: {},
        create: {
          organizationId: org.id,
          code: a.code,
          name: a.name,
          type: a.type,
          normalSide: a.normalSide,
          isTaxAccount: a.isTaxAccount ?? false,
        },
      })
    )
  );

  // Permissions (global codes; roles get assigned these)
  // Menu-based CRUD: inventory_create, inventory_read, inventory_update, inventory_delete, etc.
  const permissionData = [
    { code: "manage_users", name: "Manage users", description: "Add, edit, remove org users" },
    { code: "manage_roles", name: "Manage roles", description: "Edit role permissions" },
    { code: "settings_users_manage", name: "Settings - Users Manage", description: "Manage users in settings" },
    { code: "settings_users_read", name: "Settings - Users Read", description: "View users in settings" },
    { code: "settings_users_create", name: "Settings - Users Create", description: "Create users in settings" },
    { code: "settings_users_update", name: "Settings - Users Update", description: "Update users in settings" },
    { code: "settings_users_delete", name: "Settings - Users Delete", description: "Delete users in settings" },
    { code: "settings_users_reset_password", name: "Settings - Users Reset Password", description: "Reset user passwords in settings" },
    { code: "settings_roles_manage", name: "Settings - Roles Manage", description: "Manage roles in settings" },
    { code: "settings_roles_create", name: "Settings - Roles Create", description: "Create roles in settings" },
    { code: "settings_roles_update", name: "Settings - Roles Update", description: "Update roles in settings" },
    { code: "settings_roles_delete", name: "Settings - Roles Delete", description: "Delete roles in settings" },
    { code: "record_payments", name: "Record payments", description: "Record supplier/client payments" },
    { code: "manage_journals", name: "Accounting - Manage Journals", description: "Access General Journal (all journal actions)" },
    { code: "gl_journals_read", name: "Journals - Read", description: "View journal entries" },
    { code: "gl_journals_create", name: "Journals - Create", description: "Create manual journal entries" },
    { code: "gl_journals_delete", name: "Journals - Delete/Reversal", description: "Reverse/undo posted journal entries" },
    { code: "gl_accounts_read", name: "GL Accounts - Read", description: "View GL chart of accounts for journal entry" },
    { code: "manage_banking", name: "Banking - Manage Accounts", description: "Access bank accounts, statements, and reconciliation matching" },
    { code: "bank_accounts_read", name: "Bank Accounts - Read", description: "View bank accounts" },
    { code: "bank_accounts_create", name: "Bank Accounts - Create", description: "Create bank accounts" },
    { code: "bank_accounts_update", name: "Bank Accounts - Update", description: "Update bank accounts" },
    { code: "bank_accounts_delete", name: "Bank Accounts - Delete", description: "Delete bank accounts" },
    { code: "bank_statements_import", name: "Bank Statements - Import", description: "Import bank statements / transactions (CSV)" },
    { code: "bank_reconciliations_read", name: "Bank Reconciliations - Read", description: "View reconciliation matches" },
    { code: "bank_reconciliations_match", name: "Bank Reconciliations - Match", description: "Create/update reconciliation matches" },
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
    { code: "view_reports", name: "View reports", description: "Access reports (all types)" },
    { code: "reports_overview", name: "Reports - Overview", description: "Generate overview reports" },
    { code: "reports_sales", name: "Reports - Sales", description: "Generate sales reports" },
    { code: "reports_purchases", name: "Reports - Purchases", description: "Generate purchase reports" },
    { code: "reports_profit_loss", name: "Reports - Profit & Loss", description: "Generate P&L reports" },
    { code: "reports_suppliers", name: "Reports - Suppliers", description: "Generate supplier reports" },
    { code: "reports_inventory", name: "Reports - Inventory", description: "Generate inventory reports" },
    { code: "reports_trial_balance", name: "Reports - Trial Balance", description: "Generate trial balance reports" },
    { code: "reports_balance_sheet", name: "Reports - Balance Sheet", description: "Generate balance sheet reports" },
    { code: "reports_receivables_aging", name: "Reports - Receivables Aging", description: "Generate AR aging reports" },
    { code: "reports_payables_aging", name: "Reports - Payables Aging", description: "Generate AP aging reports" },
    // WorkDrive (folders/files + sharing)
    { code: "manage_workdrive", name: "WorkDrive - Manage", description: "Full access to WorkDrive folders/files/sharing" },
    { code: "workdrive_read", name: "WorkDrive - Read", description: "View WorkDrive folders/files" },
    { code: "workdrive_upload", name: "WorkDrive - Upload", description: "Upload files to folders (create versions)" },
    { code: "workdrive_manage_folders", name: "WorkDrive - Manage Folders", description: "Create/update/delete folders" },
    { code: "workdrive_manage_files", name: "WorkDrive - Manage Files", description: "Rename/delete/manage files" },
    { code: "workdrive_share_manage", name: "WorkDrive - Manage Sharing", description: "Edit role-based WorkDrive sharing rules" },
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
    permByCode.workdrive_read,
  ]
    .filter(Boolean)
    .map((permissionId) => ({ roleId: inventoryRole.id, permissionId: permissionId! }));
  const financePerms = [
    permByCode.record_payments,
    permByCode.manage_journals,
    permByCode.manage_banking,
    permByCode.manage_expenses,
    permByCode.manage_purchases,
    permByCode.view_reports,
    permByCode.view_audit,
    permByCode.workdrive_read,
    permByCode.workdrive_upload,
    permByCode.workdrive_manage_folders,
    permByCode.workdrive_manage_files,
    permByCode.workdrive_share_manage,
  ]
    .filter(Boolean)
    .map((permissionId) => ({ roleId: financeRole.id, permissionId: permissionId! }));
  const salesPerms = [
    permByCode.manage_sales,
    permByCode.manage_clients,
    permByCode.manage_inventory,
    permByCode.view_reports,
    permByCode.view_audit,
    permByCode.workdrive_read,
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
