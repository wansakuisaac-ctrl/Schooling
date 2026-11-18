CREATE TABLE "announcements" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"audience" text NOT NULL,
	"posted_by" text NOT NULL,
	"sms_sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"student_id" text NOT NULL,
	"date" text NOT NULL,
	"status" text NOT NULL,
	"marked_by_teacher_id" text NOT NULL,
	"remarks" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"user_id" text NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"ip_address" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "book_loans" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"book_id" text NOT NULL,
	"student_id" text NOT NULL,
	"borrowed_at" text NOT NULL,
	"due_date" text NOT NULL,
	"returned_at" text,
	"fine_amount" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"isbn" text NOT NULL,
	"category" text NOT NULL,
	"total_copies" integer NOT NULL,
	"available_copies" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "breach_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"detected_at" text NOT NULL,
	"description" text NOT NULL,
	"affected_users" integer NOT NULL,
	"notified_odpc_at" text,
	"remediation" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"level_id" text NOT NULL,
	"name" text NOT NULL,
	"stream" text NOT NULL,
	"class_teacher_id" text
);
--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"student_id" text NOT NULL,
	"parent_user_id" text NOT NULL,
	"consent_type" text NOT NULL,
	"granted" boolean NOT NULL,
	"granted_at" text NOT NULL,
	"ip_address" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"requester_user_id" text NOT NULL,
	"request_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"sla_due_date" text NOT NULL,
	"completed_at" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discipline_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"student_id" text NOT NULL,
	"incident_date" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"action_taken" text NOT NULL,
	"recorded_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "donations" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"donor_name" text NOT NULL,
	"amount" integer NOT NULL,
	"category" text NOT NULL,
	"receipt_no" text NOT NULL,
	"donation_date" text NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "exams" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"name" text NOT NULL,
	"term" text NOT NULL,
	"year" integer NOT NULL,
	"exam_type" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_structures" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"class_id" text NOT NULL,
	"term" text NOT NULL,
	"year" integer NOT NULL,
	"line_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_day_amount" integer DEFAULT 0 NOT NULL,
	"total_boarding_amount" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "formative_assessments" (
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
	"comment" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gate_passes" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"student_id" text NOT NULL,
	"reason" text NOT NULL,
	"out_time" text NOT NULL,
	"in_time" text,
	"approved_by" text NOT NULL,
	"picked_up_by" text,
	"contact_phone" text,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grades" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"exam_id" text NOT NULL,
	"student_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"marks" real,
	"rubric_level" text NOT NULL,
	"points" integer NOT NULL,
	"teacher_comment" text DEFAULT '' NOT NULL,
	"entered_by_teacher_id" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hostel_allocations" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"student_id" text NOT NULL,
	"room_id" text NOT NULL,
	"term" text NOT NULL,
	"year" integer NOT NULL,
	"check_in_date" text NOT NULL,
	"check_out_date" text
);
--> statement-breakpoint
CREATE TABLE "hostel_rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"hostel_id" text NOT NULL,
	"room_number" text NOT NULL,
	"capacity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hostels" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"name" text NOT NULL,
	"gender" text NOT NULL,
	"capacity" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_issues" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"item_id" text NOT NULL,
	"issued_to_user_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"issue_date" text NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"student_id" text NOT NULL,
	"fee_structure_id" text NOT NULL,
	"invoice_number" text NOT NULL,
	"amount_due" integer NOT NULL,
	"amount_paid" integer DEFAULT 0 NOT NULL,
	"balance" integer NOT NULL,
	"due_date" text NOT NULL,
	"status" text DEFAULT 'unpaid' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"teacher_id" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"approved_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"sender_user_id" text NOT NULL,
	"receiver_user_id" text NOT NULL,
	"student_id" text NOT NULL,
	"body" text NOT NULL,
	"read_at" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications_log" (
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
	"sent_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parents" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"user_id" text NOT NULL,
	"relationship" text NOT NULL,
	"occupation" text,
	"linked_student_ids" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
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
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_records" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"teacher_id" text NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"basic_salary" integer NOT NULL,
	"allowances" integer DEFAULT 0 NOT NULL,
	"deductions" integer DEFAULT 0 NOT NULL,
	"net_pay" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"paid_at" text,
	"payslip_pdf_url" text
);
--> statement-breakpoint
CREATE TABLE "platform_audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"school_id" text NOT NULL,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_scores" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"student_id" text NOT NULL,
	"subject_code" text NOT NULL,
	"project_score" real NOT NULL,
	"uploaded_at" text NOT NULL,
	"uploaded_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"student_id" text NOT NULL,
	"exam_id" text NOT NULL,
	"pdf_url" text,
	"published" boolean DEFAULT false NOT NULL,
	"published_at" text,
	"class_teacher_remark" text DEFAULT '' NOT NULL,
	"principal_remark" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "route_stops" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"route_id" text NOT NULL,
	"stop_name" text NOT NULL,
	"pickup_time" text NOT NULL,
	"dropoff_time" text NOT NULL,
	"order_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_levels" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"name" text NOT NULL,
	"order_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_snapshots" (
	"school_id" text PRIMARY KEY NOT NULL,
	"owner_uid" text,
	"payload" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_uid" text,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"address" text NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"current_term" text DEFAULT 'Term 1' NOT NULL,
	"academic_year" integer DEFAULT 2026 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "schools_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "staff_attendance" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"teacher_id" text NOT NULL,
	"date" text NOT NULL,
	"status" text NOT NULL,
	"check_in" text,
	"check_out" text
);
--> statement-breakpoint
CREATE TABLE "student_transports" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"student_id" text NOT NULL,
	"route_id" text NOT NULL,
	"stop_id" text NOT NULL,
	"term" text NOT NULL,
	"year" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
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
	"student_type" text DEFAULT 'day' NOT NULL,
	"photo_url" text,
	"kpsea_score" real,
	"sba_score" real,
	"placement_score" real,
	"pathway_preference" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"level_id" text NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"is_optional" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"plan" text NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teachers" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"user_id" text NOT NULL,
	"employee_number" text NOT NULL,
	"subject_specialty" text NOT NULL,
	"hire_date" text NOT NULL,
	"assigned_level_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"assigned_class_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timetable_slots" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"class_id" text NOT NULL,
	"subject_id" text NOT NULL,
	"teacher_id" text NOT NULL,
	"day_of_week" integer NOT NULL,
	"period" integer NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"room" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transport_routes" (
	"id" text PRIMARY KEY NOT NULL,
	"school_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"fee_per_term" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"app_user_id" text,
	"email" text NOT NULL,
	"password_hash" text,
	"full_name" text,
	"phone" text,
	"photo_url" text,
	"role" text DEFAULT 'SCHOOL_ADMIN' NOT NULL,
	"school_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_uid_unique" UNIQUE("uid")
);
--> statement-breakpoint
CREATE TABLE "visitor_passes" (
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
	"status" text DEFAULT 'on_campus' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_loans" ADD CONSTRAINT "book_loans_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_loans" ADD CONSTRAINT "book_loans_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_loans" ADD CONSTRAINT "book_loans_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "breach_logs" ADD CONSTRAINT "breach_logs_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_level_id_school_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."school_levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_requests" ADD CONSTRAINT "data_requests_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discipline_logs" ADD CONSTRAINT "discipline_logs_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discipline_logs" ADD CONSTRAINT "discipline_logs_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exams" ADD CONSTRAINT "exams_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formative_assessments" ADD CONSTRAINT "formative_assessments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formative_assessments" ADD CONSTRAINT "formative_assessments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gate_passes" ADD CONSTRAINT "gate_passes_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gate_passes" ADD CONSTRAINT "gate_passes_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grades" ADD CONSTRAINT "grades_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel_allocations" ADD CONSTRAINT "hostel_allocations_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel_allocations" ADD CONSTRAINT "hostel_allocations_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel_allocations" ADD CONSTRAINT "hostel_allocations_room_id_hostel_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."hostel_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel_rooms" ADD CONSTRAINT "hostel_rooms_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostel_rooms" ADD CONSTRAINT "hostel_rooms_hostel_id_hostels_id_fk" FOREIGN KEY ("hostel_id") REFERENCES "public"."hostels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hostels" ADD CONSTRAINT "hostels_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_issues" ADD CONSTRAINT "inventory_issues_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_issues" ADD CONSTRAINT "inventory_issues_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications_log" ADD CONSTRAINT "notifications_log_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parents" ADD CONSTRAINT "parents_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_records" ADD CONSTRAINT "payroll_records_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_scores" ADD CONSTRAINT "project_scores_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_scores" ADD CONSTRAINT "project_scores_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_exam_id_exams_id_fk" FOREIGN KEY ("exam_id") REFERENCES "public"."exams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_route_id_transport_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."transport_routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_levels" ADD CONSTRAINT "school_levels_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_snapshots" ADD CONSTRAINT "school_snapshots_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_snapshots" ADD CONSTRAINT "school_snapshots_owner_uid_users_uid_fk" FOREIGN KEY ("owner_uid") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schools" ADD CONSTRAINT "schools_owner_uid_users_uid_fk" FOREIGN KEY ("owner_uid") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_attendance" ADD CONSTRAINT "staff_attendance_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_attendance" ADD CONSTRAINT "staff_attendance_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_transports" ADD CONSTRAINT "student_transports_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_transports" ADD CONSTRAINT "student_transports_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_transports" ADD CONSTRAINT "student_transports_route_id_transport_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."transport_routes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_transports" ADD CONSTRAINT "student_transports_stop_id_route_stops_id_fk" FOREIGN KEY ("stop_id") REFERENCES "public"."route_stops"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_level_id_school_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."school_levels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_routes" ADD CONSTRAINT "transport_routes_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitor_passes" ADD CONSTRAINT "visitor_passes_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;