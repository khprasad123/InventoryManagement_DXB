-- CreateEnum
CREATE TYPE "SalesCreditNoteStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');

-- CreateEnum
CREATE TYPE "SalesDebitNoteStatus" AS ENUM ('DRAFT', 'POSTED', 'REVERSED');

-- CreateTable
CREATE TABLE "sales_credit_notes" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "sales_invoice_id" TEXT NOT NULL,
    "credit_note_no" TEXT NOT NULL,
    "note_date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency_code" TEXT NOT NULL DEFAULT 'AED',
    "memo" TEXT,
    "status" "SalesCreditNoteStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" TEXT,

    CONSTRAINT "sales_credit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_debit_notes" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "sales_invoice_id" TEXT NOT NULL,
    "debit_note_no" TEXT NOT NULL,
    "note_date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency_code" TEXT NOT NULL DEFAULT 'AED',
    "memo" TEXT,
    "status" "SalesDebitNoteStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" TEXT,

    CONSTRAINT "sales_debit_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drive_folders" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" TEXT,

    CONSTRAINT "drive_folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drive_files" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "folder_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT,
    "size_bytes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" TEXT,

    CONSTRAINT "drive_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drive_file_versions" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "drive_file_id" TEXT NOT NULL,
    "version_no" INTEGER NOT NULL,
    "document_id" TEXT NOT NULL,
    "memo" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" TEXT,
    "created_by_id" TEXT,

    CONSTRAINT "drive_file_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drive_folder_permissions" (
    "role_id" TEXT NOT NULL,
    "drive_folder_id" TEXT NOT NULL,
    "can_read" BOOLEAN NOT NULL DEFAULT true,
    "can_write" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,
    "can_share" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" TEXT,

    CONSTRAINT "drive_folder_permissions_pkey" PRIMARY KEY ("role_id","drive_folder_id")
);

-- CreateTable
CREATE TABLE "drive_file_permissions" (
    "role_id" TEXT NOT NULL,
    "drive_file_id" TEXT NOT NULL,
    "can_read" BOOLEAN NOT NULL DEFAULT true,
    "can_write" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,
    "can_share" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deleted_by_id" TEXT,

    CONSTRAINT "drive_file_permissions_pkey" PRIMARY KEY ("role_id","drive_file_id")
);

-- CreateIndex
CREATE INDEX "sales_credit_notes_organization_id_idx" ON "sales_credit_notes"("organization_id");

-- CreateIndex
CREATE INDEX "sales_credit_notes_sales_invoice_id_idx" ON "sales_credit_notes"("sales_invoice_id");

-- CreateIndex
CREATE INDEX "sales_credit_notes_note_date_idx" ON "sales_credit_notes"("note_date");

-- CreateIndex
CREATE INDEX "sales_credit_notes_status_idx" ON "sales_credit_notes"("status");

-- CreateIndex
CREATE INDEX "sales_credit_notes_deleted_at_idx" ON "sales_credit_notes"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "sales_credit_notes_organization_id_credit_note_no_key" ON "sales_credit_notes"("organization_id", "credit_note_no");

-- CreateIndex
CREATE INDEX "sales_debit_notes_organization_id_idx" ON "sales_debit_notes"("organization_id");

-- CreateIndex
CREATE INDEX "sales_debit_notes_sales_invoice_id_idx" ON "sales_debit_notes"("sales_invoice_id");

-- CreateIndex
CREATE INDEX "sales_debit_notes_note_date_idx" ON "sales_debit_notes"("note_date");

-- CreateIndex
CREATE INDEX "sales_debit_notes_status_idx" ON "sales_debit_notes"("status");

-- CreateIndex
CREATE INDEX "sales_debit_notes_deleted_at_idx" ON "sales_debit_notes"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "sales_debit_notes_organization_id_debit_note_no_key" ON "sales_debit_notes"("organization_id", "debit_note_no");

-- CreateIndex
CREATE INDEX "drive_folders_organization_id_idx" ON "drive_folders"("organization_id");

-- CreateIndex
CREATE INDEX "drive_folders_parent_id_idx" ON "drive_folders"("parent_id");

-- CreateIndex
CREATE INDEX "drive_folders_deleted_at_idx" ON "drive_folders"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "drive_folders_organization_id_parent_id_name_key" ON "drive_folders"("organization_id", "parent_id", "name");

-- CreateIndex
CREATE INDEX "drive_files_organization_id_idx" ON "drive_files"("organization_id");

-- CreateIndex
CREATE INDEX "drive_files_folder_id_idx" ON "drive_files"("folder_id");

-- CreateIndex
CREATE INDEX "drive_files_deleted_at_idx" ON "drive_files"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "drive_files_organization_id_folder_id_file_name_key" ON "drive_files"("organization_id", "folder_id", "file_name");

-- CreateIndex
CREATE INDEX "drive_file_versions_organization_id_idx" ON "drive_file_versions"("organization_id");

-- CreateIndex
CREATE INDEX "drive_file_versions_drive_file_id_idx" ON "drive_file_versions"("drive_file_id");

-- CreateIndex
CREATE INDEX "drive_file_versions_deleted_at_idx" ON "drive_file_versions"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "drive_file_versions_drive_file_id_version_no_key" ON "drive_file_versions"("drive_file_id", "version_no");

-- CreateIndex
CREATE INDEX "drive_folder_permissions_drive_folder_id_idx" ON "drive_folder_permissions"("drive_folder_id");

-- CreateIndex
CREATE INDEX "drive_folder_permissions_deleted_at_idx" ON "drive_folder_permissions"("deleted_at");

-- CreateIndex
CREATE INDEX "drive_file_permissions_drive_file_id_idx" ON "drive_file_permissions"("drive_file_id");

-- CreateIndex
CREATE INDEX "drive_file_permissions_deleted_at_idx" ON "drive_file_permissions"("deleted_at");

-- AddForeignKey
ALTER TABLE "sales_credit_notes" ADD CONSTRAINT "sales_credit_notes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_credit_notes" ADD CONSTRAINT "sales_credit_notes_sales_invoice_id_fkey" FOREIGN KEY ("sales_invoice_id") REFERENCES "sales_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_debit_notes" ADD CONSTRAINT "sales_debit_notes_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_debit_notes" ADD CONSTRAINT "sales_debit_notes_sales_invoice_id_fkey" FOREIGN KEY ("sales_invoice_id") REFERENCES "sales_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_folders" ADD CONSTRAINT "drive_folders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_folders" ADD CONSTRAINT "drive_folders_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "drive_folders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_files" ADD CONSTRAINT "drive_files_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_files" ADD CONSTRAINT "drive_files_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "drive_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_file_versions" ADD CONSTRAINT "drive_file_versions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_file_versions" ADD CONSTRAINT "drive_file_versions_drive_file_id_fkey" FOREIGN KEY ("drive_file_id") REFERENCES "drive_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_file_versions" ADD CONSTRAINT "drive_file_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_file_versions" ADD CONSTRAINT "drive_file_versions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_folder_permissions" ADD CONSTRAINT "drive_folder_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_folder_permissions" ADD CONSTRAINT "drive_folder_permissions_drive_folder_id_fkey" FOREIGN KEY ("drive_folder_id") REFERENCES "drive_folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_file_permissions" ADD CONSTRAINT "drive_file_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drive_file_permissions" ADD CONSTRAINT "drive_file_permissions_drive_file_id_fkey" FOREIGN KEY ("drive_file_id") REFERENCES "drive_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;
