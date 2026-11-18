-- =============================================================================
-- ElimuCore CBC Multi-Tenant School Management System
-- Migration: 003_password_reset_tokens.sql
-- Dialect: PostgreSQL (Cloud SQL)
-- Description: Adds unique, time-limited password reset token columns to the
--              PostgreSQL `users` table for Nodemailer forgot-password recovery.
-- =============================================================================

BEGIN;

ALTER TABLE "users"
    ADD COLUMN IF NOT EXISTS "reset_token" text,
    ADD COLUMN IF NOT EXISTS "reset_token_expires_at" timestamp;

CREATE UNIQUE INDEX IF NOT EXISTS "users_reset_token_unique"
    ON "users" ("reset_token")
    WHERE "reset_token" IS NOT NULL;

INSERT INTO "schema_migrations" ("version", "name")
VALUES ('003', '003_password_reset_tokens.sql')
ON CONFLICT ("version") DO NOTHING;

COMMIT;
