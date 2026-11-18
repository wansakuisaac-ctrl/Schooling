import {
  School,
  SchoolLevel,
  Subject,
  SchoolClass,
  User,
  Role,
  Student,
  Teacher,
  Parent,
  Exam,
  Grade,
  Attendance,
  FeeStructure,
  Invoice,
  Payment,
  TimetableSlot,
  Message,
  Announcement,
  Book,
  BookLoan,
  TransportRoute,
  RouteStop,
  StudentTransport,
  Hostel,
  HostelRoom,
  HostelAllocation,
  StaffAttendance,
  LeaveRequest,
  PayrollRecord,
  DisciplineLog,
  InventoryItem,
  InventoryIssue,
  GatePass,
  VisitorPass,
  Donation,
  ProjectScore,
  ConsentRecord,
  DataRequest,
  BreachLog,
  AuditLog,
  PlatformAdmin,
  PlatformAuditLog,
  FormativeAssessment,
  ReportCard,
  NotificationLog,
  PlanType,
  SchoolStatus,
  RubricLevel,
} from '../types';
import { initialPlatformAdmins, initialSchools, generateSeedDataForSchool, LEVEL_NAMES, getSubjectsForLevelName } from './seedData';
import { markToRubric, validateMarksRubricConflict } from './cbcRubric';

const DB_KEY = 'elimucore_clean_slate_v2';

function cleanLegacyStorage(): void {
  const legacyKeys = [
    'elimucore_cbcschools_db_v1',
    'elimucore_cbcschools_db_v2',
    'elimucore_cbcschools_db_v3',
    'elimucore_cbcschools_clean_v1',
    'elimucore_clean_production_db_v1',
  ];
  legacyKeys.forEach((k) => {
    try {
      localStorage.removeItem(k);
    } catch {}
  });
}

export interface DatabaseSchema {
  platformAdmins: PlatformAdmin[];
  schools: School[];
  platformAuditLogs: PlatformAuditLog[];
  levels: SchoolLevel[];
  subjects: Subject[];
  classes: SchoolClass[];
  users: User[];
  teachers: Teacher[];
  parents: Parent[];
  students: Student[];
  exams: Exam[];
  grades: Grade[];
  formativeAssessments: FormativeAssessment[];
  reportCards: ReportCard[];
  attendance: Attendance[];
  feeStructures: FeeStructure[];
  invoices: Invoice[];
  payments: Payment[];
  timetable: TimetableSlot[];
  messages: Message[];
  announcements: Announcement[];
  books: Book[];
  bookLoans: BookLoan[];
  routes: TransportRoute[];
  routeStops: RouteStop[];
  studentTransports: StudentTransport[];
  hostels: Hostel[];
  hostelRooms: HostelRoom[];
  hostelAllocations: HostelAllocation[];
  staffAttendances: StaffAttendance[];
  leaveRequests: LeaveRequest[];
  payrollRecords: PayrollRecord[];
  projectScores: ProjectScore[];
  disciplineLogs: DisciplineLog[];
  inventoryItems: InventoryItem[];
  inventoryIssues: InventoryIssue[];
  gatePasses: GatePass[];
  visitorPasses?: VisitorPass[];
  donations: Donation[];
  consentRecords: ConsentRecord[];
  dataRequests: DataRequest[];
  breachLogs: BreachLog[];
  auditLogs: AuditLog[];
  notificationsLog: NotificationLog[];
}

function initializeDatabase(): DatabaseSchema {
  cleanLegacyStorage();

  const existing = localStorage.getItem(DB_KEY);
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      if (parsed.schools && parsed.classes && parsed.subjects) {
        // Guarantee that no mock students or mock marks linger:
        parsed.students = (parsed.students || []).filter(
          (s: Student) =>
            !s.id.startsWith('std-s0-') &&
            !s.id.startsWith('std-s1-') &&
            !s.id.startsWith('std-s2-') &&
            !s.id.startsWith('std-cls-') &&
            s.admission_number !== 'KJA/2026/042' &&
            s.full_name !== 'Brian Otieno'
        );
        parsed.grades = (parsed.grades || []).filter(
          (g: Grade) =>
            !g.id.startsWith('grd-s0-') &&
            !g.id.startsWith('grd-s1-') &&
            !g.id.startsWith('grd-s2-')
        );
        parsed.invoices = (parsed.invoices || []).filter(
          (i: Invoice) =>
            !i.id.startsWith('inv-s0-') &&
            !i.id.startsWith('inv-s1-') &&
            !i.id.startsWith('inv-s2-')
        );
        parsed.payments = (parsed.payments || []).filter(
          (p: Payment) =>
            !p.id.startsWith('pay-s0-') &&
            !p.id.startsWith('pay-s1-') &&
            !p.id.startsWith('pay-s2-')
        );
        parsed.reportCards = [];
        return parsed;
      }
    } catch {
      // Fallback if corrupt
    }
  }

  // Clean Production Foundation:
  // Preserves school tenants, curriculum levels, KICD approved subjects, starter classes, and user accounts.
  // Sets ALL operational data (students, grades/marks, invoices, payments, report cards) to completely EMPTY.
  const s0Data = generateSeedDataForSchool(initialSchools[0].id, initialSchools[0].slug);
  const s1Data = generateSeedDataForSchool(initialSchools[1].id, initialSchools[1].slug);
  const s2Data = generateSeedDataForSchool(initialSchools[2].id, initialSchools[2].slug);

  const db: DatabaseSchema = {
    platformAdmins: initialPlatformAdmins,
    schools: initialSchools,
    platformAuditLogs: [
      {
        id: 'pal-1',
        actor_id: 'pa-1',
        school_id: initialSchools[0].id,
        action: 'PROVISION_TENANT',
        entity: 'School',
        created_at: new Date().toISOString(),
      },
    ],
    levels: [...s0Data.levels, ...s1Data.levels, ...s2Data.levels],
    subjects: [...s0Data.subjects, ...s1Data.subjects, ...s2Data.subjects],
    classes: [...s0Data.classes, ...s1Data.classes, ...s2Data.classes],
    users: [...s0Data.users, ...s1Data.users, ...s2Data.users],
    teachers: [...s0Data.teachers, ...s1Data.teachers, ...s2Data.teachers],
    // Clean operational data: Ready for real users to enter their own data
    parents: [],
    students: [],
    exams: [
      {
        id: 'exam-term1-mid',
        school_id: initialSchools[0].id,
        name: 'Term 1 Mid-Term Assessment',
        term: 'Term 1',
        year: 2026,
        exam_type: 'Midterm',
        start_date: '2026-02-15',
        end_date: '2026-02-25',
        is_published: true,
      },
      {
        id: 'exam-term1-end',
        school_id: initialSchools[0].id,
        name: 'Term 1 End-Term Summative Assessment',
        term: 'Term 1',
        year: 2026,
        exam_type: 'Endterm',
        start_date: '2026-03-25',
        end_date: '2026-04-05',
        is_published: true,
      },
    ],
    grades: [],
    formativeAssessments: [],
    reportCards: [],
    attendance: [],
    feeStructures: [...s0Data.feeStructures, ...s1Data.feeStructures, ...s2Data.feeStructures],
    invoices: [],
    payments: [],
    timetable: [...s0Data.timetable, ...s1Data.timetable, ...s2Data.timetable],
    messages: [],
    announcements: [],
    books: [...s0Data.books, ...s1Data.books, ...s2Data.books],
    bookLoans: [],
    routes: [...s0Data.routes, ...s1Data.routes, ...s2Data.routes],
    routeStops: [...s0Data.routeStops, ...s1Data.routeStops, ...s2Data.routeStops],
    studentTransports: [],
    hostels: [...s0Data.hostels, ...s1Data.hostels, ...s2Data.hostels],
    hostelRooms: [...s0Data.hostelRooms, ...s1Data.hostelRooms, ...s2Data.hostelRooms],
    hostelAllocations: [],
    staffAttendances: [],
    leaveRequests: [],
    payrollRecords: [],
    projectScores: [],
    disciplineLogs: [],
    inventoryItems: [...s0Data.inventoryItems, ...s1Data.inventoryItems, ...s2Data.inventoryItems],
    inventoryIssues: [],
    gatePasses: [],
    donations: [],
    consentRecords: [],
    dataRequests: [],
    breachLogs: [],
    auditLogs: [...s0Data.auditLogs, ...s1Data.auditLogs, ...s2Data.auditLogs],
    notificationsLog: [],
  };

  localStorage.setItem(DB_KEY, JSON.stringify(db));
  return db;
}

class StorageEngine {
  private db: DatabaseSchema;
  private saveListeners: Array<() => void> = [];
  private auditListeners: Array<(entry: AuditLog) => void> = [];
  private currentActorId: string | null = null;

  constructor() {
    this.db = initializeDatabase();
  }

  public setCurrentActorId(actorId: string | null): void {
    this.currentActorId = actorId;
  }

  private resolveActorId(schoolId: string, preferredActorId?: string): string {
    if (preferredActorId && preferredActorId.trim()) return preferredActorId.trim();
    if (this.currentActorId && this.currentActorId.trim()) return this.currentActorId;
    const schoolAdmin = this.db.users.find(
      (u) => u.school_id === schoolId && u.role === 'SCHOOL_ADMIN'
    );
    return schoolAdmin?.id || 'system-admin';
  }

  public subscribeAudit(listener: (entry: AuditLog) => void): () => void {
    this.auditListeners.push(listener);
    return () => {
      this.auditListeners = this.auditListeners.filter((l) => l !== listener);
    };
  }

  public subscribeSave(listener: () => void): () => void {
    this.saveListeners.push(listener);
    return () => {
      this.saveListeners = this.saveListeners.filter((l) => l !== listener);
    };
  }

  private save(): void {
    localStorage.setItem(DB_KEY, JSON.stringify(this.db));
    this.saveListeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Storage save listener error:', err);
      }
    });
  }

  public resetToFactory(): void {
    localStorage.removeItem(DB_KEY);
    this.db = initializeDatabase();
  }

  public clearAllOperationalData(schoolId?: string): void {
    if (schoolId) {
      this.db.students = this.db.students.filter((s) => s.school_id !== schoolId);
      this.db.grades = this.db.grades.filter((g) => g.school_id !== schoolId);
      this.db.formativeAssessments = this.db.formativeAssessments.filter((f) => f.school_id !== schoolId);
      this.db.reportCards = this.db.reportCards.filter((r) => r.school_id !== schoolId);
      this.db.attendance = this.db.attendance.filter((a) => a.school_id !== schoolId);
      this.db.invoices = this.db.invoices.filter((i) => i.school_id !== schoolId);
      this.db.payments = this.db.payments.filter((p) => p.school_id !== schoolId);
      this.db.parents = this.db.parents.filter((p) => p.school_id !== schoolId);
      this.db.bookLoans = this.db.bookLoans.filter((b) => b.school_id !== schoolId);
      this.db.disciplineLogs = this.db.disciplineLogs.filter((d) => d.school_id !== schoolId);
    } else {
      this.db.students = [];
      this.db.grades = [];
      this.db.formativeAssessments = [];
      this.db.reportCards = [];
      this.db.attendance = [];
      this.db.invoices = [];
      this.db.payments = [];
      this.db.parents = [];
      this.db.bookLoans = [];
      this.db.disciplineLogs = [];
      this.db.notificationsLog = [];
    }
    this.save();
  }

  // --- PLATFORM LEVEL QUERIES ---
  public getSchools(): School[] {
    return this.db.schools;
  }

  public getSchoolById(schoolId: string): School | undefined {
    return this.db.schools.find((s) => s.id === schoolId);
  }

  public getSchoolBySlug(slug: string): School | undefined {
    return this.db.schools.find((s) => s.slug === slug);
  }

  public updateSchoolStatus(schoolId: string, status: SchoolStatus, actorId: string): void {
    const school = this.db.schools.find((s) => s.id === schoolId);
    if (school) {
      school.status = status;
      this.logPlatformAudit(actorId, schoolId, `UPDATE_STATUS_${status.toUpperCase()}`, 'School');
      this.save();
    }
  }

  public updateSchoolPlan(schoolId: string, plan: PlanType, actorId: string): void {
    const school = this.db.schools.find((s) => s.id === schoolId);
    if (school) {
      school.plan = plan;
      this.logPlatformAudit(actorId, schoolId, `CHANGE_PLAN_${plan.toUpperCase()}`, 'School');
      this.save();
    }
  }

  public updateSchoolDetails(schoolId: string, updates: Partial<School>): void {
    const idx = this.db.schools.findIndex((s) => s.id === schoolId);
    if (idx !== -1) {
      this.db.schools[idx] = { ...this.db.schools[idx], ...updates };
      this.save();
    }
  }

  public logPlatformAudit(actorId: string, schoolId: string, action: string, entity: string): void {
    this.db.platformAuditLogs.unshift({
      id: `pal-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      actor_id: actorId,
      school_id: schoolId,
      action,
      entity,
      created_at: new Date().toISOString(),
    });
    this.save();
  }

  public getPlatformAuditLogs(): PlatformAuditLog[] {
    return this.db.platformAuditLogs;
  }

  // --- TENANT ONBOARDING (SIGNUP) ---
  public registerNewSchool(data: {
    name: string;
    slug: string;
    email: string;
    phone: string;
    address: string;
    adminName: string;
    adminEmail: string;
    password: string;
  }): { school: School; adminUser: User } {
    const schoolId = `school-${Date.now()}`;
    const slug = data.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');

    if (this.db.schools.some((s) => s.slug === slug)) {
      throw new Error(`School with slug "${slug}" already exists.`);
    }

    const newSchool: School = {
      id: schoolId,
      slug,
      name: data.name,
      address: data.address || 'Kenya',
      phone: data.phone,
      email: data.email,
      plan: 'free',
      status: 'active',
      created_at: new Date().toISOString(),
      current_term: 'Term 1',
      academic_year: new Date().getFullYear(),
      profile_setup_completed: false,
    };

    // First SCHOOL_ADMIN user
    const adminUser: User = {
      id: `usr-${slug}-admin`,
      school_id: schoolId,
      email: data.adminEmail,
      role: 'SCHOOL_ADMIN',
      full_name: data.adminName,
      phone: data.phone,
      is_active: true,
      needs_profile_setup: true,
      created_at: new Date().toISOString(),
    };

    // Seed levels
    const levels: SchoolLevel[] = LEVEL_NAMES.map((name, idx) => ({
      id: `lvl-${slug}-${idx + 1}`,
      school_id: schoolId,
      name,
      order_index: idx + 1,
    }));

    // Seed subjects
    const subjects: Subject[] = [];
    levels.forEach((lvl) => {
      const list = getSubjectsForLevelName(lvl.name);
      list.forEach((sub, sIdx) => {
        subjects.push({
          id: `sub-${slug}-${lvl.order_index}-${sIdx + 1}`,
          school_id: schoolId,
          level_id: lvl.id,
          name: sub.name,
          code: sub.code,
          is_optional: sub.is_optional,
        });
      });
    });

    // Default starter classes
    const classes: SchoolClass[] = [
      { id: `cls-${slug}-pp1`, school_id: schoolId, level_id: levels[0].id, name: 'PP1', stream: 'Red' },
      { id: `cls-${slug}-pp2`, school_id: schoolId, level_id: levels[1].id, name: 'PP2', stream: 'Blue' },
      { id: `cls-${slug}-g1`, school_id: schoolId, level_id: levels[2].id, name: 'Grade 1', stream: 'East' },
      { id: `cls-${slug}-g4`, school_id: schoolId, level_id: levels[5].id, name: 'Grade 4', stream: 'North' },
      { id: `cls-${slug}-g7`, school_id: schoolId, level_id: levels[8].id, name: 'Grade 7', stream: 'South' },
      { id: `cls-${slug}-g9`, school_id: schoolId, level_id: levels[10].id, name: 'Grade 9', stream: 'Pioneer' },
    ];

    this.db.schools.push(newSchool);
    this.db.users.push(adminUser);
    this.db.levels.push(...levels);
    this.db.subjects.push(...subjects);
    this.db.classes.push(...classes);

    this.logPlatformAudit('SYSTEM', schoolId, 'SIGNUP_PROVISION_COMPLETE', 'School');
    this.save();

    return { school: newSchool, adminUser };
  }

  public completeSchoolProfileSetup(
    schoolId: string,
    userId: string,
    payload: {
      schoolName: string;
      academicYear: number;
      currentTerm?: string;
      gradeLevels: string[];
      defaultStream?: string;
    }
  ): { school: School; levels: SchoolLevel[]; classes: SchoolClass[] } {
    const school = this.db.schools.find((s) => s.id === schoolId);
    if (!school) {
      throw new Error('School workspace not found.');
    }

    const cleanName = payload.schoolName.trim();
    if (!cleanName || cleanName.length < 3) {
      throw new Error('Please enter an official school name (at least 3 characters).');
    }

    const yearNum = Number(payload.academicYear);
    if (!Number.isInteger(yearNum) || yearNum < 2020 || yearNum > 2035) {
      throw new Error('Please enter a valid academic year between 2020 and 2035.');
    }

    const cleanedLevels = Array.from(
      new Set(
        payload.gradeLevels
          .map((lvl) => lvl.trim())
          .filter(Boolean)
      )
    );

    if (cleanedLevels.length === 0) {
      throw new Error('Please select at least one initial grade level.');
    }

    // Order standard CBC levels first, followed by custom levels
    const orderedLevelNames = [
      ...LEVEL_NAMES.filter((std) =>
        cleanedLevels.some((c) => c.toLowerCase() === std.toLowerCase())
      ),
      ...cleanedLevels.filter(
        (c) => !LEVEL_NAMES.some((std) => std.toLowerCase() === c.toLowerCase())
      ),
    ];

    school.name = cleanName;
    school.academic_year = yearNum;
    if (payload.currentTerm && ['Term 1', 'Term 2', 'Term 3'].includes(payload.currentTerm)) {
      school.current_term = payload.currentTerm;
    }
    school.profile_setup_completed = true;

    const actingUser = this.db.users.find((u) => u.id === userId);
    if (actingUser) {
      actingUser.needs_profile_setup = false;
    }

    const existingLevels = this.db.levels.filter((l) => l.school_id === schoolId);
    const selectedSetLower = new Set(orderedLevelNames.map((n) => n.toLowerCase()));
    const streamName = (payload.defaultStream || 'East').trim() || 'East';

    // Remove unselected levels only if no learners, fee structures, or grades depend on them
    const removableLevelIds = new Set(
      existingLevels
        .filter((lvl) => !selectedSetLower.has(lvl.name.toLowerCase()))
        .filter((lvl) => {
          const hasStudents = this.db.students.some(
            (s) => s.school_id === schoolId && s.level_id === lvl.id
          );
          if (hasStudents) return false;
          const levelClassIds = new Set(
            this.db.classes
              .filter((c) => c.school_id === schoolId && c.level_id === lvl.id)
              .map((c) => c.id)
          );
          const hasFees = this.db.feeStructures.some(
            (f) => f.school_id === schoolId && levelClassIds.has(f.class_id)
          );
          const hasTimetable = this.db.timetable.some(
            (t) => t.school_id === schoolId && levelClassIds.has(t.class_id)
          );
          return !hasFees && !hasTimetable;
        })
        .map((lvl) => lvl.id)
    );

    if (removableLevelIds.size > 0) {
      this.db.levels = this.db.levels.filter(
        (l) => !(l.school_id === schoolId && removableLevelIds.has(l.id))
      );
      this.db.subjects = this.db.subjects.filter(
        (s) => !(s.school_id === schoolId && removableLevelIds.has(s.level_id))
      );
      this.db.classes = this.db.classes.filter(
        (c) => !(c.school_id === schoolId && removableLevelIds.has(c.level_id))
      );
    }

    // Ensure every selected grade level exists with subjects and at least one starter class
    const currentLevelsAfterPrune = this.db.levels.filter((l) => l.school_id === schoolId);
    orderedLevelNames.forEach((levelName, idx) => {
      let existingLvl = currentLevelsAfterPrune.find(
        (l) => l.name.toLowerCase() === levelName.toLowerCase()
      );
      if (existingLvl) {
        existingLvl.order_index = idx + 1;
      } else {
        existingLvl = {
          id: `lvl-${school.slug}-${Date.now()}-${idx + 1}`,
          school_id: schoolId,
          name: levelName,
          order_index: idx + 1,
        };
        this.db.levels.push(existingLvl);
      }

      const existingSubjects = this.db.subjects.filter(
        (s) => s.school_id === schoolId && s.level_id === existingLvl!.id
      );
      if (existingSubjects.length === 0) {
        const defaultSubs = getSubjectsForLevelName(levelName);
        defaultSubs.forEach((sub, sIdx) => {
          this.db.subjects.push({
            id: `sub-${school.slug}-${idx + 1}-${sIdx + 1}-${Date.now().toString(36)}`,
            school_id: schoolId,
            level_id: existingLvl!.id,
            name: sub.name,
            code: sub.code,
            is_optional: sub.is_optional,
          });
        });
      }

      const existingClasses = this.db.classes.filter(
        (c) => c.school_id === schoolId && c.level_id === existingLvl!.id
      );
      if (existingClasses.length === 0) {
        this.db.classes.push({
          id: `cls-${school.slug}-${idx + 1}-${Date.now().toString(36)}`,
          school_id: schoolId,
          level_id: existingLvl!.id,
          name: levelName,
          stream: streamName,
        });
      }
    });

    this.logAudit(
      schoolId,
      userId,
      'SCHOOL_PROFILE_SETUP_COMPLETED',
      'School',
      `${cleanName} · ${yearNum} · ${orderedLevelNames.length} levels`
    );
    this.save();

    return {
      school,
      levels: this.getLevels(schoolId),
      classes: this.getClasses(schoolId),
    };
  }

  // --- USER SELF-REGISTRATION ---
  public registerUser(data: {
    role: Role;
    schoolId: string;
    fullName: string;
    email: string;
    phone: string;
    password: string;
    additionalIdentifier?: string;
  }): { user: User; school: School } {
    const school = this.getSchoolById(data.schoolId);
    if (!school) {
      throw new Error('Please select a valid school institution.');
    }

    const emailClean = data.email.trim().toLowerCase();
    const phoneClean = data.phone.trim();

    // Check if email already registered in this school
    const existing = this.db.users.find(
      (u) => u.email.toLowerCase() === emailClean && u.school_id === school.id
    );
    if (existing) {
      throw new Error(`An account with email "${data.email}" is already registered at ${school.name}. Please sign in.`);
    }

    const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newUser: User = {
      id: userId,
      school_id: school.id,
      email: emailClean,
      password_hash: data.password || 'password123',
      role: data.role,
      full_name: data.fullName.trim(),
      phone: phoneClean,
      is_active: true,
      ...(data.role === 'SCHOOL_ADMIN' ? { needs_profile_setup: true } : {}),
      created_at: new Date().toISOString(),
    };

    this.db.users.push(newUser);

    // Role-specific records
    if (data.role === 'TEACHER') {
      const empNo = data.additionalIdentifier?.trim() || `TSC/${Math.floor(100000 + Math.random() * 900000)}`;
      const teacherClass = this.getClasses(school.id)[0];
      const teacherLevel = this.getLevels(school.id)[0];
      const teacherSub = this.getSubjects(school.id)[0];

      this.db.teachers.push({
        id: `tch-${Date.now()}`,
        school_id: school.id,
        user_id: userId,
        employee_number: empNo,
        subject_specialty: teacherSub?.name || 'Mathematics & Science',
        hire_date: new Date().toISOString().split('T')[0],
        assigned_level_ids: teacherLevel ? [teacherLevel.id] : [],
        assigned_class_ids: teacherClass ? [teacherClass.id] : [],
        is_active: true,
      });
    } else if (data.role === 'PARENT') {
      let linkedStudentIds: string[] = [];
      if (data.additionalIdentifier) {
        const student = this.db.students.find(
          (s) => s.school_id === school.id && s.admission_number.toLowerCase() === data.additionalIdentifier?.toLowerCase().trim()
        );
        if (student) {
          linkedStudentIds.push(student.id);
          student.parent_user_id = userId;
        }
      }

      this.db.parents.push({
        id: `par-${Date.now()}`,
        school_id: school.id,
        user_id: userId,
        relationship: 'guardian',
        linked_student_ids: linkedStudentIds,
      });
    } else if (data.role === 'STUDENT') {
      const admNo = data.additionalIdentifier?.trim() || `ADM/${new Date().getFullYear()}/${String(this.db.students.length + 1).padStart(3, '0')}`;
      const existingStudent = this.db.students.find(
        (s) => s.school_id === school.id && s.admission_number.toLowerCase() === admNo.toLowerCase()
      );
      if (existingStudent) {
        existingStudent.user_id = userId;
      } else {
        const defaultClass = this.getClasses(school.id)[0];
        const defaultLevel = this.getLevels(school.id)[0];
        this.db.students.push({
          id: `std-${Date.now()}`,
          school_id: school.id,
          user_id: userId,
          admission_number: admNo,
          full_name: data.fullName.trim(),
          level_id: defaultLevel?.id || 'lvl-1',
          class_id: defaultClass?.id || 'cls-1',
          dob: '2012-01-01',
          gender: 'other',
          student_type: 'day',
          status: 'active',
          created_at: new Date().toISOString(),
        });
      }
    }

    this.logAudit(school.id, userId, 'USER_REGISTERED', 'User', userId);
    this.save();
    return { user: newUser, school };
  }

  // --- TENANT AUDIT ---
  public logAudit(schoolId: string, userId: string, action: string, entity: string, entityId: string): void {
    const entry: AuditLog = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      school_id: schoolId,
      user_id: userId,
      action,
      entity,
      entity_id: entityId,
      ip_address: '102.134.42.10',
      created_at: new Date().toISOString(),
    };
    this.db.auditLogs.unshift(entry);
    this.auditListeners.forEach((listener) => {
      try {
        listener(entry);
      } catch (err) {
        console.error('Audit listener error:', err);
      }
    });
    this.save();
  }

  public getAuditLogs(schoolId: string): AuditLog[] {
    return this.db.auditLogs.filter((a) => a.school_id === schoolId);
  }

  // --- USERS & AUTH ---
  public getUsers(schoolId: string): User[] {
    return this.db.users.filter((u) => u.school_id === schoolId);
  }

  public getUserByEmail(email: string): User | undefined {
    return this.db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserByIdentifier(identifier: string): User | undefined {
    const clean = identifier.trim().toLowerCase();
    // 1. By email
    const byEmail = this.db.users.find((u) => u.email.toLowerCase() === clean);
    if (byEmail) return byEmail;

    // 2. By phone (handles 07... and +254 7...)
    const cleanDigits = identifier.replace(/[^0-9]/g, '');
    if (cleanDigits.length >= 9) {
      const last9 = cleanDigits.slice(-9);
      const byPhone = this.db.users.find((u) => {
        const uDigits = u.phone.replace(/[^0-9]/g, '');
        return uDigits.endsWith(last9);
      });
      if (byPhone) return byPhone;
    }

    // 3. By student admission number or NEMIS UPI
    const student = this.db.students.find(
      (s) => s.admission_number.toLowerCase() === clean || (s.upi && s.upi.toLowerCase() === clean)
    );
    if (student && student.user_id) {
      const byStudent = this.db.users.find((u) => u.id === student.user_id);
      if (byStudent) return byStudent;
    }

    // 4. By teacher employee number / TSC No
    const teacher = this.db.teachers.find((t) => t.employee_number.toLowerCase() === clean);
    if (teacher && teacher.user_id) {
      const byTeacher = this.db.users.find((u) => u.id === teacher.user_id);
      if (byTeacher) return byTeacher;
    }

    return undefined;
  }

  public getUserById(userId: string): User | undefined {
    return this.db.users.find((u) => u.id === userId);
  }

  public updateUserPasswordByEmail(email: string, newPassword: string): boolean {
    const cleanEmail = email.trim().toLowerCase();
    const user = this.db.users.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) return false;
    user.password_hash = newPassword;
    this.save();
    return true;
  }

  // --- LEVELS & SUBJECTS ---
  public getLevels(schoolId: string): SchoolLevel[] {
    return this.db.levels.filter((l) => l.school_id === schoolId).sort((a, b) => a.order_index - b.order_index);
  }

  public getSubjects(schoolId: string, levelId?: string): Subject[] {
    return this.db.subjects.filter((s) => s.school_id === schoolId && (!levelId || s.level_id === levelId));
  }

  public addSubject(schoolId: string, subject: Omit<Subject, 'id' | 'school_id'>): Subject {
    const newSubject: Subject = {
      id: `sub-${Date.now()}`,
      school_id: schoolId,
      ...subject,
    };
    this.db.subjects.push(newSubject);
    this.save();
    return newSubject;
  }

  public deleteSubject(schoolId: string, subjectId: string): void {
    const hasGrades = this.db.grades.some((g) => g.school_id === schoolId && g.subject_id === subjectId);
    if (hasGrades) {
      throw new Error('Cannot delete subject with existing grade records.');
    }
    this.db.subjects = this.db.subjects.filter((s) => !(s.school_id === schoolId && s.id === subjectId));
    this.save();
  }

  // --- CLASSES ---
  public getClasses(schoolId: string, levelId?: string): SchoolClass[] {
    return this.db.classes.filter((c) => c.school_id === schoolId && (!levelId || c.level_id === levelId));
  }

  public createClass(schoolId: string, data: Omit<SchoolClass, 'id' | 'school_id'>): SchoolClass {
    const newClass: SchoolClass = {
      id: `cls-${Date.now()}`,
      school_id: schoolId,
      ...data,
    };
    this.db.classes.push(newClass);
    this.save();
    return newClass;
  }

  public updateClass(schoolId: string, classId: string, updates: Partial<SchoolClass>): void {
    const idx = this.db.classes.findIndex((c) => c.school_id === schoolId && c.id === classId);
    if (idx !== -1) {
      // If changing level_id, check if students exist
      if (updates.level_id && updates.level_id !== this.db.classes[idx].level_id) {
        const studentCount = this.db.students.filter((s) => s.school_id === schoolId && s.class_id === classId).length;
        if (studentCount > 0) {
          throw new Error('Cannot change the school level of a class that already has enrolled students.');
        }
      }
      this.db.classes[idx] = { ...this.db.classes[idx], ...updates };
      this.save();
    }
  }

  public deleteClass(schoolId: string, classId: string): void {
    const studentsInClass = this.db.students.filter((s) => s.school_id === schoolId && s.class_id === classId);
    if (studentsInClass.length > 0) {
      throw new Error(`Cannot delete class: ${studentsInClass.length} students are currently assigned.`);
    }
    this.db.classes = this.db.classes.filter((c) => !(c.school_id === schoolId && c.id === classId));
    this.save();
  }

  // --- STUDENTS ---
  public getStudents(
    schoolId: string,
    filters?: { levelId?: string; classId?: string; type?: string; status?: string; search?: string }
  ): Student[] {
    return this.db.students
      .filter((s) => s.school_id === schoolId)
      .filter((s) => {
        if (filters?.levelId && s.level_id !== filters.levelId) return false;
        if (filters?.classId && s.class_id !== filters.classId) return false;
        if (filters?.type && s.student_type !== filters.type) return false;
        if (filters?.status && s.status !== filters.status) return false;
        if (filters?.search) {
          const q = filters.search.toLowerCase();
          return s.full_name.toLowerCase().includes(q) || s.admission_number.toLowerCase().includes(q);
        }
        return true;
      });
  }

  public getStudentById(schoolId: string, studentId: string): Student | undefined {
    return this.db.students.find((s) => s.school_id === schoolId && s.id === studentId);
  }

  public createStudent(schoolId: string, data: Omit<Student, 'id' | 'school_id' | 'created_at'>): Student {
    const newStudent: Student = {
      id: `std-${Date.now()}`,
      school_id: schoolId,
      created_at: new Date().toISOString(),
      ...data,
    };
    this.db.students.push(newStudent);
    this.logAudit(
      schoolId,
      this.resolveActorId(schoolId),
      'STUDENT_ENROLLED',
      'Student',
      `${newStudent.admission_number}:${newStudent.full_name}`
    );
    return newStudent;
  }

  public enrollSampleStudentsToClass(schoolId: string, classId: string, count: number = 6): Student[] {
    const cls = this.db.classes.find((c) => c.school_id === schoolId && c.id === classId);
    if (!cls) return [];

    const school = this.db.schools.find((s) => s.id === schoolId);
    const prefix = school?.slug.includes('muungano') ? 'MSS' : school?.slug.includes('mombasa') ? 'MHA' : 'KJA';
    const sampleNames = [
      { name: 'Brian Otieno', gender: 'male' as const },
      { name: 'Faith Chebet', gender: 'female' as const },
      { name: 'Emmanuel Kibet', gender: 'male' as const },
      { name: 'Sharon Atieno', gender: 'female' as const },
      { name: 'Derrick Njoroge', gender: 'male' as const },
      { name: 'Mercy Chepngetich', gender: 'female' as const },
      { name: 'Liam Kiprono', gender: 'male' as const },
      { name: 'Zahra Nyambura', gender: 'female' as const },
      { name: 'Nathan Kimani', gender: 'male' as const },
      { name: 'Chloe Akinyi', gender: 'female' as const },
      { name: 'Kelvin Kiprop', gender: 'male' as const },
      { name: 'Hope Wanjiku', gender: 'female' as const },
    ];

    const currentCount = this.db.students.filter((s) => s.school_id === schoolId).length;
    const newStudents: Student[] = [];

    for (let i = 0; i < count; i++) {
      const sample = sampleNames[(currentCount + i) % sampleNames.length];
      const admNum = `${prefix}/2026/${cls.name.replace(/\s+/g, '')}${String(100 + currentCount + i + 1)}`;
      const newStd: Student = {
        id: `std-${cls.id}-${Date.now()}-${i + 1}`,
        school_id: schoolId,
        admission_number: admNum,
        full_name: sample.name,
        level_id: cls.level_id,
        class_id: cls.id,
        dob: '2015-05-10',
        gender: sample.gender,
        student_type: i % 2 === 0 ? 'day' : 'boarding',
        status: 'active',
        created_at: new Date().toISOString(),
      };
      this.db.students.push(newStd);
      newStudents.push(newStd);
    }

    this.save();
    return newStudents;
  }

  public updateStudent(schoolId: string, studentId: string, updates: Partial<Student>): void {
    const idx = this.db.students.findIndex((s) => s.school_id === schoolId && s.id === studentId);
    if (idx !== -1) {
      const existing = this.db.students[idx];
      this.db.students[idx] = { ...existing, ...updates };
      this.logAudit(
        schoolId,
        this.resolveActorId(schoolId),
        'STUDENT_RECORD_UPDATED',
        'Student',
        `${existing.admission_number}:${existing.full_name}`
      );
    }
  }

  public softDeleteStudent(schoolId: string, studentId: string): void {
    const student = this.db.students.find((s) => s.school_id === schoolId && s.id === studentId);
    if (student) {
      student.status = 'inactive';
      this.logAudit(
        schoolId,
        this.resolveActorId(schoolId),
        'STUDENT_DELETED',
        'Student',
        `${student.admission_number}:${student.full_name}`
      );
    }
  }

  // --- TEACHERS ---
  public getTeachers(schoolId: string): (Teacher & { user: User })[] {
    const teachers = this.db.teachers.filter((t) => t.school_id === schoolId);
    return teachers.map((t) => {
      const user = this.db.users.find((u) => u.id === t.user_id) || {
        id: t.user_id,
        school_id: schoolId,
        email: 'unknown',
        role: 'TEACHER',
        full_name: 'Unknown Teacher',
        phone: '',
        is_active: t.is_active,
        created_at: '',
      };
      return { ...t, user };
    });
  }

  public createTeacher(
    schoolId: string,
    data: {
      fullName: string;
      email: string;
      phone: string;
      employeeNumber: string;
      specialty: string;
      hireDate: string;
      assignedLevels: string[];
      assignedClasses: string[];
    }
  ): Teacher {
    const userId = `usr-${Date.now()}`;
    const user: User = {
      id: userId,
      school_id: schoolId,
      email: data.email,
      role: 'TEACHER',
      full_name: data.fullName,
      phone: data.phone,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const teacher: Teacher = {
      id: `tch-${Date.now()}`,
      school_id: schoolId,
      user_id: userId,
      employee_number: data.employeeNumber,
      subject_specialty: data.specialty,
      hire_date: data.hireDate,
      assigned_level_ids: data.assignedLevels,
      assigned_class_ids: data.assignedClasses,
      is_active: true,
    };

    this.db.users.push(user);
    this.db.teachers.push(teacher);
    this.save();
    return teacher;
  }

  public updateTeacher(schoolId: string, teacherId: string, updates: Partial<Teacher>): void {
    const idx = this.db.teachers.findIndex((t) => t.school_id === schoolId && t.id === teacherId);
    if (idx !== -1) {
      this.db.teachers[idx] = { ...this.db.teachers[idx], ...updates };
      this.save();
    }
  }

  // --- PARENTS ---
  public getParents(schoolId: string): (Parent & { user: User; students: Student[] })[] {
    const parents = this.db.parents.filter((p) => p.school_id === schoolId);
    return parents.map((p) => {
      const user = this.db.users.find((u) => u.id === p.user_id) || {
        id: p.user_id,
        school_id: schoolId,
        email: 'unknown',
        role: 'PARENT',
        full_name: 'Unknown Parent',
        phone: '',
        is_active: true,
        created_at: '',
      };
      const linkedStudents = this.db.students.filter((s) => p.linked_student_ids.includes(s.id));
      return { ...p, user, students: linkedStudents };
    });
  }

  public createParent(
    schoolId: string,
    data: {
      fullName: string;
      email: string;
      phone: string;
      relationship: 'father' | 'mother' | 'guardian' | 'other';
      occupation?: string;
      linkedStudentIds: string[];
    }
  ): Parent {
    const userId = `usr-par-${Date.now()}`;
    const user: User = {
      id: userId,
      school_id: schoolId,
      email: data.email,
      role: 'PARENT',
      full_name: data.fullName,
      phone: data.phone,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const parent: Parent = {
      id: `par-${Date.now()}`,
      school_id: schoolId,
      user_id: userId,
      relationship: data.relationship,
      occupation: data.occupation,
      linked_student_ids: data.linkedStudentIds,
    };

    this.db.users.push(user);
    this.db.parents.push(parent);

    // Update students parent link
    data.linkedStudentIds.forEach((sid) => {
      const std = this.db.students.find((s) => s.id === sid);
      if (std) std.parent_user_id = userId;
    });

    this.save();
    return parent;
  }

  // --- ATTENDANCE ---
  public getAttendance(schoolId: string, classId?: string, date?: string): Attendance[] {
    let list = this.db.attendance.filter((a) => a.school_id === schoolId);
    if (date) {
      list = list.filter((a) => a.date === date);
    }
    if (classId) {
      const studentIdsInClass = this.db.students.filter((s) => s.class_id === classId).map((s) => s.id);
      list = list.filter((a) => studentIdsInClass.includes(a.student_id));
    }
    return list;
  }

  public getStudentAttendance(schoolId: string, studentId: string): Attendance[] {
    return this.db.attendance.filter((a) => a.school_id === schoolId && a.student_id === studentId);
  }

  public recordBulkAttendance(
    schoolId: string,
    records: { student_id: string; date: string; status: 'present' | 'absent' | 'late'; remarks?: string }[],
    markedByTeacherId: string
  ): void {
    records.forEach((rec) => {
      const existingIdx = this.db.attendance.findIndex(
        (a) => a.school_id === schoolId && a.student_id === rec.student_id && a.date === rec.date
      );
      if (existingIdx !== -1) {
        this.db.attendance[existingIdx].status = rec.status;
        this.db.attendance[existingIdx].remarks = rec.remarks;
        this.db.attendance[existingIdx].marked_by_teacher_id = markedByTeacherId;
      } else {
        this.db.attendance.push({
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          school_id: schoolId,
          student_id: rec.student_id,
          date: rec.date,
          status: rec.status,
          marked_by_teacher_id: markedByTeacherId,
          remarks: rec.remarks,
        });
      }
    });
    this.save();
  }

  // --- EXAMS & GRADES ---
  public getExams(schoolId: string): Exam[] {
    return this.db.exams.filter((e) => e.school_id === schoolId);
  }

  public createExam(schoolId: string, data: Omit<Exam, 'id' | 'school_id'>): Exam {
    const exam: Exam = {
      id: `ex-${Date.now()}`,
      school_id: schoolId,
      ...data,
    };
    this.db.exams.push(exam);
    this.save();
    return exam;
  }

  public updateExam(schoolId: string, examId: string, updates: Partial<Exam>): void {
    const idx = this.db.exams.findIndex((e) => e.school_id === schoolId && e.id === examId);
    if (idx !== -1) {
      this.db.exams[idx] = { ...this.db.exams[idx], ...updates };
      this.save();
    }
  }

  public getGrades(schoolId: string, examId: string, classId?: string, subjectId?: string): Grade[] {
    let list = this.db.grades.filter((g) => g.school_id === schoolId && g.exam_id === examId);
    if (subjectId) {
      list = list.filter((g) => g.subject_id === subjectId);
    }
    if (classId) {
      const studentIds = this.db.students.filter((s) => s.class_id === classId).map((s) => s.id);
      list = list.filter((g) => studentIds.includes(g.student_id));
    }
    return list;
  }

  public getStudentGrades(schoolId: string, studentId: string, examId?: string): Grade[] {
    return this.db.grades.filter(
      (g) => g.school_id === schoolId && g.student_id === studentId && (!examId || g.exam_id === examId)
    );
  }

  public batchSaveGrades(
    schoolId: string,
    gradesToSave: {
      exam_id: string;
      student_id: string;
      subject_id: string;
      marks?: number | null;
      rubric_level: RubricLevel;
      points: number;
      teacher_comment: string;
      entered_by_teacher_id: string;
    }[]
  ): void {
    // 1. Pre-validate for any conflict
    for (const g of gradesToSave) {
      const validation = validateMarksRubricConflict(g.marks, g.rubric_level);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
    }

    // 2. Atomic upsert with sensitive modification audit tracking
    let modifiedCount = 0;
    let insertedCount = 0;
    const modifiedDetails: string[] = [];
    let primaryTeacherId = '';
    let primaryExamId = gradesToSave[0]?.exam_id || '';

    gradesToSave.forEach((g) => {
      if (!primaryTeacherId && g.entered_by_teacher_id) {
        primaryTeacherId = g.entered_by_teacher_id;
      }
      const idx = this.db.grades.findIndex(
        (existing) =>
          existing.school_id === schoolId &&
          existing.exam_id === g.exam_id &&
          existing.student_id === g.student_id &&
          existing.subject_id === g.subject_id
      );

      if (idx !== -1) {
        const prev = this.db.grades[idx];
        const hasValueChange =
          prev.marks !== g.marks ||
          prev.rubric_level !== g.rubric_level ||
          prev.points !== g.points ||
          prev.teacher_comment !== g.teacher_comment;

        this.db.grades[idx] = {
          ...prev,
          marks: g.marks,
          rubric_level: g.rubric_level,
          points: g.points,
          teacher_comment: g.teacher_comment,
          entered_by_teacher_id: g.entered_by_teacher_id,
        };

        if (hasValueChange) {
          modifiedCount += 1;
          const student = this.db.students.find((s) => s.id === g.student_id);
          const subject = this.db.subjects.find((sub) => sub.id === g.subject_id);
          modifiedDetails.push(
            `${student?.admission_number || g.student_id}:${subject?.code || g.subject_id}:${prev.marks ?? prev.rubric_level}->${g.marks ?? g.rubric_level}`
          );
        }
      } else {
        insertedCount += 1;
        this.db.grades.push({
          id: `grd-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          school_id: schoolId,
          ...g,
        });
      }
    });

    const actorId = this.resolveActorId(schoolId, primaryTeacherId);
    if (modifiedCount > 0) {
      const entitySummary =
        modifiedDetails.length <= 3
          ? modifiedDetails.join(' | ')
          : `${primaryExamId}:${modifiedCount}-grades-updated`;
      this.logAudit(schoolId, actorId, 'GRADE_MODIFIED', 'Grade', entitySummary);
    }
    if (insertedCount > 0) {
      this.logAudit(
        schoolId,
        actorId,
        'GRADES_ENTERED',
        'Grade',
        `${primaryExamId}:${insertedCount}-entries`
      );
    }
    if (modifiedCount === 0 && insertedCount === 0) {
      this.save();
    }
  }

  // --- FORMATIVE ASSESSMENTS ---
  public getFormativeAssessments(schoolId: string, studentId?: string, subjectId?: string): FormativeAssessment[] {
    return this.db.formativeAssessments.filter(
      (fa) =>
        fa.school_id === schoolId &&
        (!studentId || fa.student_id === studentId) &&
        (!subjectId || fa.subject_id === subjectId)
    );
  }

  public createFormativeAssessment(
    schoolId: string,
    data: Omit<FormativeAssessment, 'id' | 'school_id'>
  ): FormativeAssessment {
    const item: FormativeAssessment = {
      id: `fa-${Date.now()}`,
      school_id: schoolId,
      ...data,
    };
    this.db.formativeAssessments.push(item);
    this.save();
    return item;
  }

  // --- REPORT CARDS ---
  public getReportCards(schoolId: string, examId: string): ReportCard[] {
    return this.db.reportCards.filter((rc) => rc.school_id === schoolId && rc.exam_id === examId);
  }

  public getStudentReportCard(schoolId: string, studentId: string, examId: string): ReportCard | undefined {
    return this.db.reportCards.find(
      (rc) => rc.school_id === schoolId && rc.student_id === studentId && rc.exam_id === examId
    );
  }

  public upsertReportCard(schoolId: string, data: Omit<ReportCard, 'id' | 'school_id'>): ReportCard {
    const idx = this.db.reportCards.findIndex(
      (rc) => rc.school_id === schoolId && rc.student_id === data.student_id && rc.exam_id === data.exam_id
    );

    if (idx !== -1) {
      this.db.reportCards[idx] = { ...this.db.reportCards[idx], ...data };
      this.save();
      return this.db.reportCards[idx];
    } else {
      const rc: ReportCard = {
        id: `rc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        school_id: schoolId,
        ...data,
      };
      this.db.reportCards.push(rc);
      this.save();
      return rc;
    }
  }

  public publishReportCards(schoolId: string, examId: string, classId?: string): number {
    let studentIds: string[] = [];
    if (classId) {
      studentIds = this.db.students.filter((s) => s.class_id === classId).map((s) => s.id);
    }

    let count = 0;
    this.db.reportCards.forEach((rc) => {
      if (rc.school_id === schoolId && rc.exam_id === examId) {
        if (!classId || studentIds.includes(rc.student_id)) {
          rc.published = true;
          rc.published_at = new Date().toISOString();
          count++;
        }
      }
    });

    if (count > 0) {
      this.logAudit(
        schoolId,
        this.resolveActorId(schoolId),
        'REPORT_CARDS_PUBLISHED',
        'ReportCard',
        `${examId}:${count}-cards`
      );
    } else {
      this.save();
    }
    return count;
  }

  // --- FEES & PAYMENTS ---
  public getFeeStructures(schoolId: string): FeeStructure[] {
    return this.db.feeStructures.filter((f) => f.school_id === schoolId);
  }

  public createFeeStructure(schoolId: string, data: Omit<FeeStructure, 'id' | 'school_id'>): FeeStructure {
    const fs: FeeStructure = {
      id: `fee-${Date.now()}`,
      school_id: schoolId,
      ...data,
    };
    this.db.feeStructures.push(fs);
    this.logAudit(
      schoolId,
      this.resolveActorId(schoolId),
      'FEE_STRUCTURE_CREATED',
      'FeeStructure',
      `${fs.term}-${fs.year}:KES-${fs.total_day_amount}`
    );
    return fs;
  }

  public getInvoices(schoolId: string, studentId?: string): Invoice[] {
    return this.db.invoices.filter((inv) => inv.school_id === schoolId && (!studentId || inv.student_id === studentId));
  }

  public generateInvoicesForClass(
    schoolId: string,
    classId: string,
    feeStructureId: string,
    dueDate: string
  ): { count: number; invoices: Invoice[] } {
    const feeStructure = this.db.feeStructures.find((f) => f.school_id === schoolId && f.id === feeStructureId);
    if (!feeStructure) throw new Error('Fee structure not found');

    const students = this.db.students.filter(
      (s) => s.school_id === schoolId && s.class_id === classId && s.status === 'active'
    );
    const school = this.db.schools.find((s) => s.id === schoolId);
    const slug = school ? school.slug.toUpperCase() : 'SCH';

    const generated: Invoice[] = [];

    students.forEach((std) => {
      // Check if invoice already exists for this feeStructure & student
      const exists = this.db.invoices.some((inv) => inv.fee_structure_id === feeStructureId && inv.student_id === std.id);
      if (!exists) {
        const amount = std.student_type === 'boarding' ? feeStructure.total_boarding_amount : feeStructure.total_day_amount;
        const seq = String(this.db.invoices.length + 1).padStart(4, '0');
        const inv: Invoice = {
          id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          school_id: schoolId,
          student_id: std.id,
          fee_structure_id: feeStructureId,
          invoice_number: `INV-${slug}-${new Date().getFullYear()}-${seq}`,
          amount_due: amount,
          amount_paid: 0,
          balance: amount,
          due_date: dueDate,
          status: 'unpaid',
          created_at: new Date().toISOString(),
        };
        this.db.invoices.push(inv);
        generated.push(inv);
      }
    });

    if (generated.length > 0) {
      this.logAudit(
        schoolId,
        this.resolveActorId(schoolId),
        'FEE_INVOICES_GENERATED',
        'Invoice',
        `${classId}:${generated.length}-invoices`
      );
    } else {
      this.save();
    }
    return { count: generated.length, invoices: generated };
  }

  public adjustInvoiceFee(
    schoolId: string,
    invoiceId: string,
    newAmountDue: number,
    reason?: string
  ): Invoice {
    const invoice = this.db.invoices.find(
      (i) => i.school_id === schoolId && i.id === invoiceId
    );
    if (!invoice) throw new Error('Invoice not found');
    const sanitizedAmount = Math.max(0, Math.round(newAmountDue));
    const previousAmount = invoice.amount_due;

    invoice.amount_due = sanitizedAmount;
    invoice.balance = Math.max(0, sanitizedAmount - invoice.amount_paid);
    invoice.status =
      invoice.balance === 0
        ? 'paid'
        : invoice.amount_paid > 0
        ? 'partial'
        : 'unpaid';

    const cleanReason = reason?.trim() ? `:${reason.trim()}` : '';
    this.logAudit(
      schoolId,
      this.resolveActorId(schoolId),
      'FEE_ADJUSTED',
      'Invoice',
      `${invoice.invoice_number}:${previousAmount}->${sanitizedAmount}${cleanReason}`
    );
    return invoice;
  }

  public recordPayment(
    schoolId: string,
    data: {
      invoice_id: string;
      amount_paid: number;
      payment_date: string;
      method: Payment['method'];
      reference: string;
      recorded_by: string;
    }
  ): Payment {
    const invoice = this.db.invoices.find((i) => i.school_id === schoolId && i.id === data.invoice_id);
    if (!invoice) throw new Error('Invoice not found');

    const school = this.db.schools.find((s) => s.id === schoolId);
    const prefix = school ? school.slug.slice(0, 3).toUpperCase() : 'REC';
    const recNumber = `REC-${prefix}-${Date.now().toString().slice(-5)}`;

    const payment: Payment = {
      id: `pay-${Date.now()}`,
      school_id: schoolId,
      invoice_id: data.invoice_id,
      amount_paid: data.amount_paid,
      payment_date: data.payment_date,
      method: data.method,
      reference: data.reference,
      receipt_number: recNumber,
      recorded_by: data.recorded_by,
    };

    invoice.amount_paid += data.amount_paid;
    invoice.balance = Math.max(0, invoice.amount_due - invoice.amount_paid);
    if (invoice.balance === 0) {
      invoice.status = 'paid';
    } else {
      invoice.status = 'partial';
    }

    this.db.payments.push(payment);
    this.logAudit(
      schoolId,
      this.resolveActorId(schoolId),
      'FEE_PAYMENT_RECORDED',
      'Payment',
      `${payment.receipt_number}:KES-${payment.amount_paid}:${invoice.invoice_number}`
    );
    return payment;
  }

  public getPayments(schoolId: string, invoiceId?: string): Payment[] {
    return this.db.payments.filter((p) => p.school_id === schoolId && (!invoiceId || p.invoice_id === invoiceId));
  }

  // --- TIMETABLE ---
  public getTimetable(schoolId: string, classId?: string, teacherId?: string): TimetableSlot[] {
    return this.db.timetable.filter(
      (t) =>
        t.school_id === schoolId &&
        (!classId || t.class_id === classId) &&
        (!teacherId || t.teacher_id === teacherId)
    );
  }

  public saveTimetableSlot(schoolId: string, slot: Omit<TimetableSlot, 'id' | 'school_id'>): TimetableSlot {
    // Conflict detection: teacher already booked in another class at same day & period
    const teacherConflict = this.db.timetable.find(
      (t) =>
        t.school_id === schoolId &&
        t.teacher_id === slot.teacher_id &&
        t.day_of_week === slot.day_of_week &&
        t.period === slot.period &&
        t.class_id !== slot.class_id
    );

    if (teacherConflict) {
      const cls = this.db.classes.find((c) => c.id === teacherConflict.class_id);
      throw new Error(`Teacher conflict: Teacher is already scheduled in ${cls ? `${cls.name} ${cls.stream}` : 'another class'} at Period ${slot.period}.`);
    }

    // Upsert slot in class for day and period
    const existingIdx = this.db.timetable.findIndex(
      (t) =>
        t.school_id === schoolId &&
        t.class_id === slot.class_id &&
        t.day_of_week === slot.day_of_week &&
        t.period === slot.period
    );

    if (existingIdx !== -1) {
      this.db.timetable[existingIdx] = { ...this.db.timetable[existingIdx], ...slot };
      this.save();
      return this.db.timetable[existingIdx];
    } else {
      const newSlot: TimetableSlot = {
        id: `tt-${Date.now()}`,
        school_id: schoolId,
        ...slot,
      };
      this.db.timetable.push(newSlot);
      this.save();
      return newSlot;
    }
  }

  public deleteTimetableSlot(schoolId: string, slotId: string): void {
    this.db.timetable = this.db.timetable.filter((t) => !(t.school_id === schoolId && t.id === slotId));
    this.save();
  }

  // --- MESSAGES ---
  public getMessages(schoolId: string, userId?: string, studentId?: string): Message[] {
    return this.db.messages.filter(
      (m) =>
        m.school_id === schoolId &&
        (!userId || m.sender_user_id === userId || m.receiver_user_id === userId) &&
        (!studentId || m.student_id === studentId)
    );
  }

  public sendMessage(schoolId: string, message: Omit<Message, 'id' | 'school_id' | 'created_at'>): Message {
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      school_id: schoolId,
      created_at: new Date().toISOString(),
      ...message,
    };
    this.db.messages.push(newMsg);
    this.save();
    return newMsg;
  }

  public markMessagesRead(schoolId: string, messageIds: string[]): void {
    const now = new Date().toISOString();
    this.db.messages.forEach((m) => {
      if (m.school_id === schoolId && messageIds.includes(m.id)) {
        m.read_at = now;
      }
    });
    this.save();
  }

  // --- ANNOUNCEMENTS ---
  public getAnnouncements(schoolId: string, audience?: 'all' | 'teachers' | 'parents'): Announcement[] {
    return this.db.announcements.filter(
      (a) => a.school_id === schoolId && (!audience || a.audience === 'all' || a.audience === audience)
    );
  }

  public createAnnouncement(schoolId: string, data: Omit<Announcement, 'id' | 'school_id' | 'created_at'>): Announcement {
    const anc: Announcement = {
      id: `anc-${Date.now()}`,
      school_id: schoolId,
      created_at: new Date().toISOString(),
      ...data,
    };
    this.db.announcements.unshift(anc);
    this.save();
    return anc;
  }

  // --- LIBRARY ---
  public getBooks(schoolId: string): Book[] {
    return this.db.books.filter((b) => b.school_id === schoolId);
  }

  public createBook(schoolId: string, data: Omit<Book, 'id' | 'school_id'>): Book {
    const book: Book = {
      id: `bk-${Date.now()}`,
      school_id: schoolId,
      ...data,
    };
    this.db.books.push(book);
    this.save();
    return book;
  }

  public getBookLoans(schoolId: string, studentId?: string): BookLoan[] {
    return this.db.bookLoans.filter((l) => l.school_id === schoolId && (!studentId || l.student_id === studentId));
  }

  public issueBookLoan(schoolId: string, bookId: string, studentId: string, dueDate: string): BookLoan {
    const book = this.db.books.find((b) => b.school_id === schoolId && b.id === bookId);
    if (!book) throw new Error('Book not found');
    if (book.available_copies <= 0) throw new Error('No available copies remaining');

    book.available_copies -= 1;

    const loan: BookLoan = {
      id: `ln-${Date.now()}`,
      school_id: schoolId,
      book_id: bookId,
      student_id: studentId,
      borrowed_at: new Date().toISOString().split('T')[0],
      due_date: dueDate,
      fine_amount: 0,
      status: 'active',
    };

    this.db.bookLoans.push(loan);
    this.save();
    return loan;
  }

  public returnBookLoan(schoolId: string, loanId: string): BookLoan {
    const loan = this.db.bookLoans.find((l) => l.school_id === schoolId && l.id === loanId);
    if (!loan) throw new Error('Loan record not found');

    const book = this.db.books.find((b) => b.school_id === schoolId && b.id === loan.book_id);
    if (book) {
      book.available_copies = Math.min(book.total_copies, book.available_copies + 1);
    }

    const today = new Date().toISOString().split('T')[0];
    loan.returned_at = today;
    loan.status = 'returned';

    // Check overdue
    const dueTime = new Date(loan.due_date).getTime();
    const returnTime = new Date(today).getTime();
    if (returnTime > dueTime) {
      const daysOverdue = Math.ceil((returnTime - dueTime) / (1000 * 60 * 60 * 24));
      loan.fine_amount = daysOverdue * 20; // KES 20 per day
    }

    this.save();
    return loan;
  }

  // --- TRANSPORT ---
  public getTransportRoutes(schoolId: string): TransportRoute[] {
    return this.db.routes.filter((r) => r.school_id === schoolId);
  }

  public createTransportRoute(schoolId: string, data: Omit<TransportRoute, 'id' | 'school_id'>): TransportRoute {
    const route: TransportRoute = {
      id: `rt-${Date.now()}`,
      school_id: schoolId,
      ...data,
    };
    this.db.routes.push(route);
    this.save();
    return route;
  }

  public getRouteStops(schoolId: string, routeId?: string): RouteStop[] {
    return this.db.routeStops
      .filter((s) => s.school_id === schoolId && (!routeId || s.route_id === routeId))
      .sort((a, b) => a.order_index - b.order_index);
  }

  public addRouteStop(schoolId: string, data: Omit<RouteStop, 'id' | 'school_id'>): RouteStop {
    const stop: RouteStop = {
      id: `stp-${Date.now()}`,
      school_id: schoolId,
      ...data,
    };
    this.db.routeStops.push(stop);
    this.save();
    return stop;
  }

  public getStudentTransports(schoolId: string): StudentTransport[] {
    return this.db.studentTransports.filter((st) => st.school_id === schoolId);
  }

  public assignStudentTransport(schoolId: string, data: Omit<StudentTransport, 'id' | 'school_id'>): StudentTransport {
    const existingIdx = this.db.studentTransports.findIndex(
      (st) =>
        st.school_id === schoolId &&
        st.student_id === data.student_id &&
        st.term === data.term &&
        st.year === data.year
    );

    if (existingIdx !== -1) {
      this.db.studentTransports[existingIdx] = { ...this.db.studentTransports[existingIdx], ...data };
      this.save();
      return this.db.studentTransports[existingIdx];
    } else {
      const st: StudentTransport = {
        id: `st-${Date.now()}`,
        school_id: schoolId,
        ...data,
      };
      this.db.studentTransports.push(st);
      this.save();
      return st;
    }
  }

  // --- HOSTEL ---
  public getHostels(schoolId: string): Hostel[] {
    return this.db.hostels.filter((h) => h.school_id === schoolId);
  }

  public createHostel(schoolId: string, data: Omit<Hostel, 'id' | 'school_id'>): Hostel {
    const hostel: Hostel = {
      id: `hst-${Date.now()}`,
      school_id: schoolId,
      ...data,
    };
    this.db.hostels.push(hostel);
    this.save();
    return hostel;
  }

  public getHostelRooms(schoolId: string, hostelId?: string): HostelRoom[] {
    return this.db.hostelRooms.filter((r) => r.school_id === schoolId && (!hostelId || r.hostel_id === hostelId));
  }

  public createHostelRoom(schoolId: string, data: Omit<HostelRoom, 'id' | 'school_id'>): HostelRoom {
    const room: HostelRoom = {
      id: `rm-${Date.now()}`,
      school_id: schoolId,
      ...data,
    };
    this.db.hostelRooms.push(room);
    this.save();
    return room;
  }

  public getHostelAllocations(schoolId: string): HostelAllocation[] {
    return this.db.hostelAllocations.filter((ha) => ha.school_id === schoolId);
  }

  public allocateHostelRoom(
    schoolId: string,
    studentId: string,
    roomId: string,
    term: string,
    year: number
  ): HostelAllocation {
    const student = this.db.students.find((s) => s.school_id === schoolId && s.id === studentId);
    if (!student) throw new Error('Student not found');
    if (student.student_type !== 'boarding') {
      throw new Error('Hostel allocation is only allowed for students registered as Boarding.');
    }

    const room = this.db.hostelRooms.find((r) => r.school_id === schoolId && r.id === roomId);
    if (!room) throw new Error('Room not found');

    const hostel = this.db.hostels.find((h) => h.school_id === schoolId && h.id === room.hostel_id);
    if (!hostel) throw new Error('Hostel not found');

    if (hostel.gender !== student.gender) {
      throw new Error(`Hostel gender mismatch: ${hostel.name} is designated for ${hostel.gender} students.`);
    }

    // Check capacity
    const currentAllocations = this.db.hostelAllocations.filter(
      (ha) => ha.school_id === schoolId && ha.room_id === roomId && !ha.check_out_date
    );
    if (currentAllocations.length >= room.capacity) {
      throw new Error(`Room ${room.room_number} is already at full capacity (${room.capacity}/${room.capacity}).`);
    }

    const alloc: HostelAllocation = {
      id: `ha-${Date.now()}`,
      school_id: schoolId,
      student_id: studentId,
      room_id: roomId,
      term,
      year,
      check_in_date: new Date().toISOString().split('T')[0],
    };

    this.db.hostelAllocations.push(alloc);
    this.save();
    return alloc;
  }

  public checkoutHostel(schoolId: string, allocationId: string): void {
    const alloc = this.db.hostelAllocations.find((h) => h.school_id === schoolId && h.id === allocationId);
    if (alloc) {
      alloc.check_out_date = new Date().toISOString().split('T')[0];
      this.save();
    }
  }

  // --- STAFF ATTENDANCE & PAYROLL ---
  public getStaffAttendance(schoolId: string, date?: string): StaffAttendance[] {
    return this.db.staffAttendances.filter((sa) => sa.school_id === schoolId && (!date || sa.date === date));
  }

  public recordStaffAttendance(schoolId: string, data: Omit<StaffAttendance, 'id' | 'school_id'>): StaffAttendance {
    const existing = this.db.staffAttendances.find(
      (sa) => sa.school_id === schoolId && sa.teacher_id === data.teacher_id && sa.date === data.date
    );
    if (existing) {
      Object.assign(existing, data);
      this.save();
      return existing;
    } else {
      const sa: StaffAttendance = {
        id: `sa-${Date.now()}`,
        school_id: schoolId,
        ...data,
      };
      this.db.staffAttendances.push(sa);
      this.save();
      return sa;
    }
  }

  public getLeaveRequests(schoolId: string, teacherId?: string): LeaveRequest[] {
    return this.db.leaveRequests.filter((l) => l.school_id === schoolId && (!teacherId || l.teacher_id === teacherId));
  }

  public submitLeaveRequest(schoolId: string, data: Omit<LeaveRequest, 'id' | 'school_id' | 'created_at' | 'status'>): LeaveRequest {
    const req: LeaveRequest = {
      id: `lr-${Date.now()}`,
      school_id: schoolId,
      created_at: new Date().toISOString(),
      status: 'pending',
      ...data,
    };
    this.db.leaveRequests.unshift(req);
    this.save();
    return req;
  }

  public updateLeaveStatus(schoolId: string, requestId: string, status: 'approved' | 'rejected', approvedBy: string): void {
    const req = this.db.leaveRequests.find((l) => l.school_id === schoolId && l.id === requestId);
    if (req) {
      req.status = status;
      req.approved_by = approvedBy;
      this.save();
    }
  }

  public getPayrollRecords(schoolId: string, teacherId?: string): PayrollRecord[] {
    return this.db.payrollRecords.filter((p) => p.school_id === schoolId && (!teacherId || p.teacher_id === teacherId));
  }

  public generateMonthlyPayroll(schoolId: string, month: number, year: number): PayrollRecord[] {
    const activeTeachers = this.db.teachers.filter((t) => t.school_id === schoolId && t.is_active);
    const records: PayrollRecord[] = [];

    activeTeachers.forEach((tch) => {
      const existing = this.db.payrollRecords.find(
        (p) => p.school_id === schoolId && p.teacher_id === tch.id && p.month === month && p.year === year
      );

      if (!existing) {
        // Base salary depending on specialty / seniority
        const basic = tch.employee_number.includes('TSC/7') ? 68000 : 62000;
        const allowances = 13500;
        // Standard Kenyan deductions: PAYE (~10%), SHIF (2.75%), NSSF (KES 2,160), Housing Levy (1.5%)
        const gross = basic + allowances;
        const paye = Math.round(gross * 0.08);
        const shif = Math.round(gross * 0.0275);
        const nssf = 2160;
        const housingLevy = Math.round(gross * 0.015);
        const deductions = paye + shif + nssf + housingLevy;
        const net = gross - deductions;

        const rec: PayrollRecord = {
          id: `pr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          school_id: schoolId,
          teacher_id: tch.id,
          month,
          year,
          basic_salary: basic,
          allowances,
          deductions,
          net_pay: net,
          status: 'pending',
        };
        this.db.payrollRecords.push(rec);
        records.push(rec);
      } else {
        records.push(existing);
      }
    });

    this.save();
    return records;
  }

  public markPayrollPaid(schoolId: string, recordId: string): void {
    const rec = this.db.payrollRecords.find((p) => p.school_id === schoolId && p.id === recordId);
    if (rec) {
      rec.status = 'paid';
      rec.paid_at = new Date().toISOString();
      this.save();
    }
  }

  // --- GRADE 9 KJSEA & PROJECT SCORES ---
  public getProjectScores(schoolId: string, studentId?: string): ProjectScore[] {
    return this.db.projectScores.filter((ps) => ps.school_id === schoolId && (!studentId || ps.student_id === studentId));
  }

  public saveProjectScore(schoolId: string, data: Omit<ProjectScore, 'id' | 'school_id' | 'uploaded_at'>): ProjectScore {
    const existing = this.db.projectScores.find(
      (ps) => ps.school_id === schoolId && ps.student_id === data.student_id && ps.subject_code === data.subject_code
    );

    if (existing) {
      existing.project_score = data.project_score;
      existing.uploaded_by = data.uploaded_by;
      this.save();
      return existing;
    } else {
      const ps: ProjectScore = {
        id: `ps-${Date.now()}`,
        school_id: schoolId,
        uploaded_at: new Date().toISOString(),
        ...data,
      };
      this.db.projectScores.push(ps);
      this.save();
      return ps;
    }
  }

  // --- DISCIPLINE ---
  public getDisciplineLogs(schoolId: string, studentId?: string): DisciplineLog[] {
    return this.db.disciplineLogs.filter((d) => d.school_id === schoolId && (!studentId || d.student_id === studentId));
  }

  public createDisciplineLog(schoolId: string, data: Omit<DisciplineLog, 'id' | 'school_id'>): DisciplineLog {
    const dl: DisciplineLog = {
      id: `disc-${Date.now()}`,
      school_id: schoolId,
      ...data,
    };
    this.db.disciplineLogs.unshift(dl);
    this.save();
    return dl;
  }

  // --- INVENTORY ---
  public getInventoryItems(schoolId: string): InventoryItem[] {
    return this.db.inventoryItems.filter((i) => i.school_id === schoolId);
  }

  public createInventoryItem(schoolId: string, data: Omit<InventoryItem, 'id' | 'school_id'>): InventoryItem {
    const item: InventoryItem = {
      id: `inv-it-${Date.now()}`,
      school_id: schoolId,
      ...data,
    };
    this.db.inventoryItems.push(item);
    this.save();
    return item;
  }

  public issueInventoryItem(
    schoolId: string,
    itemId: string,
    issuedToUserId: string,
    quantity: number,
    notes?: string
  ): InventoryIssue {
    const item = this.db.inventoryItems.find((i) => i.school_id === schoolId && i.id === itemId);
    if (!item) throw new Error('Inventory item not found');
    if (item.quantity < quantity) throw new Error(`Insufficient stock. Current available: ${item.quantity}`);

    item.quantity -= quantity;

    const issue: InventoryIssue = {
      id: `issue-${Date.now()}`,
      school_id: schoolId,
      item_id: itemId,
      issued_to_user_id: issuedToUserId,
      quantity,
      issue_date: new Date().toISOString().split('T')[0],
      notes,
    };

    this.db.inventoryIssues.push(issue);
    this.save();
    return issue;
  }

  // --- GATE PASS ---
  public getGatePasses(schoolId: string): GatePass[] {
    return this.db.gatePasses.filter((gp) => gp.school_id === schoolId);
  }

  public createGatePass(schoolId: string, data: Omit<GatePass, 'id' | 'school_id' | 'status'>): GatePass {
    const gp: GatePass = {
      id: `gp-${Date.now()}`,
      school_id: schoolId,
      status: 'active',
      ...data,
    };
    this.db.gatePasses.unshift(gp);
    this.save();
    return gp;
  }

  public markGatePassReturned(schoolId: string, passId: string, inTime: string): void {
    const gp = this.db.gatePasses.find((p) => p.school_id === schoolId && p.id === passId);
    if (gp) {
      gp.in_time = inTime;
      gp.status = 'returned';
      this.save();
    }
  }

  // --- VISITOR PASSES ---
  public getVisitorPasses(schoolId: string): VisitorPass[] {
    if (!this.db.visitorPasses || this.db.visitorPasses.length === 0) {
      // Seed default active and past visitor entries for demo
      this.db.visitorPasses = [
        {
          id: 'vp-1',
          school_id: schoolId,
          visitor_name: 'Dr. Joseph Mutiso',
          national_id: '24189302',
          phone: '0722345678',
          vehicle_reg: 'KDD 492X',
          person_to_visit: 'Head of Institution / Principal',
          department: 'Administration',
          purpose: 'KICD Curriculum Quality Audit & Teacher Mentorship',
          badge_number: 'TAG-014',
          time_in: `${new Date().toISOString().split('T')[0]} 08:30 AM`,
          status: 'on_campus',
        },
        {
          id: 'vp-2',
          school_id: schoolId,
          visitor_name: 'Grace Wambui Karanja',
          national_id: '18940211',
          phone: '0733890123',
          vehicle_reg: 'Pedestrian',
          person_to_visit: 'Bursar & Accounts Office',
          department: 'Finance',
          purpose: 'Term 1 Fee Balance Reconciliation & Receipt Collection',
          badge_number: 'TAG-008',
          time_in: `${new Date().toISOString().split('T')[0]} 09:15 AM`,
          time_out: `${new Date().toISOString().split('T')[0]} 10:20 AM`,
          status: 'checked_out',
        },
      ];
      this.save();
    }
    return this.db.visitorPasses.filter((vp) => vp.school_id === schoolId);
  }

  public createVisitorPass(schoolId: string, data: Omit<VisitorPass, 'id' | 'school_id' | 'status'>): VisitorPass {
    if (!this.db.visitorPasses) {
      this.db.visitorPasses = [];
    }
    const vp: VisitorPass = {
      id: `vp-${Date.now()}`,
      school_id: schoolId,
      status: 'on_campus',
      ...data,
    };
    this.db.visitorPasses.unshift(vp);
    this.save();
    return vp;
  }

  public checkOutVisitor(schoolId: string, passId: string, timeOut: string): void {
    if (!this.db.visitorPasses) return;
    const vp = this.db.visitorPasses.find((p) => p.school_id === schoolId && p.id === passId);
    if (vp) {
      vp.time_out = timeOut;
      vp.status = 'checked_out';
      this.save();
    }
  }

  // --- DONATIONS ---
  public getDonations(schoolId: string): Donation[] {
    return this.db.donations.filter((d) => d.school_id === schoolId);
  }

  public recordDonation(schoolId: string, data: Omit<Donation, 'id' | 'school_id' | 'receipt_no'>): Donation {
    const school = this.db.schools.find((s) => s.id === schoolId);
    const prefix = school ? school.slug.slice(0, 3).toUpperCase() : 'DON';
    const recNo = `DON-${prefix}-${Date.now().toString().slice(-4)}`;

    const donation: Donation = {
      id: `don-${Date.now()}`,
      school_id: schoolId,
      receipt_no: recNo,
      ...data,
    };
    this.db.donations.unshift(donation);
    this.save();
    return donation;
  }

  // --- COMPLIANCE (DPA 2019) ---
  public getConsentRecords(schoolId: string, studentId?: string): ConsentRecord[] {
    return this.db.consentRecords.filter((c) => c.school_id === schoolId && (!studentId || c.student_id === studentId));
  }

  public recordConsent(
    schoolId: string,
    studentId: string,
    parentUserId: string,
    consentType: ConsentRecord['consent_type'],
    granted: boolean
  ): ConsentRecord {
    const existing = this.db.consentRecords.find(
      (c) => c.school_id === schoolId && c.student_id === studentId && c.consent_type === consentType
    );

    if (existing) {
      existing.granted = granted;
      existing.granted_at = new Date().toISOString();
      this.save();
      return existing;
    } else {
      const rec: ConsentRecord = {
        id: `cs-${Date.now()}`,
        school_id: schoolId,
        student_id: studentId,
        parent_user_id: parentUserId,
        consent_type: consentType,
        granted,
        granted_at: new Date().toISOString(),
        ip_address: '102.219.208.4',
      };
      this.db.consentRecords.push(rec);
      this.save();
      return rec;
    }
  }

  public getDataRequests(schoolId: string): DataRequest[] {
    return this.db.dataRequests.filter((d) => d.school_id === schoolId);
  }

  public submitDataRequest(schoolId: string, requesterUserId: string, requestType: DataRequest['request_type'], notes?: string): DataRequest {
    // 7-day SLA
    const sla = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const req: DataRequest = {
      id: `dreq-${Date.now()}`,
      school_id: schoolId,
      requester_user_id: requesterUserId,
      request_type: requestType,
      status: 'pending',
      sla_due_date: sla,
      notes,
      created_at: new Date().toISOString(),
    };
    this.db.dataRequests.unshift(req);
    this.save();
    return req;
  }

  public completeDataRequest(schoolId: string, requestId: string, status: 'completed' | 'rejected', notes?: string): void {
    const req = this.db.dataRequests.find((d) => d.school_id === schoolId && d.id === requestId);
    if (req) {
      req.status = status;
      req.completed_at = new Date().toISOString();
      if (notes) req.notes = notes;
      this.save();
    }
  }

  public getBreachLogs(schoolId: string): BreachLog[] {
    return this.db.breachLogs.filter((b) => b.school_id === schoolId);
  }

  public logBreach(schoolId: string, data: Omit<BreachLog, 'id' | 'school_id'>): BreachLog {
    const log: BreachLog = {
      id: `br-${Date.now()}`,
      school_id: schoolId,
      ...data,
    };
    this.db.breachLogs.unshift(log);
    this.save();
    return log;
  }

  // --- NOTIFICATIONS LOG ---
  public logNotification(schoolId: string, entry: Omit<NotificationLog, 'id' | 'school_id' | 'sent_at'>): NotificationLog {
    const item: NotificationLog = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      school_id: schoolId,
      sent_at: new Date().toISOString(),
      ...entry,
    };
    this.db.notificationsLog.unshift(item);
    this.save();
    return item;
  }

  public getNotificationsLog(schoolId: string): NotificationLog[] {
    return this.db.notificationsLog.filter((n) => n.school_id === schoolId);
  }

  // --- SQL WORKSPACE SERIALIZATION & HYDRATION ---
  public exportSchoolWorkspaceForSql(schoolId: string) {
    const school = this.db.schools.find((s) => s.id === schoolId);
    if (!school) return null;

    const bySchool = <T extends { school_id: string }>(arr: T[] | undefined) =>
      (arr || []).filter((item) => item.school_id === schoolId);

    return {
      school,
      students: bySchool(this.db.students),
      exams: bySchool(this.db.exams),
      grades: bySchool(this.db.grades),
      attendance: bySchool(this.db.attendance),
      invoices: bySchool(this.db.invoices),
      payments: bySchool(this.db.payments),
      snapshot: {
        levels: bySchool(this.db.levels),
        subjects: bySchool(this.db.subjects),
        classes: bySchool(this.db.classes),
        users: bySchool(this.db.users),
        teachers: bySchool(this.db.teachers),
        parents: bySchool(this.db.parents),
        formativeAssessments: bySchool(this.db.formativeAssessments),
        reportCards: bySchool(this.db.reportCards),
        feeStructures: bySchool(this.db.feeStructures),
        timetable: bySchool(this.db.timetable),
        messages: bySchool(this.db.messages),
        announcements: bySchool(this.db.announcements),
        books: bySchool(this.db.books),
        bookLoans: bySchool(this.db.bookLoans),
        routes: bySchool(this.db.routes),
        routeStops: bySchool(this.db.routeStops),
        studentTransports: bySchool(this.db.studentTransports),
        hostels: bySchool(this.db.hostels),
        hostelRooms: bySchool(this.db.hostelRooms),
        hostelAllocations: bySchool(this.db.hostelAllocations),
        staffAttendances: bySchool(this.db.staffAttendances),
        leaveRequests: bySchool(this.db.leaveRequests),
        payrollRecords: bySchool(this.db.payrollRecords),
        projectScores: bySchool(this.db.projectScores),
        disciplineLogs: bySchool(this.db.disciplineLogs),
        inventoryItems: bySchool(this.db.inventoryItems),
        inventoryIssues: bySchool(this.db.inventoryIssues),
        gatePasses: bySchool(this.db.gatePasses),
        visitorPasses: bySchool(this.db.visitorPasses),
        donations: bySchool(this.db.donations),
        consentRecords: bySchool(this.db.consentRecords),
        dataRequests: bySchool(this.db.dataRequests),
        breachLogs: bySchool(this.db.breachLogs),
        auditLogs: bySchool(this.db.auditLogs),
        notificationsLog: bySchool(this.db.notificationsLog),
        profileSetupCompleted: school.profile_setup_completed,
      },
    };
  }

  public hydrateFromSqlWorkspaces(workspaces: Array<{
    school: School;
    students: Student[];
    exams: Exam[];
    grades: Grade[];
    attendance: Attendance[];
    invoices: Invoice[];
    payments: Payment[];
    snapshot: Partial<DatabaseSchema> & { profileSetupCompleted?: boolean };
  }>): void {
    if (!workspaces || workspaces.length === 0) return;

    const replaceForSchool = <T extends { school_id: string }>(
      existing: T[] | undefined,
      schoolId: string,
      incoming: T[] | undefined
    ): T[] => {
      const others = (existing || []).filter((item) => item.school_id !== schoolId);
      return [...others, ...(incoming || [])];
    };

    for (const ws of workspaces) {
      const sid = ws.school.id;
      const snap = ws.snapshot || {};
      const hydratedSchool: School = {
        ...ws.school,
        ...(typeof snap.profileSetupCompleted === 'boolean'
          ? { profile_setup_completed: snap.profileSetupCompleted }
          : {}),
      };
      const existingIdx = this.db.schools.findIndex((s) => s.id === sid);
      if (existingIdx !== -1) {
        this.db.schools[existingIdx] = hydratedSchool;
      } else {
        this.db.schools.push(hydratedSchool);
      }

      this.db.students = replaceForSchool(this.db.students, sid, ws.students);
      this.db.exams = replaceForSchool(this.db.exams, sid, ws.exams);
      this.db.grades = replaceForSchool(this.db.grades, sid, ws.grades);
      this.db.attendance = replaceForSchool(this.db.attendance, sid, ws.attendance);
      this.db.invoices = replaceForSchool(this.db.invoices, sid, ws.invoices);
      this.db.payments = replaceForSchool(this.db.payments, sid, ws.payments);

      if (snap.levels) this.db.levels = replaceForSchool(this.db.levels, sid, snap.levels);
      if (snap.subjects) this.db.subjects = replaceForSchool(this.db.subjects, sid, snap.subjects);
      if (snap.classes) this.db.classes = replaceForSchool(this.db.classes, sid, snap.classes);
      if (snap.users) this.db.users = replaceForSchool(this.db.users, sid, snap.users);
      if (snap.teachers) this.db.teachers = replaceForSchool(this.db.teachers, sid, snap.teachers);
      if (snap.parents) this.db.parents = replaceForSchool(this.db.parents, sid, snap.parents);
      if (snap.formativeAssessments) {
        this.db.formativeAssessments = replaceForSchool(
          this.db.formativeAssessments,
          sid,
          snap.formativeAssessments
        );
      }
      if (snap.reportCards) this.db.reportCards = replaceForSchool(this.db.reportCards, sid, snap.reportCards);
      if (snap.feeStructures) {
        this.db.feeStructures = replaceForSchool(this.db.feeStructures, sid, snap.feeStructures);
      }
      if (snap.timetable) this.db.timetable = replaceForSchool(this.db.timetable, sid, snap.timetable);
      if (snap.messages) this.db.messages = replaceForSchool(this.db.messages, sid, snap.messages);
      if (snap.announcements) {
        this.db.announcements = replaceForSchool(this.db.announcements, sid, snap.announcements);
      }
      if (snap.books) this.db.books = replaceForSchool(this.db.books, sid, snap.books);
      if (snap.bookLoans) this.db.bookLoans = replaceForSchool(this.db.bookLoans, sid, snap.bookLoans);
      if (snap.routes) this.db.routes = replaceForSchool(this.db.routes, sid, snap.routes);
      if (snap.routeStops) this.db.routeStops = replaceForSchool(this.db.routeStops, sid, snap.routeStops);
      if (snap.studentTransports) {
        this.db.studentTransports = replaceForSchool(this.db.studentTransports, sid, snap.studentTransports);
      }
      if (snap.hostels) this.db.hostels = replaceForSchool(this.db.hostels, sid, snap.hostels);
      if (snap.hostelRooms) this.db.hostelRooms = replaceForSchool(this.db.hostelRooms, sid, snap.hostelRooms);
      if (snap.hostelAllocations) {
        this.db.hostelAllocations = replaceForSchool(this.db.hostelAllocations, sid, snap.hostelAllocations);
      }
      if (snap.staffAttendances) {
        this.db.staffAttendances = replaceForSchool(this.db.staffAttendances, sid, snap.staffAttendances);
      }
      if (snap.leaveRequests) {
        this.db.leaveRequests = replaceForSchool(this.db.leaveRequests, sid, snap.leaveRequests);
      }
      if (snap.payrollRecords) {
        this.db.payrollRecords = replaceForSchool(this.db.payrollRecords, sid, snap.payrollRecords);
      }
      if (snap.projectScores) {
        this.db.projectScores = replaceForSchool(this.db.projectScores, sid, snap.projectScores);
      }
      if (snap.disciplineLogs) {
        this.db.disciplineLogs = replaceForSchool(this.db.disciplineLogs, sid, snap.disciplineLogs);
      }
      if (snap.inventoryItems) {
        this.db.inventoryItems = replaceForSchool(this.db.inventoryItems, sid, snap.inventoryItems);
      }
      if (snap.inventoryIssues) {
        this.db.inventoryIssues = replaceForSchool(this.db.inventoryIssues, sid, snap.inventoryIssues);
      }
      if (snap.gatePasses) this.db.gatePasses = replaceForSchool(this.db.gatePasses, sid, snap.gatePasses);
      if (snap.visitorPasses) {
        this.db.visitorPasses = replaceForSchool(this.db.visitorPasses, sid, snap.visitorPasses);
      }
      if (snap.donations) this.db.donations = replaceForSchool(this.db.donations, sid, snap.donations);
      if (snap.consentRecords) {
        this.db.consentRecords = replaceForSchool(this.db.consentRecords, sid, snap.consentRecords);
      }
      if (snap.dataRequests) {
        this.db.dataRequests = replaceForSchool(this.db.dataRequests, sid, snap.dataRequests);
      }
      if (snap.breachLogs) this.db.breachLogs = replaceForSchool(this.db.breachLogs, sid, snap.breachLogs);
      if (snap.auditLogs) this.db.auditLogs = replaceForSchool(this.db.auditLogs, sid, snap.auditLogs);
      if (snap.notificationsLog) {
        this.db.notificationsLog = replaceForSchool(this.db.notificationsLog, sid, snap.notificationsLog);
      }
    }

    localStorage.setItem(DB_KEY, JSON.stringify(this.db));
  }
}

export const dbService = new StorageEngine();
