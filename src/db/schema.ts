import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// Authenticated users (linked to Firebase Auth UID & tenant school users)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  appUserId: text('app_user_id'),
  email: text('email').notNull(),
  passwordHash: text('password_hash'),
  fullName: text('full_name'),
  phone: text('phone'),
  photoUrl: text('photo_url'),
  role: text('role').notNull().default('SCHOOL_ADMIN'),
  schoolId: text('school_id'),
  isActive: boolean('is_active').notNull().default(true),
  resetToken: text('reset_token').unique(),
  resetTokenExpiresAt: timestamp('reset_token_expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Multi-tenant schools
export const schools = pgTable('schools', {
  id: text('id').primaryKey(),
  ownerUid: text('owner_uid').references(() => users.uid),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  logoUrl: text('logo_url'),
  address: text('address').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  plan: text('plan').notNull().default('free'),
  status: text('status').notNull().default('active'),
  currentTerm: text('current_term').notNull().default('Term 1'),
  academicYear: integer('academic_year').notNull().default(2026),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Curriculum levels (PP1 - Grade 9)
export const schoolLevels = pgTable('school_levels', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  orderIndex: integer('order_index').notNull(),
});

// CBC subjects / learning areas
export const subjects = pgTable('subjects', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  levelId: text('level_id')
    .notNull()
    .references(() => schoolLevels.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  code: text('code').notNull(),
  isOptional: boolean('is_optional').notNull().default(false),
});

// Classes and streams
export const classes = pgTable('classes', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  levelId: text('level_id')
    .notNull()
    .references(() => schoolLevels.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  stream: text('stream').notNull(),
  classTeacherId: text('class_teacher_id'),
});

// Teachers & faculty
export const teachers = pgTable('teachers', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  employeeNumber: text('employee_number').notNull(),
  subjectSpecialty: text('subject_specialty').notNull(),
  hireDate: text('hire_date').notNull(),
  assignedLevelIds: jsonb('assigned_level_ids').$type<string[]>().notNull().default([]),
  assignedClassIds: jsonb('assigned_class_ids').$type<string[]>().notNull().default([]),
  isActive: boolean('is_active').notNull().default(true),
});

// Parents & guardians
export const parents = pgTable('parents', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  relationship: text('relationship').notNull(),
  occupation: text('occupation'),
  linkedStudentIds: jsonb('linked_student_ids').$type<string[]>().notNull().default([]),
});

// Enrolled learners
export const students = pgTable('students', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  userId: text('user_id'),
  admissionNumber: text('admission_number').notNull(),
  fullName: text('full_name').notNull(),
  levelId: text('level_id').notNull(),
  classId: text('class_id').notNull(),
  parentUserId: text('parent_user_id'),
  upi: text('upi'),
  dob: text('dob').notNull(),
  gender: text('gender').notNull(),
  studentType: text('student_type').notNull().default('day'),
  photoUrl: text('photo_url'),
  kpseaScore: real('kpsea_score'),
  sbaScore: real('sba_score'),
  placementScore: real('placement_score'),
  pathwayPreference: text('pathway_preference'),
  status: text('status').notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Daily learner attendance
export const attendance = pgTable('attendance', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  studentId: text('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  status: text('status').notNull(),
  markedByTeacherId: text('marked_by_teacher_id').notNull(),
  remarks: text('remarks'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Examinations
export const exams = pgTable('exams', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  term: text('term').notNull(),
  year: integer('year').notNull(),
  examType: text('exam_type').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  isPublished: boolean('is_published').notNull().default(false),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// CBC rubric grades and marks
export const grades = pgTable('grades', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  examId: text('exam_id')
    .notNull()
    .references(() => exams.id, { onDelete: 'cascade' }),
  studentId: text('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  subjectId: text('subject_id').notNull(),
  marks: real('marks'),
  rubricLevel: text('rubric_level').notNull(),
  points: integer('points').notNull(),
  teacherComment: text('teacher_comment').notNull().default(''),
  enteredByTeacherId: text('entered_by_teacher_id').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Report cards
export const reportCards = pgTable('report_cards', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  studentId: text('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  examId: text('exam_id')
    .notNull()
    .references(() => exams.id, { onDelete: 'cascade' }),
  pdfUrl: text('pdf_url'),
  published: boolean('published').notNull().default(false),
  publishedAt: text('published_at'),
  classTeacherRemark: text('class_teacher_remark').notNull().default(''),
  principalRemark: text('principal_remark').notNull().default(''),
});

// Strand-based formative assessments
export const formativeAssessments = pgTable('formative_assessments', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  studentId: text('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  subjectId: text('subject_id').notNull(),
  strand: text('strand').notNull(),
  subStrand: text('sub_strand').notNull(),
  rubricLevel: text('rubric_level').notNull(),
  points: integer('points').notNull(),
  assessedByTeacherId: text('assessed_by_teacher_id').notNull(),
  assessmentDate: text('assessment_date').notNull(),
  comment: text('comment').notNull().default(''),
});

// Weekly timetable slots
export const timetableSlots = pgTable('timetable_slots', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  classId: text('class_id').notNull(),
  subjectId: text('subject_id').notNull(),
  teacherId: text('teacher_id').notNull(),
  dayOfWeek: integer('day_of_week').notNull(),
  period: integer('period').notNull(),
  startTime: text('start_time').notNull(),
  endTime: text('end_time').notNull(),
  room: text('room').notNull(),
});

// Fee structures
export const feeStructures = pgTable('fee_structures', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  classId: text('class_id').notNull(),
  term: text('term').notNull(),
  year: integer('year').notNull(),
  lineItems: jsonb('line_items')
    .$type<Array<{ name: string; amount: number; applies_to: 'all' | 'day_only' | 'boarding_only' }>>()
    .notNull()
    .default([]),
  totalDayAmount: integer('total_day_amount').notNull().default(0),
  totalBoardingAmount: integer('total_boarding_amount').notNull().default(0),
});

// Fee invoices
export const invoices = pgTable('invoices', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  studentId: text('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  feeStructureId: text('fee_structure_id').notNull(),
  invoiceNumber: text('invoice_number').notNull(),
  amountDue: integer('amount_due').notNull(),
  amountPaid: integer('amount_paid').notNull().default(0),
  balance: integer('balance').notNull(),
  dueDate: text('due_date').notNull(),
  status: text('status').notNull().default('unpaid'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Fee payments
export const payments = pgTable('payments', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  invoiceId: text('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  amountPaid: integer('amount_paid').notNull(),
  paymentDate: text('payment_date').notNull(),
  method: text('method').notNull(),
  reference: text('reference').notNull(),
  receiptNumber: text('receipt_number').notNull(),
  receiptPdfUrl: text('receipt_pdf_url'),
  recordedBy: text('recorded_by').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Messaging, notifications & announcements
export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  senderUserId: text('sender_user_id').notNull(),
  receiverUserId: text('receiver_user_id').notNull(),
  studentId: text('student_id').notNull(),
  body: text('body').notNull(),
  readAt: text('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notificationsLog = pgTable('notifications_log', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  userId: text('user_id'),
  studentId: text('student_id'),
  examId: text('exam_id'),
  channel: text('channel').notNull(),
  phoneOrEmail: text('phone_or_email').notNull(),
  message: text('message').notNull(),
  status: text('status').notNull(),
  providerResponse: text('provider_response'),
  sentAt: text('sent_at').notNull(),
});

export const announcements = pgTable('announcements', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: text('body').notNull(),
  audience: text('audience').notNull(),
  postedBy: text('posted_by').notNull(),
  smsSent: boolean('sms_sent').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Library
export const books = pgTable('books', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  author: text('author').notNull(),
  isbn: text('isbn').notNull(),
  category: text('category').notNull(),
  totalCopies: integer('total_copies').notNull(),
  availableCopies: integer('available_copies').notNull(),
});

export const bookLoans = pgTable('book_loans', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  bookId: text('book_id')
    .notNull()
    .references(() => books.id, { onDelete: 'cascade' }),
  studentId: text('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  borrowedAt: text('borrowed_at').notNull(),
  dueDate: text('due_date').notNull(),
  returnedAt: text('returned_at'),
  fineAmount: integer('fine_amount').notNull().default(0),
  status: text('status').notNull().default('active'),
});

// Transport
export const transportRoutes = pgTable('transport_routes', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description').notNull(),
  feePerTerm: integer('fee_per_term').notNull(),
});

export const routeStops = pgTable('route_stops', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  routeId: text('route_id')
    .notNull()
    .references(() => transportRoutes.id, { onDelete: 'cascade' }),
  stopName: text('stop_name').notNull(),
  pickupTime: text('pickup_time').notNull(),
  dropoffTime: text('dropoff_time').notNull(),
  orderIndex: integer('order_index').notNull(),
});

export const studentTransports = pgTable('student_transports', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  studentId: text('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  routeId: text('route_id')
    .notNull()
    .references(() => transportRoutes.id, { onDelete: 'cascade' }),
  stopId: text('stop_id')
    .notNull()
    .references(() => routeStops.id, { onDelete: 'cascade' }),
  term: text('term').notNull(),
  year: integer('year').notNull(),
});

// Hostels & boarding
export const hostels = pgTable('hostels', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  gender: text('gender').notNull(),
  capacity: integer('capacity').notNull(),
});

export const hostelRooms = pgTable('hostel_rooms', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  hostelId: text('hostel_id')
    .notNull()
    .references(() => hostels.id, { onDelete: 'cascade' }),
  roomNumber: text('room_number').notNull(),
  capacity: integer('capacity').notNull(),
});

export const hostelAllocations = pgTable('hostel_allocations', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  studentId: text('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  roomId: text('room_id')
    .notNull()
    .references(() => hostelRooms.id, { onDelete: 'cascade' }),
  term: text('term').notNull(),
  year: integer('year').notNull(),
  checkInDate: text('check_in_date').notNull(),
  checkOutDate: text('check_out_date'),
});

// Staff HR & Payroll
export const staffAttendance = pgTable('staff_attendance', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  teacherId: text('teacher_id')
    .notNull()
    .references(() => teachers.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  status: text('status').notNull(),
  checkIn: text('check_in'),
  checkOut: text('check_out'),
});

export const leaveRequests = pgTable('leave_requests', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  teacherId: text('teacher_id')
    .notNull()
    .references(() => teachers.id, { onDelete: 'cascade' }),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  reason: text('reason').notNull(),
  status: text('status').notNull().default('pending'),
  approvedBy: text('approved_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const payrollRecords = pgTable('payroll_records', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  teacherId: text('teacher_id')
    .notNull()
    .references(() => teachers.id, { onDelete: 'cascade' }),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  basicSalary: integer('basic_salary').notNull(),
  allowances: integer('allowances').notNull().default(0),
  deductions: integer('deductions').notNull().default(0),
  netPay: integer('net_pay').notNull(),
  status: text('status').notNull().default('pending'),
  paidAt: text('paid_at'),
  payslipPdfUrl: text('payslip_pdf_url'),
});

// Operations, Security & KJSEA
export const disciplineLogs = pgTable('discipline_logs', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  studentId: text('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  incidentDate: text('incident_date').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  actionTaken: text('action_taken').notNull(),
  recordedBy: text('recorded_by').notNull(),
});

export const inventoryItems = pgTable('inventory_items', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: integer('unit_price').notNull(),
});

export const inventoryIssues = pgTable('inventory_issues', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  itemId: text('item_id')
    .notNull()
    .references(() => inventoryItems.id, { onDelete: 'cascade' }),
  issuedToUserId: text('issued_to_user_id').notNull(),
  quantity: integer('quantity').notNull(),
  issueDate: text('issue_date').notNull(),
  notes: text('notes'),
});

export const gatePasses = pgTable('gate_passes', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  studentId: text('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  outTime: text('out_time').notNull(),
  inTime: text('in_time'),
  approvedBy: text('approved_by').notNull(),
  pickedUpBy: text('picked_up_by'),
  contactPhone: text('contact_phone'),
  status: text('status').notNull().default('active'),
});

export const visitorPasses = pgTable('visitor_passes', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  visitorName: text('visitor_name').notNull(),
  nationalId: text('national_id').notNull(),
  phone: text('phone').notNull(),
  vehicleReg: text('vehicle_reg'),
  personToVisit: text('person_to_visit').notNull(),
  department: text('department').notNull(),
  purpose: text('purpose').notNull(),
  badgeNumber: text('badge_number').notNull(),
  timeIn: text('time_in').notNull(),
  timeOut: text('time_out'),
  status: text('status').notNull().default('on_campus'),
});

export const donations = pgTable('donations', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  donorName: text('donor_name').notNull(),
  amount: integer('amount').notNull(),
  category: text('category').notNull(),
  receiptNo: text('receipt_no').notNull(),
  donationDate: text('donation_date').notNull(),
  notes: text('notes'),
});

export const projectScores = pgTable('project_scores', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  studentId: text('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  subjectCode: text('subject_code').notNull(),
  projectScore: real('project_score').notNull(),
  uploadedAt: text('uploaded_at').notNull(),
  uploadedBy: text('uploaded_by').notNull(),
});

// DPA 2019 Compliance, Subscriptions & Audits
export const consentRecords = pgTable('consent_records', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  studentId: text('student_id')
    .notNull()
    .references(() => students.id, { onDelete: 'cascade' }),
  parentUserId: text('parent_user_id').notNull(),
  consentType: text('consent_type').notNull(),
  granted: boolean('granted').notNull(),
  grantedAt: text('granted_at').notNull(),
  ipAddress: text('ip_address').notNull(),
});

export const dataRequests = pgTable('data_requests', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  requesterUserId: text('requester_user_id').notNull(),
  requestType: text('request_type').notNull(),
  status: text('status').notNull().default('pending'),
  slaDueDate: text('sla_due_date').notNull(),
  completedAt: text('completed_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const breachLogs = pgTable('breach_logs', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  detectedAt: text('detected_at').notNull(),
  description: text('description').notNull(),
  affectedUsers: integer('affected_users').notNull(),
  notifiedOdpcAt: text('notified_odpc_at'),
  remediation: text('remediation').notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id').notNull(),
  ipAddress: text('ip_address').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(),
  schoolId: text('school_id')
    .notNull()
    .references(() => schools.id, { onDelete: 'cascade' }),
  plan: text('plan').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  amount: integer('amount').notNull(),
  status: text('status').notNull().default('active'),
});

export const platformAdmins = pgTable('platform_admins', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const platformAuditLogs = pgTable('platform_audit_logs', {
  id: text('id').primaryKey(),
  actorId: text('actor_id').notNull(),
  schoolId: text('school_id').notNull(),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Full school module state snapshot
export const schoolSnapshots = pgTable('school_snapshots', {
  schoolId: text('school_id')
    .primaryKey()
    .references(() => schools.id, { onDelete: 'cascade' }),
  ownerUid: text('owner_uid').references(() => users.uid),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  schools: many(schools),
}));

export const schoolsRelations = relations(schools, ({ one, many }) => ({
  owner: one(users, {
    fields: [schools.ownerUid],
    references: [users.uid],
  }),
  levels: many(schoolLevels),
  subjects: many(subjects),
  classes: many(classes),
  teachers: many(teachers),
  parents: many(parents),
  students: many(students),
  exams: many(exams),
  grades: many(grades),
  attendance: many(attendance),
  invoices: many(invoices),
  payments: many(payments),
  snapshot: one(schoolSnapshots, {
    fields: [schools.id],
    references: [schoolSnapshots.schoolId],
  }),
}));

export const schoolLevelsRelations = relations(schoolLevels, ({ one, many }) => ({
  school: one(schools, {
    fields: [schoolLevels.schoolId],
    references: [schools.id],
  }),
  subjects: many(subjects),
  classes: many(classes),
}));

export const subjectsRelations = relations(subjects, ({ one }) => ({
  school: one(schools, {
    fields: [subjects.schoolId],
    references: [schools.id],
  }),
  level: one(schoolLevels, {
    fields: [subjects.levelId],
    references: [schoolLevels.id],
  }),
}));

export const classesRelations = relations(classes, ({ one }) => ({
  school: one(schools, {
    fields: [classes.schoolId],
    references: [schools.id],
  }),
  level: one(schoolLevels, {
    fields: [classes.levelId],
    references: [schoolLevels.id],
  }),
}));

export const teachersRelations = relations(teachers, ({ one }) => ({
  school: one(schools, {
    fields: [teachers.schoolId],
    references: [schools.id],
  }),
}));

export const parentsRelations = relations(parents, ({ one }) => ({
  school: one(schools, {
    fields: [parents.schoolId],
    references: [schools.id],
  }),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  school: one(schools, {
    fields: [students.schoolId],
    references: [schools.id],
  }),
  grades: many(grades),
  attendance: many(attendance),
  invoices: many(invoices),
  reportCards: many(reportCards),
  formativeAssessments: many(formativeAssessments),
}));

export const examsRelations = relations(exams, ({ one, many }) => ({
  school: one(schools, {
    fields: [exams.schoolId],
    references: [schools.id],
  }),
  grades: many(grades),
  reportCards: many(reportCards),
}));

export const gradesRelations = relations(grades, ({ one }) => ({
  school: one(schools, {
    fields: [grades.schoolId],
    references: [schools.id],
  }),
  exam: one(exams, {
    fields: [grades.examId],
    references: [exams.id],
  }),
  student: one(students, {
    fields: [grades.studentId],
    references: [students.id],
  }),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  school: one(schools, {
    fields: [attendance.schoolId],
    references: [schools.id],
  }),
  student: one(students, {
    fields: [attendance.studentId],
    references: [students.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  school: one(schools, {
    fields: [invoices.schoolId],
    references: [schools.id],
  }),
  student: one(students, {
    fields: [invoices.studentId],
    references: [students.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  school: one(schools, {
    fields: [payments.schoolId],
    references: [schools.id],
  }),
  invoice: one(invoices, {
    fields: [payments.invoiceId],
    references: [invoices.id],
  }),
}));
