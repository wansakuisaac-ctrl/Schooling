-- =============================================================================
-- ElimuCore CBC Multi-Tenant School Management System
-- Migration: 002_tenant_isolation_constraints.sql
-- Dialect: PostgreSQL (Cloud SQL)
-- Description: Enforces strict school_id integrity constraints, tenant-scoped
--              uniqueness guarantees, PostgreSQL Row-Level Security (RLS)
--              policies bound to `app.current_school_id`, and migration tracking.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Migration Tracking Table
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "schema_migrations" (
    "version" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "applied_at" timestamp NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 2. Non-Empty school_id CHECK Constraints & Tenant-Scoped Unique Constraints
-- -----------------------------------------------------------------------------

DO $$
DECLARE
    tbl text;
    con_name text;
    tenant_tables text[] := ARRAY[
        'school_levels',
        'subjects',
        'classes',
        'teachers',
        'parents',
        'students',
        'attendance',
        'exams',
        'grades',
        'report_cards',
        'formative_assessments',
        'timetable',
        'fee_structures',
        'invoices',
        'payments',
        'messages',
        'notifications_log',
        'announcements',
        'books',
        'book_loans',
        'routes',
        'route_stops',
        'student_transport',
        'hostels',
        'rooms',
        'hostel_allocations',
        'staff_attendance',
        'leave_requests',
        'payroll',
        'discipline_logs',
        'inventory_items',
        'inventory_issues',
        'gate_passes',
        'visitor_passes',
        'donations',
        'project_scores',
        'consent_records',
        'data_requests',
        'breach_logs',
        'audit_logs',
        'subscriptions',
        'school_snapshots'
    ];
BEGIN
    FOREACH tbl IN ARRAY tenant_tables LOOP
        con_name := 'chk_' || tbl || '_school_id_nonempty';
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = con_name
        ) THEN
            EXECUTE format(
                'ALTER TABLE %I ADD CONSTRAINT %I CHECK (length(btrim("school_id")) > 0)',
                tbl,
                con_name
            );
        END IF;
    END LOOP;
END $$;

-- Enforce users.school_id foreign-key safety when non-null (optional tenant binding)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_users_school_id_nonempty'
    ) THEN
        ALTER TABLE "users"
            ADD CONSTRAINT "chk_users_school_id_nonempty"
            CHECK ("school_id" IS NULL OR length(btrim("school_id")) > 0);
    END IF;
END $$;

-- Composite tenant-scoped unique indexes preventing duplicate records within a school
CREATE UNIQUE INDEX IF NOT EXISTS "uq_students_school_admission"
    ON "students" ("school_id", "admission_number");

CREATE UNIQUE INDEX IF NOT EXISTS "uq_teachers_school_employee"
    ON "teachers" ("school_id", "employee_number");

CREATE UNIQUE INDEX IF NOT EXISTS "uq_invoices_school_number"
    ON "invoices" ("school_id", "invoice_number");

CREATE UNIQUE INDEX IF NOT EXISTS "uq_attendance_school_student_date"
    ON "attendance" ("school_id", "student_id", "date");

CREATE UNIQUE INDEX IF NOT EXISTS "uq_report_cards_school_student_exam"
    ON "report_cards" ("school_id", "student_id", "exam_id");

-- -----------------------------------------------------------------------------
-- 3. Row-Level Security (RLS) Bound to `app.current_school_id`
--    When `app.current_school_id` is set inside a transaction (via src/lib/db.ts),
--    PostgreSQL natively rejects any cross-tenant reads or writes.
-- -----------------------------------------------------------------------------

DO $$
DECLARE
    tbl text;
    pol_name text;
    tenant_tables text[] := ARRAY[
        'school_levels',
        'subjects',
        'classes',
        'teachers',
        'parents',
        'students',
        'attendance',
        'exams',
        'grades',
        'report_cards',
        'formative_assessments',
        'timetable',
        'fee_structures',
        'invoices',
        'payments',
        'messages',
        'notifications_log',
        'announcements',
        'books',
        'book_loans',
        'routes',
        'route_stops',
        'student_transport',
        'hostels',
        'rooms',
        'hostel_allocations',
        'staff_attendance',
        'leave_requests',
        'payroll',
        'discipline_logs',
        'inventory_items',
        'inventory_issues',
        'gate_passes',
        'visitor_passes',
        'donations',
        'project_scores',
        'consent_records',
        'data_requests',
        'breach_logs',
        'audit_logs',
        'subscriptions',
        'school_snapshots'
    ];
BEGIN
    FOREACH tbl IN ARRAY tenant_tables LOOP
        pol_name := 'tenant_isolation_' || tbl;
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol_name, tbl);
        EXECUTE format(
            'CREATE POLICY %I ON %I FOR ALL USING (
                NULLIF(current_setting(''app.current_school_id'', true), '''') IS NULL
                OR "school_id" = current_setting(''app.current_school_id'', true)
            ) WITH CHECK (
                NULLIF(current_setting(''app.current_school_id'', true), '''') IS NULL
                OR "school_id" = current_setting(''app.current_school_id'', true)
            )',
            pol_name,
            tbl
        );
    END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 4. Record Applied Migrations
-- -----------------------------------------------------------------------------

INSERT INTO "schema_migrations" ("version", "name")
VALUES
    ('001', '001_initial_schema.sql'),
    ('002', '002_tenant_isolation_constraints.sql')
ON CONFLICT ("version") DO NOTHING;

COMMIT;
