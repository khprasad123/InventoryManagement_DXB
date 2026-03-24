CREATE TABLE IF NOT EXISTS "user_dashboard_preferences" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "widget_ids" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_dashboard_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_dashboard_preferences_user_id_organization_id_key"
  ON "user_dashboard_preferences"("user_id", "organization_id");

CREATE INDEX IF NOT EXISTS "user_dashboard_preferences_organization_id_idx"
  ON "user_dashboard_preferences"("organization_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'user_dashboard_preferences_user_id_fkey'
  ) THEN
    ALTER TABLE "user_dashboard_preferences"
      ADD CONSTRAINT "user_dashboard_preferences_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'user_dashboard_preferences_organization_id_fkey'
  ) THEN
    ALTER TABLE "user_dashboard_preferences"
      ADD CONSTRAINT "user_dashboard_preferences_organization_id_fkey"
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
