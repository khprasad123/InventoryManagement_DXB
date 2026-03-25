-- AlterTable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_dashboard_preferences'
  ) THEN
    ALTER TABLE "user_dashboard_preferences"
      ALTER COLUMN "updated_at" DROP DEFAULT;
  END IF;
END $$;
