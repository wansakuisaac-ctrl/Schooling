-- =============================================================================
-- ElimuCore CBC Multi-Tenant School Management System
-- Migration: 001_initial_schema.sql
-- Dialect: PostgreSQL (Cloud SQL)
-- Description: Initial multi-tenant schema defining schools, users, students,
--              teachers, parents, classes, subjects, attendance, exams, grades,
--              report_cards, formative_assessments, timetable, fee_structures,
--              invoices, payments, messages, notifications_log, announcements,
--              books, book_loans, routes, route_stops, student_transport,
--              hostels, rooms, hostel_allocations, staff_attendance,
--              leave_requests, payroll, discipline_logs, inventory_items,
--              inventory_issues, gate_passes, donations, project_scores,
--              consent_records, data_requests, breach_logs, audit_logs,
--              subscriptions, platform_admins, platform_audit_logs,
--              school_levels, visitor_passes, and school_snapshots, with
--              foreign key constraints and indexed school_id columns.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Core Identity & Multi-Tenant Root
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "users" (
    "id" serial PRIMARY KEY NOT NULL,
    "uid" text NOT NULL UNIQUE,
    "app_user_id" text,
    "email" text NOT NULL,
    "password_hash" text,
    "full_name" text,
    "phone" text,
    "photo_url" text,
    "role" text NOT NULL DEFAULT 'SCHOOL_ADMIN',
    "school_id" text,
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "schools" (
    "id" text PRIMARY KEY NOT NULL,
    "owner_uid" text,
    "slug" text NOT NULL UNIQUE,
    "name" text NOT NULL,
    "logo_url" text,
    "address" text NOT NULL,
    "phone" text NOT NULL,
    "email" text NOT NULL,
    "plan" text NOT NULL DEFAULT 'free',
    "status" text NOT NULL DEFAULT 'active',
    "current_term" text NOT NULL DEFAULT 'Term 1',
    "academic_year" integer NOT NULL DEFAULT 2026,
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "schools_owner_uid_users_uid_fk"
        FOREIGN KEY ("owner_uid") REFERENCES "users"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- -----------------------------------------------------------------------------
-- 2. CBC Curriculum Structure (Levels, Subjects, Classes)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "school_levels" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "name" text NOT NULL,
    "order_index" integer NOT NULL,
    CONSTRAINT "school_levels_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "subjects" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "level_id" text NOT NULL,
    "name" text NOT NULL,
    "code" text NOT NULL,
    "is_optional" boolean NOT NULL DEFAULT false,
    CONSTRAINT "subjects_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "subjects_level_id_school_levels_id_fk"
        FOREIGN KEY ("level_id") REFERENCES "school_levels"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "classes" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "level_id" text NOT NULL,
    "name" text NOT NULL,
    "stream" text NOT NULL,
    "class_teacher_id" text,
    CONSTRAINT "classes_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "classes_level_id_school_levels_id_fk"
        FOREIGN KEY ("level_id") REFERENCES "school_levels"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- -----------------------------------------------------------------------------
-- 3. Faculty, Parents & Learners
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "teachers" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "user_id" text NOT NULL,
    "employee_number" text NOT NULL,
    "subject_specialty" text NOT NULL,
    "hire_date" text NOT NULL,
    "assigned_level_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "assigned_class_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "is_active" boolean NOT NULL DEFAULT true,
    CONSTRAINT "teachers_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "parents" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "user_id" text NOT NULL,
    "relationship" text NOT NULL,
    "occupation" text,
    "linked_student_ids" jsonb NOT NULL DEFAULT '[]'::jsonb,
    CONSTRAINT "parents_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "students" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "user_id" text,
    "admission_number" text NOT NULL,
    "full_name" text NOT NULL,
    "level_id" text NOT NULL,
    "class_id" text NOT NULL,
    "parent_user_id" text,
    "upi" text,
    "dob" text NOT NULL,
    "gender" text NOT NULL,
    "student_type" text NOT NULL DEFAULT 'day',
    "photo_url" text,
    "kpsea_score" real,
    "sba_score" real,
    "placement_score" real,
    "pathway_preference" text,
    "status" text NOT NULL DEFAULT 'active',
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "students_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- -----------------------------------------------------------------------------
-- 4. Attendance, Examinations, Grades, Assessments & Timetable
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "attendance" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "student_id" text NOT NULL,
    "date" text NOT NULL,
    "status" text NOT NULL,
    "marked_by_teacher_id" text NOT NULL,
    "remarks" text,
    "updated_at" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "attendance_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "attendance_student_id_students_id_fk"
        FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "exams" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "name" text NOT NULL,
    "term" text NOT NULL,
    "year" integer NOT NULL,
    "exam_type" text NOT NULL,
    "start_date" text NOT NULL,
    "end_date" text NOT NULL,
    "is_published" boolean NOT NULL DEFAULT false,
    "updated_at" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "exams_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "grades" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "exam_id" text NOT NULL,
    "student_id" text NOT NULL,
    "subject_id" text NOT NULL,
    "marks" real,
    "rubric_level" text NOT NULL,
    "points" integer NOT NULL,
    "teacher_comment" text NOT NULL DEFAULT '',
    "entered_by_teacher_id" text NOT NULL,
    "updated_at" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "grades_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "grades_exam_id_exams_id_fk"
        FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "grades_student_id_students_id_fk"
        FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "report_cards" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "student_id" text NOT NULL,
    "exam_id" text NOT NULL,
    "pdf_url" text,
    "published" boolean NOT NULL DEFAULT false,
    "published_at" text,
    "class_teacher_remark" text NOT NULL DEFAULT '',
    "principal_remark" text NOT NULL DEFAULT '',
    CONSTRAINT "report_cards_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "report_cards_student_id_students_id_fk"
        FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "report_cards_exam_id_exams_id_fk"
        FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "formative_assessments" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "student_id" text NOT NULL,
    "subject_id" text NOT NULL,
    "strand" text NOT NULL,
    "sub_strand" text NOT NULL,
    "rubric_level" text NOT NULL,
    "points" integer NOT NULL,
    "assessed_by_teacher_id" text NOT NULL,
    "assessment_date" text NOT NULL,
    "comment" text NOT NULL DEFAULT '',
    CONSTRAINT "formative_assessments_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "formative_assessments_student_id_students_id_fk"
        FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "timetable" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "class_id" text NOT NULL,
    "subject_id" text NOT NULL,
    "teacher_id" text NOT NULL,
    "day_of_week" integer NOT NULL,
    "period" integer NOT NULL,
    "start_time" text NOT NULL,
    "end_time" text NOT NULL,
    "room" text NOT NULL,
    CONSTRAINT "timetable_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- -----------------------------------------------------------------------------
-- 5. Finance & Billing (Fee Structures, Invoices, Payments)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "fee_structures" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "class_id" text NOT NULL,
    "term" text NOT NULL,
    "year" integer NOT NULL,
    "line_items" jsonb NOT NULL DEFAULT '[]'::jsonb,
    "total_day_amount" integer NOT NULL DEFAULT 0,
    "total_boarding_amount" integer NOT NULL DEFAULT 0,
    CONSTRAINT "fee_structures_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "invoices" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "student_id" text NOT NULL,
    "fee_structure_id" text NOT NULL,
    "invoice_number" text NOT NULL,
    "amount_due" integer NOT NULL,
    "amount_paid" integer NOT NULL DEFAULT 0,
    "balance" integer NOT NULL,
    "due_date" text NOT NULL,
    "status" text NOT NULL DEFAULT 'unpaid',
    "created_at" timestamp NOT NULL DEFAULT now(),
    "updated_at" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "invoices_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "invoices_student_id_students_id_fk"
        FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "payments" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "invoice_id" text NOT NULL,
    "amount_paid" integer NOT NULL,
    "payment_date" text NOT NULL,
    "method" text NOT NULL,
    "reference" text NOT NULL,
    "receipt_number" text NOT NULL,
    "receipt_pdf_url" text,
    "recorded_by" text NOT NULL,
    "updated_at" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "payments_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "payments_invoice_id_invoices_id_fk"
        FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- -----------------------------------------------------------------------------
-- 6. Communications (Messages, Notifications, Announcements)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "messages" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "sender_user_id" text NOT NULL,
    "receiver_user_id" text NOT NULL,
    "student_id" text NOT NULL,
    "body" text NOT NULL,
    "read_at" text,
    "created_at" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "messages_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "notifications_log" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "user_id" text,
    "student_id" text,
    "exam_id" text,
    "channel" text NOT NULL,
    "phone_or_email" text NOT NULL,
    "message" text NOT NULL,
    "status" text NOT NULL,
    "provider_response" text,
    "sent_at" text NOT NULL,
    CONSTRAINT "notifications_log_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "announcements" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "title" text NOT NULL,
    "body" text NOT NULL,
    "audience" text NOT NULL,
    "posted_by" text NOT NULL,
    "sms_sent" boolean NOT NULL DEFAULT false,
    "created_at" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "announcements_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- -----------------------------------------------------------------------------
-- 7. Library Management
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "books" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "title" text NOT NULL,
    "author" text NOT NULL,
    "isbn" text NOT NULL,
    "category" text NOT NULL,
    "total_copies" integer NOT NULL,
    "available_copies" integer NOT NULL,
    CONSTRAINT "books_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "book_loans" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "book_id" text NOT NULL,
    "student_id" text NOT NULL,
    "borrowed_at" text NOT NULL,
    "due_date" text NOT NULL,
    "returned_at" text,
    "fine_amount" integer NOT NULL DEFAULT 0,
    "status" text NOT NULL DEFAULT 'active',
    CONSTRAINT "book_loans_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "book_loans_book_id_books_id_fk"
        FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "book_loans_student_id_students_id_fk"
        FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- -----------------------------------------------------------------------------
-- 8. Transport & Routing (Routes, Route Stops, Student Transport)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "routes" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "name" text NOT NULL,
    "description" text NOT NULL,
    "fee_per_term" integer NOT NULL,
    CONSTRAINT "routes_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "route_stops" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "route_id" text NOT NULL,
    "stop_name" text NOT NULL,
    "pickup_time" text NOT NULL,
    "dropoff_time" text NOT NULL,
    "order_index" integer NOT NULL,
    CONSTRAINT "route_stops_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "route_stops_route_id_routes_id_fk"
        FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "student_transport" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "student_id" text NOT NULL,
    "route_id" text NOT NULL,
    "stop_id" text NOT NULL,
    "term" text NOT NULL,
    "year" integer NOT NULL,
    CONSTRAINT "student_transport_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "student_transport_student_id_students_id_fk"
        FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "student_transport_route_id_routes_id_fk"
        FOREIGN KEY ("route_id") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "student_transport_stop_id_route_stops_id_fk"
        FOREIGN KEY ("stop_id") REFERENCES "route_stops"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- -----------------------------------------------------------------------------
-- 9. Hostels & Boarding (Hostels, Rooms, Hostel Allocations)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "hostels" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "name" text NOT NULL,
    "gender" text NOT NULL,
    "capacity" integer NOT NULL,
    CONSTRAINT "hostels_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "rooms" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "hostel_id" text NOT NULL,
    "room_number" text NOT NULL,
    "capacity" integer NOT NULL,
    CONSTRAINT "rooms_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "rooms_hostel_id_hostels_id_fk"
        FOREIGN KEY ("hostel_id") REFERENCES "hostels"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "hostel_allocations" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "student_id" text NOT NULL,
    "room_id" text NOT NULL,
    "term" text NOT NULL,
    "year" integer NOT NULL,
    "check_in_date" text NOT NULL,
    "check_out_date" text,
    CONSTRAINT "hostel_allocations_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "hostel_allocations_student_id_students_id_fk"
        FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "hostel_allocations_room_id_rooms_id_fk"
        FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- -----------------------------------------------------------------------------
-- 10. Staff HR & Payroll
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "staff_attendance" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "teacher_id" text NOT NULL,
    "date" text NOT NULL,
    "status" text NOT NULL,
    "check_in" text,
    "check_out" text,
    CONSTRAINT "staff_attendance_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "staff_attendance_teacher_id_teachers_id_fk"
        FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "leave_requests" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "teacher_id" text NOT NULL,
    "start_date" text NOT NULL,
    "end_date" text NOT NULL,
    "reason" text NOT NULL,
    "status" text NOT NULL DEFAULT 'pending',
    "approved_by" text,
    "created_at" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "leave_requests_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "leave_requests_teacher_id_teachers_id_fk"
        FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "payroll" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "teacher_id" text NOT NULL,
    "month" integer NOT NULL,
    "year" integer NOT NULL,
    "basic_salary" integer NOT NULL,
    "allowances" integer NOT NULL DEFAULT 0,
    "deductions" integer NOT NULL DEFAULT 0,
    "net_pay" integer NOT NULL,
    "status" text NOT NULL DEFAULT 'pending',
    "paid_at" text,
    "payslip_pdf_url" text,
    CONSTRAINT "payroll_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "payroll_teacher_id_teachers_id_fk"
        FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- -----------------------------------------------------------------------------
-- 11. Operations, Discipline, Inventory, Gate Security & KJSEA Projects
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "discipline_logs" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "student_id" text NOT NULL,
    "incident_date" text NOT NULL,
    "category" text NOT NULL,
    "description" text NOT NULL,
    "action_taken" text NOT NULL,
    "recorded_by" text NOT NULL,
    CONSTRAINT "discipline_logs_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "discipline_logs_student_id_students_id_fk"
        FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "inventory_items" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "name" text NOT NULL,
    "category" text NOT NULL,
    "quantity" integer NOT NULL,
    "unit_price" integer NOT NULL,
    CONSTRAINT "inventory_items_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "inventory_issues" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "item_id" text NOT NULL,
    "issued_to_user_id" text NOT NULL,
    "quantity" integer NOT NULL,
    "issue_date" text NOT NULL,
    "notes" text,
    CONSTRAINT "inventory_issues_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "inventory_issues_item_id_inventory_items_id_fk"
        FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "gate_passes" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "student_id" text NOT NULL,
    "reason" text NOT NULL,
    "out_time" text NOT NULL,
    "in_time" text,
    "approved_by" text NOT NULL,
    "picked_up_by" text,
    "contact_phone" text,
    "status" text NOT NULL DEFAULT 'active',
    CONSTRAINT "gate_passes_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "gate_passes_student_id_students_id_fk"
        FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "visitor_passes" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "visitor_name" text NOT NULL,
    "national_id" text NOT NULL,
    "phone" text NOT NULL,
    "vehicle_reg" text,
    "person_to_visit" text NOT NULL,
    "department" text NOT NULL,
    "purpose" text NOT NULL,
    "badge_number" text NOT NULL,
    "time_in" text NOT NULL,
    "time_out" text,
    "status" text NOT NULL DEFAULT 'on_campus',
    CONSTRAINT "visitor_passes_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "donations" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "donor_name" text NOT NULL,
    "amount" integer NOT NULL,
    "category" text NOT NULL,
    "receipt_no" text NOT NULL,
    "donation_date" text NOT NULL,
    "notes" text,
    CONSTRAINT "donations_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "project_scores" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "student_id" text NOT NULL,
    "subject_code" text NOT NULL,
    "project_score" real NOT NULL,
    "uploaded_at" text NOT NULL,
    "uploaded_by" text NOT NULL,
    CONSTRAINT "project_scores_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "project_scores_student_id_students_id_fk"
        FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- -----------------------------------------------------------------------------
-- 12. DPA 2019 Compliance, Subscriptions, Platform Admins & Audits
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "consent_records" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "student_id" text NOT NULL,
    "parent_user_id" text NOT NULL,
    "consent_type" text NOT NULL,
    "granted" boolean NOT NULL,
    "granted_at" text NOT NULL,
    "ip_address" text NOT NULL,
    CONSTRAINT "consent_records_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "consent_records_student_id_students_id_fk"
        FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "data_requests" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "requester_user_id" text NOT NULL,
    "request_type" text NOT NULL,
    "status" text NOT NULL DEFAULT 'pending',
    "sla_due_date" text NOT NULL,
    "completed_at" text,
    "notes" text,
    "created_at" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "data_requests_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "breach_logs" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "detected_at" text NOT NULL,
    "description" text NOT NULL,
    "affected_users" integer NOT NULL,
    "notified_odpc_at" text,
    "remediation" text NOT NULL,
    CONSTRAINT "breach_logs_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "user_id" text NOT NULL,
    "action" text NOT NULL,
    "entity" text NOT NULL,
    "entity_id" text NOT NULL,
    "ip_address" text NOT NULL,
    "created_at" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "audit_logs_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" text PRIMARY KEY NOT NULL,
    "school_id" text NOT NULL,
    "plan" text NOT NULL,
    "start_date" text NOT NULL,
    "end_date" text NOT NULL,
    "amount" integer NOT NULL,
    "status" text NOT NULL DEFAULT 'active',
    CONSTRAINT "subscriptions_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "platform_admins" (
    "id" text PRIMARY KEY NOT NULL,
    "email" text NOT NULL UNIQUE,
    "password_hash" text NOT NULL,
    "name" text NOT NULL,
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "platform_audit_logs" (
    "id" text PRIMARY KEY NOT NULL,
    "actor_id" text NOT NULL,
    "school_id" text NOT NULL,
    "action" text NOT NULL,
    "entity" text NOT NULL,
    "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "school_snapshots" (
    "school_id" text PRIMARY KEY NOT NULL,
    "owner_uid" text,
    "payload" jsonb NOT NULL,
    "updated_at" timestamp NOT NULL DEFAULT now(),
    CONSTRAINT "school_snapshots_school_id_schools_id_fk"
        FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "school_snapshots_owner_uid_users_uid_fk"
        FOREIGN KEY ("owner_uid") REFERENCES "users"("uid") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- =============================================================================
-- 13. Multi-Tenant Data Isolation & Query Performance Indexes
-- =============================================================================

-- Users, Schools & Platform Admins
CREATE INDEX IF NOT EXISTS "idx_users_school_id" ON "users" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" ("email");
CREATE INDEX IF NOT EXISTS "idx_users_role_school" ON "users" ("role", "school_id");
CREATE INDEX IF NOT EXISTS "idx_schools_owner_uid" ON "schools" ("owner_uid");
CREATE INDEX IF NOT EXISTS "idx_schools_status" ON "schools" ("status");
CREATE INDEX IF NOT EXISTS "idx_platform_admins_email" ON "platform_admins" ("email");

-- Curriculum
CREATE INDEX IF NOT EXISTS "idx_school_levels_school_id" ON "school_levels" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_school_levels_school_order" ON "school_levels" ("school_id", "order_index");
CREATE INDEX IF NOT EXISTS "idx_subjects_school_id" ON "subjects" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_subjects_school_level" ON "subjects" ("school_id", "level_id");
CREATE INDEX IF NOT EXISTS "idx_subjects_school_code" ON "subjects" ("school_id", "code");
CREATE INDEX IF NOT EXISTS "idx_classes_school_id" ON "classes" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_classes_school_level" ON "classes" ("school_id", "level_id");
CREATE INDEX IF NOT EXISTS "idx_classes_school_teacher" ON "classes" ("school_id", "class_teacher_id");

-- Faculty, Parents & Learners
CREATE INDEX IF NOT EXISTS "idx_teachers_school_id" ON "teachers" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_teachers_school_user" ON "teachers" ("school_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_teachers_school_emp" ON "teachers" ("school_id", "employee_number");
CREATE INDEX IF NOT EXISTS "idx_parents_school_id" ON "parents" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_parents_school_user" ON "parents" ("school_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_students_school_id" ON "students" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_students_school_class" ON "students" ("school_id", "class_id");
CREATE INDEX IF NOT EXISTS "idx_students_school_level" ON "students" ("school_id", "level_id");
CREATE INDEX IF NOT EXISTS "idx_students_school_admission" ON "students" ("school_id", "admission_number");
CREATE INDEX IF NOT EXISTS "idx_students_school_parent" ON "students" ("school_id", "parent_user_id");
CREATE INDEX IF NOT EXISTS "idx_students_school_status" ON "students" ("school_id", "status");

-- Academics & Assessments
CREATE INDEX IF NOT EXISTS "idx_attendance_school_id" ON "attendance" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_attendance_school_date" ON "attendance" ("school_id", "date");
CREATE INDEX IF NOT EXISTS "idx_attendance_school_student_date" ON "attendance" ("school_id", "student_id", "date");
CREATE INDEX IF NOT EXISTS "idx_exams_school_id" ON "exams" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_exams_school_term_year" ON "exams" ("school_id", "term", "year");
CREATE INDEX IF NOT EXISTS "idx_grades_school_id" ON "grades" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_grades_school_exam_student" ON "grades" ("school_id", "exam_id", "student_id");
CREATE INDEX IF NOT EXISTS "idx_grades_school_subject" ON "grades" ("school_id", "subject_id");
CREATE INDEX IF NOT EXISTS "idx_report_cards_school_id" ON "report_cards" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_report_cards_school_student_exam" ON "report_cards" ("school_id", "student_id", "exam_id");
CREATE INDEX IF NOT EXISTS "idx_formative_assessments_school_id" ON "formative_assessments" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_formative_assessments_school_student_subj" ON "formative_assessments" ("school_id", "student_id", "subject_id");
CREATE INDEX IF NOT EXISTS "idx_timetable_school_id" ON "timetable" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_timetable_school_class_day" ON "timetable" ("school_id", "class_id", "day_of_week");
CREATE INDEX IF NOT EXISTS "idx_timetable_school_teacher_day" ON "timetable" ("school_id", "teacher_id", "day_of_week");

-- Finance & Billing
CREATE INDEX IF NOT EXISTS "idx_fee_structures_school_id" ON "fee_structures" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_fee_structures_school_class_term" ON "fee_structures" ("school_id", "class_id", "term", "year");
CREATE INDEX IF NOT EXISTS "idx_invoices_school_id" ON "invoices" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_invoices_school_student" ON "invoices" ("school_id", "student_id");
CREATE INDEX IF NOT EXISTS "idx_invoices_school_status" ON "invoices" ("school_id", "status");
CREATE INDEX IF NOT EXISTS "idx_invoices_school_number" ON "invoices" ("school_id", "invoice_number");
CREATE INDEX IF NOT EXISTS "idx_payments_school_id" ON "payments" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_payments_school_invoice" ON "payments" ("school_id", "invoice_id");
CREATE INDEX IF NOT EXISTS "idx_payments_school_date" ON "payments" ("school_id", "payment_date");

-- Communications
CREATE INDEX IF NOT EXISTS "idx_messages_school_id" ON "messages" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_messages_school_receiver" ON "messages" ("school_id", "receiver_user_id");
CREATE INDEX IF NOT EXISTS "idx_messages_school_student" ON "messages" ("school_id", "student_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_log_school_id" ON "notifications_log" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_log_school_student" ON "notifications_log" ("school_id", "student_id");
CREATE INDEX IF NOT EXISTS "idx_announcements_school_id" ON "announcements" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_announcements_school_audience" ON "announcements" ("school_id", "audience");

-- Library
CREATE INDEX IF NOT EXISTS "idx_books_school_id" ON "books" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_books_school_isbn" ON "books" ("school_id", "isbn");
CREATE INDEX IF NOT EXISTS "idx_book_loans_school_id" ON "book_loans" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_book_loans_school_student" ON "book_loans" ("school_id", "student_id");
CREATE INDEX IF NOT EXISTS "idx_book_loans_school_book_status" ON "book_loans" ("school_id", "book_id", "status");

-- Transport & Hostels
CREATE INDEX IF NOT EXISTS "idx_routes_school_id" ON "routes" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_route_stops_school_id" ON "route_stops" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_route_stops_school_route" ON "route_stops" ("school_id", "route_id");
CREATE INDEX IF NOT EXISTS "idx_student_transport_school_id" ON "student_transport" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_student_transport_school_student" ON "student_transport" ("school_id", "student_id");
CREATE INDEX IF NOT EXISTS "idx_hostels_school_id" ON "hostels" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_rooms_school_id" ON "rooms" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_rooms_school_hostel" ON "rooms" ("school_id", "hostel_id");
CREATE INDEX IF NOT EXISTS "idx_hostel_allocations_school_id" ON "hostel_allocations" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_hostel_allocations_school_student" ON "hostel_allocations" ("school_id", "student_id");

-- Staff HR & Payroll
CREATE INDEX IF NOT EXISTS "idx_staff_attendance_school_id" ON "staff_attendance" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_staff_attendance_school_teacher_date" ON "staff_attendance" ("school_id", "teacher_id", "date");
CREATE INDEX IF NOT EXISTS "idx_leave_requests_school_id" ON "leave_requests" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_leave_requests_school_teacher_status" ON "leave_requests" ("school_id", "teacher_id", "status");
CREATE INDEX IF NOT EXISTS "idx_payroll_school_id" ON "payroll" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_payroll_school_teacher_period" ON "payroll" ("school_id", "teacher_id", "year", "month");

-- Operations, Security & KJSEA
CREATE INDEX IF NOT EXISTS "idx_discipline_logs_school_id" ON "discipline_logs" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_discipline_logs_school_student" ON "discipline_logs" ("school_id", "student_id");
CREATE INDEX IF NOT EXISTS "idx_inventory_items_school_id" ON "inventory_items" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_inventory_items_school_category" ON "inventory_items" ("school_id", "category");
CREATE INDEX IF NOT EXISTS "idx_inventory_issues_school_id" ON "inventory_issues" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_inventory_issues_school_item" ON "inventory_issues" ("school_id", "item_id");
CREATE INDEX IF NOT EXISTS "idx_gate_passes_school_id" ON "gate_passes" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_gate_passes_school_student_status" ON "gate_passes" ("school_id", "student_id", "status");
CREATE INDEX IF NOT EXISTS "idx_visitor_passes_school_id" ON "visitor_passes" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_visitor_passes_school_status" ON "visitor_passes" ("school_id", "status");
CREATE INDEX IF NOT EXISTS "idx_donations_school_id" ON "donations" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_donations_school_date" ON "donations" ("school_id", "donation_date");
CREATE INDEX IF NOT EXISTS "idx_project_scores_school_id" ON "project_scores" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_project_scores_school_student" ON "project_scores" ("school_id", "student_id");

-- DPA 2019 Compliance, Audits, Subscriptions & Snapshots
CREATE INDEX IF NOT EXISTS "idx_consent_records_school_id" ON "consent_records" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_consent_records_school_student" ON "consent_records" ("school_id", "student_id");
CREATE INDEX IF NOT EXISTS "idx_data_requests_school_id" ON "data_requests" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_data_requests_school_status" ON "data_requests" ("school_id", "status");
CREATE INDEX IF NOT EXISTS "idx_breach_logs_school_id" ON "breach_logs" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_school_id" ON "audit_logs" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_school_created" ON "audit_logs" ("school_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_school_id" ON "subscriptions" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_school_status" ON "subscriptions" ("school_id", "status");
CREATE INDEX IF NOT EXISTS "idx_platform_audit_logs_school_id" ON "platform_audit_logs" ("school_id");
CREATE INDEX IF NOT EXISTS "idx_platform_audit_logs_created" ON "platform_audit_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_school_snapshots_owner_uid" ON "school_snapshots" ("owner_uid");

COMMIT;
