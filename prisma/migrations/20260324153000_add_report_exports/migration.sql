CREATE TABLE IF NOT EXISTS "report_exports" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "document_id" TEXT NOT NULL,
  "report_type" TEXT NOT NULL,
  "format" TEXT NOT NULL DEFAULT 'XLSX',
  "metadata" JSONB,
  "generated_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "report_exports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "report_exports_organization_id_created_at_idx"
  ON "report_exports"("organization_id", "created_at");
CREATE INDEX IF NOT EXISTS "report_exports_organization_id_expires_at_idx"
  ON "report_exports"("organization_id", "expires_at");
CREATE INDEX IF NOT EXISTS "report_exports_document_id_idx"
  ON "report_exports"("document_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'report_exports_document_id_fkey'
  ) THEN
    ALTER TABLE "report_exports"
      ADD CONSTRAINT "report_exports_document_id_fkey"
      FOREIGN KEY ("document_id") REFERENCES "documents"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'report_exports_organization_id_fkey'
  ) THEN
    ALTER TABLE "report_exports"
      ADD CONSTRAINT "report_exports_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'report_exports_generated_by_id_fkey'
  ) THEN
    ALTER TABLE "report_exports"
      ADD CONSTRAINT "report_exports_generated_by_id_fkey"
      FOREIGN KEY ("generated_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
