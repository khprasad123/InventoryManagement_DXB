-- CreateEnum
CREATE TYPE "GlAccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "GlNormalSide" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "JournalEntryStatus" AS ENUM ('POSTED', 'REVERSED');

-- CreateTable
CREATE TABLE IF NOT EXISTS "gl_accounts" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "account_type" "GlAccountType" NOT NULL,
  "normal_side" "GlNormalSide" NOT NULL,
  "is_tax_account" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  "deleted_by_id" TEXT,

  CONSTRAINT "gl_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "gl_accounts_organization_id_code_key"
  ON "gl_accounts"("organization_id", "code");
CREATE INDEX IF NOT EXISTS "gl_accounts_organization_id_idx"
  ON "gl_accounts"("organization_id");
CREATE INDEX IF NOT EXISTS "gl_accounts_deleted_at_idx"
  ON "gl_accounts"("deleted_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'gl_accounts_organization_id_fkey'
  ) THEN
    ALTER TABLE "gl_accounts"
      ADD CONSTRAINT "gl_accounts_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "journal_entries" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "entry_no" TEXT NOT NULL,
  "entry_date" TIMESTAMP(3) NOT NULL,
  "memo" TEXT,
  "status" "JournalEntryStatus" NOT NULL DEFAULT 'POSTED',
  "reference_type" TEXT,
  "reference_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  "deleted_by_id" TEXT,

  CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "journal_entries_organization_id_entry_no_key"
  ON "journal_entries"("organization_id", "entry_no");
CREATE INDEX IF NOT EXISTS "journal_entries_organization_id_entry_date_idx"
  ON "journal_entries"("organization_id", "entry_date");
CREATE INDEX IF NOT EXISTS "journal_entries_reference_idx"
  ON "journal_entries"("reference_type", "reference_id");
CREATE INDEX IF NOT EXISTS "journal_entries_deleted_at_idx"
  ON "journal_entries"("deleted_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'journal_entries_organization_id_fkey'
  ) THEN
    ALTER TABLE "journal_entries"
      ADD CONSTRAINT "journal_entries_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "journal_lines" (
  "id" TEXT NOT NULL,
  "journal_entry_id" TEXT NOT NULL,
  "account_id" TEXT NOT NULL,
  "description" TEXT,
  "debit_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "credit_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3),
  "deleted_by_id" TEXT,

  CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "journal_lines_journal_entry_id_idx"
  ON "journal_lines"("journal_entry_id");
CREATE INDEX IF NOT EXISTS "journal_lines_account_id_idx"
  ON "journal_lines"("account_id");
CREATE INDEX IF NOT EXISTS "journal_lines_deleted_at_idx"
  ON "journal_lines"("deleted_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'journal_lines_journal_entry_id_fkey'
  ) THEN
    ALTER TABLE "journal_lines"
      ADD CONSTRAINT "journal_lines_journal_entry_id_fkey"
      FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'journal_lines_account_id_fkey'
  ) THEN
    ALTER TABLE "journal_lines"
      ADD CONSTRAINT "journal_lines_account_id_fkey"
      FOREIGN KEY ("account_id") REFERENCES "gl_accounts"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

