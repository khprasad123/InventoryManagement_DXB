/*
  Warnings:

  - You are about to drop the column `cost_price` on the `items` table. All the data in the column will be lost.
  - You are about to drop the column `selling_price` on the `items` table. All the data in the column will be lost.
  - You are about to drop the column `quotation_id` on the `sales_invoices` table. All the data in the column will be lost.
  - Added the required column `margin` to the `quotation_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `purchase_cost` to the `quotation_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `job_id` to the `quotations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `job_id` to the `sales_invoices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sales_order_id` to the `sales_invoices` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PurchaseRequestStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "SalesInvoiceStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuotationStatus" ADD VALUE 'PENDING_APPROVAL';
ALTER TYPE "QuotationStatus" ADD VALUE 'REJECTED';

-- DropForeignKey
ALTER TABLE "sales_invoices" DROP CONSTRAINT "sales_invoices_quotation_id_fkey";

-- DropIndex
DROP INDEX "quotation_items_quotation_id_item_id_key";

-- DropIndex
DROP INDEX "sales_invoice_items_sales_invoice_id_item_id_key";

-- DropIndex
DROP INDEX "sales_invoices_quotation_id_idx";

-- DropIndex
DROP INDEX "sales_invoices_quotation_id_key";

-- AlterTable
ALTER TABLE "client_payments" ADD COLUMN     "payment_type" TEXT;

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "agreed_due_days" INTEGER,
ADD COLUMN     "building" TEXT,
ADD COLUMN     "site_location" TEXT,
ALTER COLUMN "default_payment_terms" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "grns" ADD COLUMN     "purchase_order_id" TEXT;

-- AlterTable
ALTER TABLE "items" DROP COLUMN "cost_price",
DROP COLUMN "selling_price",
ADD COLUMN     "default_margin" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN     "default_purchase_cost" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "address" TEXT,
ADD COLUMN     "bank_details" TEXT,
ADD COLUMN     "fax" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "seal_url" TEXT,
ADD COLUMN     "tax_registration_no" TEXT,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "quotation_items" ADD COLUMN     "margin" DECIMAL(5,2) NOT NULL,
ADD COLUMN     "purchase_cost" DECIMAL(12,2) NOT NULL;

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "approval_remarks" TEXT,
ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by_id" TEXT,
ADD COLUMN     "job_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "sales_invoice_items" ADD COLUMN     "tax_percent" DECIMAL(5,2) NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "sales_invoices" DROP COLUMN "quotation_id",
ADD COLUMN     "approval_remarks" TEXT,
ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by_id" TEXT,
ADD COLUMN     "default_tax_percent" DECIMAL(5,2) NOT NULL DEFAULT 5,
ADD COLUMN     "job_id" TEXT NOT NULL,
ADD COLUMN     "pdf_url" TEXT,
ADD COLUMN     "sales_order_id" TEXT NOT NULL,
ADD COLUMN     "status" "SalesInvoiceStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "payment_terms" TEXT;

-- AlterTable
ALTER TABLE "user_organizations" ADD COLUMN     "is_super_admin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "purchase_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "pr_no" TEXT NOT NULL,
    "sales_order_id" TEXT,
    "job_id" TEXT,
    "status" "PurchaseRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" TEXT,
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "approval_remarks" TEXT,

    CONSTRAINT "purchase_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_request_items" (
    "id" TEXT NOT NULL,
    "purchase_request_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "fulfilled_quantity" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "purchase_request_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "purchase_request_id" TEXT NOT NULL,
    "supplier_id" TEXT NOT NULL,
    "po_no" TEXT NOT NULL,
    "order_date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" TEXT,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_orders" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "quotation_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "order_no" TEXT NOT NULL,
    "order_date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by_id" TEXT,

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order_items" (
    "id" TEXT NOT NULL,
    "sales_order_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "sales_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "purchase_requests_organization_id_idx" ON "purchase_requests"("organization_id");

-- CreateIndex
CREATE INDEX "purchase_requests_sales_order_id_idx" ON "purchase_requests"("sales_order_id");

-- CreateIndex
CREATE INDEX "purchase_requests_status_idx" ON "purchase_requests"("status");

-- CreateIndex
CREATE INDEX "purchase_requests_deleted_at_idx" ON "purchase_requests"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requests_organization_id_pr_no_key" ON "purchase_requests"("organization_id", "pr_no");

-- CreateIndex
CREATE INDEX "purchase_request_items_purchase_request_id_idx" ON "purchase_request_items"("purchase_request_id");

-- CreateIndex
CREATE INDEX "purchase_request_items_item_id_idx" ON "purchase_request_items"("item_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_request_items_purchase_request_id_item_id_key" ON "purchase_request_items"("purchase_request_id", "item_id");

-- CreateIndex
CREATE INDEX "purchase_orders_organization_id_idx" ON "purchase_orders"("organization_id");

-- CreateIndex
CREATE INDEX "purchase_orders_purchase_request_id_idx" ON "purchase_orders"("purchase_request_id");

-- CreateIndex
CREATE INDEX "purchase_orders_supplier_id_idx" ON "purchase_orders"("supplier_id");

-- CreateIndex
CREATE INDEX "purchase_orders_deleted_at_idx" ON "purchase_orders"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_organization_id_po_no_key" ON "purchase_orders"("organization_id", "po_no");

-- CreateIndex
CREATE INDEX "purchase_order_items_purchase_order_id_idx" ON "purchase_order_items"("purchase_order_id");

-- CreateIndex
CREATE INDEX "purchase_order_items_item_id_idx" ON "purchase_order_items"("item_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_items_purchase_order_id_item_id_key" ON "purchase_order_items"("purchase_order_id", "item_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_quotation_id_key" ON "sales_orders"("quotation_id");

-- CreateIndex
CREATE INDEX "sales_orders_organization_id_idx" ON "sales_orders"("organization_id");

-- CreateIndex
CREATE INDEX "sales_orders_quotation_id_idx" ON "sales_orders"("quotation_id");

-- CreateIndex
CREATE INDEX "sales_orders_client_id_idx" ON "sales_orders"("client_id");

-- CreateIndex
CREATE INDEX "sales_orders_job_id_idx" ON "sales_orders"("job_id");

-- CreateIndex
CREATE INDEX "sales_orders_deleted_at_idx" ON "sales_orders"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_organization_id_order_no_key" ON "sales_orders"("organization_id", "order_no");

-- CreateIndex
CREATE INDEX "sales_order_items_sales_order_id_idx" ON "sales_order_items"("sales_order_id");

-- CreateIndex
CREATE INDEX "sales_order_items_item_id_idx" ON "sales_order_items"("item_id");

-- CreateIndex
CREATE INDEX "grns_purchase_order_id_idx" ON "grns"("purchase_order_id");

-- CreateIndex
CREATE INDEX "quotations_job_id_idx" ON "quotations"("job_id");

-- CreateIndex
CREATE INDEX "sales_invoices_sales_order_id_idx" ON "sales_invoices"("sales_order_id");

-- CreateIndex
CREATE INDEX "sales_invoices_job_id_idx" ON "sales_invoices"("job_id");

-- CreateIndex
CREATE INDEX "sales_invoices_status_idx" ON "sales_invoices"("status");

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grns" ADD CONSTRAINT "grns_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requests" ADD CONSTRAINT "purchase_requests_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_purchase_request_id_fkey" FOREIGN KEY ("purchase_request_id") REFERENCES "purchase_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_request_items" ADD CONSTRAINT "purchase_request_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_purchase_request_id_fkey" FOREIGN KEY ("purchase_request_id") REFERENCES "purchase_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "quotations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
