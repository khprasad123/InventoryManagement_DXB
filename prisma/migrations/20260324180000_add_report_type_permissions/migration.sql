-- Add granular report-type permissions for RBAC
INSERT INTO "permissions" ("id", "code", "name", "description")
VALUES
  (gen_random_uuid()::text, 'reports_overview', 'Reports - Overview', 'Generate overview reports'),
  (gen_random_uuid()::text, 'reports_sales', 'Reports - Sales', 'Generate sales reports'),
  (gen_random_uuid()::text, 'reports_purchases', 'Reports - Purchases', 'Generate purchase reports'),
  (gen_random_uuid()::text, 'reports_profit_loss', 'Reports - Profit & Loss', 'Generate P&L reports'),
  (gen_random_uuid()::text, 'reports_suppliers', 'Reports - Suppliers', 'Generate supplier reports'),
  (gen_random_uuid()::text, 'reports_inventory', 'Reports - Inventory', 'Generate inventory reports')
ON CONFLICT ("code") DO NOTHING;
