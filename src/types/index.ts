export type Role = 'PLATFORM_OWNER' | 'SCHOOL_ADMIN' | 'TEACHER' | 'PARENT' | 'STUDENT';

export type PlanType = 'free' | 'basic' | 'pro';
export type SchoolStatus = 'active' | 'suspended';

export interface School {
  id: string;
  slug: string;
  name: string;
  logo_url?: string;
  address: string;
  phone: string;
  email: string;
  plan: PlanType;
  status: SchoolStatus;
  created_at: string;
  current_term: string;
  academic_year: number;
  profile_setup_completed?: boolean;
}

export interface User {
  id: string;
  school_id: string;
  email: string;
  password_hash?: string;
  role: Role;
  full_name: string;
  phone: string;
  photo_url?: string;
  is_active: boolean;
  needs_profile_setup?: boolean;
  created_at: string;
}

export interface SchoolLevel {
  id: string;
  school_id: string;
  name: string; // e.g. PP1, PP2, Grade 1 ... Grade 9
  order_index: number;
}

export interface Subject {
  id: string;
  school_id: string;
  level_id: string;
  name: string;
  code: string;
  is_optional: boolean;
}

export interface SchoolClass {
  id: string;
  school_id: string;
  level_id: string;
  name: string; // e.g. Grade 4
  stream: string; // e.g. Blue, Red, Alpha
  class_teacher_id?: string;
}

export type StudentType = 'day' | 'boarding';
export type StudentStatus = 'active' | 'inactive' | 'graduated' | 'transferred';
export type PathwayPreference = 'STEM' | 'Arts' | 'Sports' | 'SocialSciences';

export interface Student {
  id: string;
  school_id: string;
  user_id?: string;
  admission_number: string;
  full_name: string;
  level_id: string;
  class_id: string;
  parent_user_id?: string;
  upi?: string;
  dob: string;
  gender: 'male' | 'female' | 'other';
  student_type: StudentType;
  photo_url?: string;
  kpsea_score?: number; // Grade 6 national score (0-100)
  sba_score?: number; // School Based Assessment (0-100)
  placement_score?: number; // Computed Grade 9 KJSEA placement
  pathway_preference?: PathwayPreference;
  status: StudentStatus;
  created_at: string;
}

export interface Teacher {
  id: string;
  school_id: string;
  user_id: string;
  employee_number: string;
  subject_specialty: string;
  hire_date: string;
  assigned_level_ids: string[];
  assigned_class_ids: string[];
  is_active: boolean;
}

export interface Parent {
  id: string;
  school_id: string;
  user_id: string;
  relationship: 'father' | 'mother' | 'guardian' | 'other';
  occupation?: string;
  linked_student_ids: string[];
}

export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface Attendance {
  id: string;
  school_id: string;
  student_id: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  marked_by_teacher_id: string;
  remarks?: string;
}

export type ExamType = 'CAT' | 'Midterm' | 'Endterm';

export interface Exam {
  id: string;
  school_id: string;
  name: string;
  term: string; // Term 1, Term 2, Term 3
  year: number;
  exam_type: ExamType;
  start_date: string;
  end_date: string;
  is_published: boolean;
}

export type RubricLevel = 'EE1' | 'EE2' | 'ME1' | 'ME2' | 'AE1' | 'AE2' | 'BE1' | 'BE2';

export interface RubricDefinition {
  code: RubricLevel;
  minMark: number;
  maxMark: number;
  points: number;
  description: 'Exceeding Expectation' | 'Meeting Expectation' | 'Approaching Expectation' | 'Below Expectation';
  color: string;
}

export interface Grade {
  id: string;
  school_id: string;
  exam_id: string;
  student_id: string;
  subject_id: string;
  marks?: number | null; // Nullable for PP1-Grade 3
  rubric_level: RubricLevel;
  points: number; // 1-8
  teacher_comment: string;
  entered_by_teacher_id: string;
}

export interface ReportCard {
  id: string;
  school_id: string;
  student_id: string;
  exam_id: string;
  pdf_url?: string;
  published: boolean;
  published_at?: string;
  class_teacher_remark: string;
  principal_remark: string;
}

export interface FormativeAssessment {
  id: string;
  school_id: string;
  student_id: string;
  subject_id: string;
  strand: string;
  sub_strand: string;
  rubric_level: RubricLevel;
  points: number;
  assessed_by_teacher_id: string;
  assessment_date: string;
  comment: string;
}

export interface TimetableSlot {
  id: string;
  school_id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  day_of_week: number; // 1 = Monday ... 5 = Friday
  period: number; // 1 to 8
  start_time: string;
  end_time: string;
  room: string;
}

export interface FeeStructureLineItem {
  name: string;
  amount: number;
  applies_to: 'all' | 'day_only' | 'boarding_only';
}

export interface FeeStructure {
  id: string;
  school_id: string;
  class_id: string;
  term: string;
  year: number;
  line_items: FeeStructureLineItem[];
  total_day_amount: number;
  total_boarding_amount: number;
}

export type InvoiceStatus = 'unpaid' | 'partial' | 'paid' | 'overdue';

export interface Invoice {
  id: string;
  school_id: string;
  student_id: string;
  fee_structure_id: string;
  invoice_number: string;
  amount_due: number;
  amount_paid: number;
  balance: number;
  due_date: string;
  status: InvoiceStatus;
  created_at: string;
}

export type PaymentMethod = 'mpesa' | 'cash' | 'bank' | 'cheque';

export interface Payment {
  id: string;
  school_id: string;
  invoice_id: string;
  amount_paid: number;
  payment_date: string;
  method: PaymentMethod;
  reference: string;
  receipt_number: string;
  receipt_pdf_url?: string;
  recorded_by: string;
}

export interface Message {
  id: string;
  school_id: string;
  sender_user_id: string;
  receiver_user_id: string;
  student_id: string;
  body: string;
  read_at?: string;
  created_at: string;
}

export interface NotificationLog {
  id: string;
  school_id: string;
  user_id?: string;
  student_id?: string;
  exam_id?: string;
  channel: 'sms' | 'email';
  phone_or_email: string;
  message: string;
  status: 'sent' | 'failed' | 'pending';
  provider_response?: string;
  sent_at: string;
}

export interface Announcement {
  id: string;
  school_id: string;
  title: string;
  body: string;
  audience: 'all' | 'teachers' | 'parents';
  posted_by: string;
  created_at: string;
  sms_sent: boolean;
}

export interface Book {
  id: string;
  school_id: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  total_copies: number;
  available_copies: number;
}

export interface BookLoan {
  id: string;
  school_id: string;
  book_id: string;
  student_id: string;
  borrowed_at: string;
  due_date: string;
  returned_at?: string;
  fine_amount: number;
  status: 'active' | 'returned' | 'overdue';
}

export interface TransportRoute {
  id: string;
  school_id: string;
  name: string;
  description: string;
  fee_per_term: number;
}

export interface RouteStop {
  id: string;
  school_id: string;
  route_id: string;
  stop_name: string;
  pickup_time: string;
  dropoff_time: string;
  order_index: number;
}

export interface StudentTransport {
  id: string;
  school_id: string;
  student_id: string;
  route_id: string;
  stop_id: string;
  term: string;
  year: number;
}

export interface Hostel {
  id: string;
  school_id: string;
  name: string;
  gender: 'male' | 'female';
  capacity: number;
}

export interface HostelRoom {
  id: string;
  school_id: string;
  hostel_id: string;
  room_number: string;
  capacity: number;
}

export interface HostelAllocation {
  id: string;
  school_id: string;
  student_id: string;
  room_id: string;
  term: string;
  year: number;
  check_in_date: string;
  check_out_date?: string;
}

export interface StaffAttendance {
  id: string;
  school_id: string;
  teacher_id: string;
  date: string;
  status: 'present' | 'absent' | 'late' | 'on_leave';
  check_in?: string;
  check_out?: string;
}

export interface LeaveRequest {
  id: string;
  school_id: string;
  teacher_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  created_at: string;
}

export interface PayrollRecord {
  id: string;
  school_id: string;
  teacher_id: string;
  month: number;
  year: number;
  basic_salary: number;
  allowances: number;
  deductions: number;
  net_pay: number;
  status: 'pending' | 'paid';
  paid_at?: string;
  payslip_pdf_url?: string;
}

export interface DisciplineLog {
  id: string;
  school_id: string;
  student_id: string;
  incident_date: string;
  category: 'minor' | 'major';
  description: string;
  action_taken: string;
  recorded_by: string;
}

export interface InventoryItem {
  id: string;
  school_id: string;
  name: string;
  category: string;
  quantity: number;
  unit_price: number;
}

export interface InventoryIssue {
  id: string;
  school_id: string;
  item_id: string;
  issued_to_user_id: string;
  quantity: number;
  issue_date: string;
  notes?: string;
}

export interface GatePass {
  id: string;
  school_id: string;
  student_id: string;
  reason: string;
  out_time: string;
  in_time?: string;
  approved_by: string;
  picked_up_by?: string;
  contact_phone?: string;
  status: 'active' | 'returned' | 'overdue';
}

export interface VisitorPass {
  id: string;
  school_id: string;
  visitor_name: string;
  national_id: string;
  phone: string;
  vehicle_reg?: string;
  person_to_visit: string;
  department: string;
  purpose: string;
  badge_number: string;
  time_in: string;
  time_out?: string;
  status: 'on_campus' | 'checked_out';
}

export interface Donation {
  id: string;
  school_id: string;
  donor_name: string;
  amount: number;
  category: string;
  receipt_no: string;
  donation_date: string;
  notes?: string;
}

export interface ProjectScore {
  id: string;
  school_id: string;
  student_id: string;
  subject_code: string; // e.g. 911, 912, 906
  project_score: number; // 0-100
  uploaded_at: string;
  uploaded_by: string;
}

export interface ConsentRecord {
  id: string;
  school_id: string;
  student_id: string;
  parent_user_id: string;
  consent_type: 'data_processing' | 'photo_use' | 'sms_communication';
  granted: boolean;
  granted_at: string;
  ip_address: string;
}

export interface DataRequest {
  id: string;
  school_id: string;
  requester_user_id: string;
  request_type: 'access' | 'deletion' | 'rectification';
  status: 'pending' | 'completed' | 'rejected';
  sla_due_date: string;
  completed_at?: string;
  notes?: string;
  created_at: string;
}

export interface BreachLog {
  id: string;
  school_id: string;
  detected_at: string;
  description: string;
  affected_users: number;
  notified_odpc_at?: string;
  remediation: string;
}

export interface AuditLog {
  id: string;
  school_id: string;
  user_id: string;
  action: string;
  entity: string;
  entity_id: string;
  ip_address: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  school_id: string;
  plan: PlanType;
  start_date: string;
  end_date: string;
  amount: number;
  status: 'active' | 'expired' | 'cancelled';
}

export interface PlatformAdmin {
  id: string;
  email: string;
  password_hash: string;
  name: string;
}

export interface PlatformAuditLog {
  id: string;
  actor_id: string;
  school_id: string;
  action: string;
  entity: string;
  created_at: string;
}
