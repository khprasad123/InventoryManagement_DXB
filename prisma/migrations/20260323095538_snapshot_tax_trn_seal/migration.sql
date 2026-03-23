-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "seal_url" TEXT,
ADD COLUMN     "tax_registration_no" TEXT;

-- AlterTable
ALTER TABLE "sales_invoices" ADD COLUMN     "seal_url" TEXT,
ADD COLUMN     "tax_registration_no" TEXT;
