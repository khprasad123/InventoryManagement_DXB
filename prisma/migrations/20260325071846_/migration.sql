-- AlterTable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_dashboard_preferences'
  ) THEN
    ALTER TABLE "user_dashboard_preferences" ALTER COLUMN "updated_at" DROP DEFAULT;
  END IF;
END $$;

-- RenameIndex
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'journal_entries_reference_idx'
  ) THEN
    ALTER INDEX "journal_entries_reference_idx" RENAME TO "journal_entries_reference_type_reference_id_idx";
  END IF;
END $$;
