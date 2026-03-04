import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
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

  // Link user to organization with ADMIN role
  await prisma.userOrganization.upsert({
    where: {
      userId_organizationId: {
        userId: user.id,
        organizationId: org.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      organizationId: org.id,
      roleId: adminRole.id,
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
