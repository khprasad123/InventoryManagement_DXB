-- AlterTable
ALTER TABLE "invoice_settings" ADD COLUMN     "default_tax_percent" DECIMAL(5,2) NOT NULL DEFAULT 5;

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tax_percent" DECIMAL(5,2) NOT NULL DEFAULT 5,
ADD COLUMN     "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0;
