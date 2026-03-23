-- CreateTable
CREATE TABLE "invoice_settings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "fax" TEXT,
    "website" TEXT,
    "tax_registration_no" TEXT,
    "bank_details" TEXT,
    "invoice_logo_url" TEXT,
    "seal_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_plans" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "monthly_amount" DECIMAL(12,2) NOT NULL,
    "max_users" INTEGER NOT NULL,
    "contract_start_date" TIMESTAMP(3) NOT NULL,
    "contract_end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_plans_pkey" PRIMARY KEY ("id")
);

-- Migrate existing org data to invoice_settings
INSERT INTO "invoice_settings" ("id", "organization_id", "company_name", "address", "phone", "fax", "website", "tax_registration_no", "bank_details", "invoice_logo_url", "seal_url", "created_at", "updated_at")
SELECT 
    gen_random_uuid()::text,
    "id",
    COALESCE("name", 'Company'),
    "address",
    "phone",
    "fax",
    "website",
    "tax_registration_no",
    "bank_details",
    "logo_url",
    "seal_url",
    "created_at",
    "updated_at"
FROM "organizations"
WHERE "deleted_at" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "invoice_settings_organization_id_key" ON "invoice_settings"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "org_plans_organization_id_key" ON "org_plans"("organization_id");

-- AddForeignKey
ALTER TABLE "invoice_settings" ADD CONSTRAINT "invoice_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_plans" ADD CONSTRAINT "org_plans_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: Remove invoice-specific columns from organizations
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "address";
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "seal_url";
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "tax_registration_no";
ALTER TABLE "organizations" DROP COLUMN IF EXISTS "bank_details";
