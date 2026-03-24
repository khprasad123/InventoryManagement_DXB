-- Soft-delete columns for memberships, role-permission links, and line items

ALTER TABLE "role_permissions" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "role_permissions_deleted_at_idx" ON "role_permissions"("deleted_at");

ALTER TABLE "user_organizations" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "user_organizations_deleted_at_idx" ON "user_organizations"("deleted_at");

ALTER TABLE "purchase_request_items" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "purchase_request_items_deleted_at_idx" ON "purchase_request_items"("deleted_at");

ALTER TABLE "quotation_items" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "quotation_items_deleted_at_idx" ON "quotation_items"("deleted_at");

-- Deleted actor tracking
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT;
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT;
ALTER TABLE "role_permissions" ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT;
ALTER TABLE "user_organizations" ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT;
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT;
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT;
ALTER TABLE "purchase_requests" ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT;
ALTER TABLE "purchase_request_items" ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT;
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT;
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT;
ALTER TABLE "quotation_items" ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT;
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT;
ALTER TABLE "expense_categories" ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT;
ALTER TABLE "documents" ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT;

ALTER TABLE "currencies" ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT;
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT;
ALTER TABLE "grns" ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT;
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT;
ALTER TABLE "supplier_payments" ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT;
ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT;
ALTER TABLE "client_payments" ADD COLUMN IF NOT EXISTS "deleted_by_id" TEXT;
