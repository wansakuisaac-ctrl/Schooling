import {
  School,
  SchoolLevel,
  Subject,
  SchoolClass,
  User,
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
} from '../types';

export const LEVEL_NAMES = [
  'PP1',
  'PP2',
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
  'Grade 9',
];

export function getSubjectsForLevelName(levelName: string): { name: string; code: string; is_optional: boolean }[] {
  if (levelName === 'PP1' || levelName === 'PP2') {
    return [
      { name: 'Language Activities', code: 'LANG', is_optional: false },
      { name: 'Mathematical Activities', code: 'MATH', is_optional: false },
      { name: 'Environmental Activities', code: 'ENV', is_optional: false },
      { name: 'Psychomotor & Creative Activities', code: 'PSY', is_optional: false },
      { name: 'Religious Education Activities', code: 'CRE', is_optional: false },
    ];
  } else if (['Grade 1', 'Grade 2', 'Grade 3'].includes(levelName)) {
    return [
      { name: 'Literacy', code: 'LIT', is_optional: false },
      { name: 'Kiswahili', code: 'KISW', is_optional: false },
      { name: 'English', code: 'ENG', is_optional: false },
      { name: 'Mathematics', code: 'MATH', is_optional: false },
      { name: 'Environmental Activities', code: 'ENV', is_optional: false },
      { name: 'Hygiene & Nutrition', code: 'HYG', is_optional: false },
      { name: 'Religious Education', code: 'RE', is_optional: false },
      { name: 'Movement & Creative Activities', code: 'MCA', is_optional: false },
    ];
  } else if (['Grade 4', 'Grade 5', 'Grade 6'].includes(levelName)) {
    return [
      { name: 'English', code: 'ENG', is_optional: false },
      { name: 'Kiswahili', code: 'KISW', is_optional: false },
      { name: 'Mathematics', code: 'MATH', is_optional: false },
      { name: 'Science & Technology', code: 'SCI', is_optional: false },
      { name: 'Social Studies', code: 'SS', is_optional: false },
      { name: 'Agriculture & Nutrition', code: 'AGRI', is_optional: false },
      { name: 'Creative Arts', code: 'CA', is_optional: false },
      { name: 'Religious Education', code: 'RE', is_optional: false },
    ];
  } else {
    // Grade 7 to 9 (Junior Secondary)
    return [
      { name: 'English', code: 'ENG', is_optional: false },
      { name: 'Kiswahili', code: 'KISW', is_optional: false },
      { name: 'Mathematics', code: 'MATH', is_optional: false },
      { name: 'Integrated Science', code: 'ISCI', is_optional: false },
      { name: 'Health Education', code: 'HLTH', is_optional: false },
      { name: 'Pre-Technical & Pre-Career Education', code: '912', is_optional: false },
      { name: 'Social Studies', code: 'SS', is_optional: false },
      { name: 'Religious Education', code: 'RE', is_optional: false },
      { name: 'Business Studies', code: 'BUS', is_optional: false },
      { name: 'Agriculture', code: '906', is_optional: false },
      { name: 'Life Skills', code: 'LIFE', is_optional: false },
      { name: 'Sports & Physical Education', code: 'PE', is_optional: false },
      { name: 'Creative Arts', code: '911', is_optional: false },
      { name: 'Computer Science', code: 'CS', is_optional: true },
      { name: 'Home Science', code: 'HS', is_optional: true },
      { name: 'French / Foreign Languages', code: 'FLANG', is_optional: true },
    ];
  }
}

export const initialPlatformAdmins: PlatformAdmin[] = [
  {
    id: 'pa-1',
    email: 'owner@elimucore.co.ke',
    password_hash: '$2a$10$wTqO5a/r8e3Gz4kU6a4h.eR1L7i9gPqTzH2eK4bE0rLzS8jF6y0v2',
    name: 'Dr. Wanjiru Kariuki (SaaS Platform Director)',
  },
];

export const initialSchools: School[] = [
  {
    id: 'school-muungano',
    slug: 'muungano-school',
    name: 'MUUNGANO SENIOR SCHOOL',
    logo_url: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150&auto=format&fit=crop&q=80',
    address: 'Kenyatta Highway, Nairobi / Machakos, Kenya',
    phone: '+254 722 888 333',
    email: 'info@muunganoschool.ac.ke',
    plan: 'pro',
    status: 'active',
    created_at: '2025-01-05T08:00:00Z',
    current_term: 'Term 1',
    academic_year: 2026,
  },
  {
    id: 'school-1',
    slug: 'kilimani-academy',
    name: 'Kilimani Junior Academy & Comprehensive School',
    logo_url: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150&auto=format&fit=crop&q=80',
    address: 'Argwings Kodhek Rd, Kilimani, Nairobi, Kenya',
    phone: '+254 722 000 111',
    email: 'info@kilimani.ac.ke',
    plan: 'pro',
    status: 'active',
    created_at: '2025-01-10T08:00:00Z',
    current_term: 'Term 1',
    academic_year: 2026,
  },
  {
    id: 'school-2',
    slug: 'mombasa-heritage',
    name: 'Mombasa CBC Heritage Academy',
    logo_url: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=150&auto=format&fit=crop&q=80',
    address: 'Nyali Links Road, Mombasa, Kenya',
    phone: '+254 733 999 888',
    email: 'admin@mombasaheritage.ac.ke',
    plan: 'basic',
    status: 'active',
    created_at: '2025-03-15T09:30:00Z',
    current_term: 'Term 1',
    academic_year: 2026,
  },
];

export function generateSeedDataForSchool(schoolId: string, schoolSlug: string) {
  // 1. Levels
  const levels: SchoolLevel[] = LEVEL_NAMES.map((name, idx) => ({
    id: `lvl-${schoolSlug}-${idx + 1}`,
    school_id: schoolId,
    name,
    order_index: idx + 1,
  }));

  // 2. Subjects
  const subjects: Subject[] = [];
  levels.forEach((lvl) => {
    const list = getSubjectsForLevelName(lvl.name);
    list.forEach((sub, sIdx) => {
      subjects.push({
        id: `sub-${schoolSlug}-${lvl.order_index}-${sIdx + 1}`,
        school_id: schoolId,
        level_id: lvl.id,
        name: sub.name,
        code: sub.code,
        is_optional: sub.is_optional,
      });
    });
  });

  // 3. Classes
  const pp1Lvl = levels.find((l) => l.name === 'PP1')!;
  const pp2Lvl = levels.find((l) => l.name === 'PP2')!;
  const g1Lvl = levels.find((l) => l.name === 'Grade 1')!;
  const g2Lvl = levels.find((l) => l.name === 'Grade 2')!;
  const g4Lvl = levels.find((l) => l.name === 'Grade 4')!;
  const g6Lvl = levels.find((l) => l.name === 'Grade 6')!;
  const g7Lvl = levels.find((l) => l.name === 'Grade 7')!;
  const g9Lvl = levels.find((l) => l.name === 'Grade 9')!;

  const classes: SchoolClass[] = [
    { id: `cls-${schoolSlug}-pp1`, school_id: schoolId, level_id: pp1Lvl.id, name: 'PP1', stream: 'Sunflowers' },
    { id: `cls-${schoolSlug}-pp2`, school_id: schoolId, level_id: pp2Lvl.id, name: 'PP2', stream: 'Butterflies' },
    { id: `cls-${schoolSlug}-g1`, school_id: schoolId, level_id: g1Lvl.id, name: 'Grade 1', stream: 'East' },
    { id: `cls-${schoolSlug}-g2`, school_id: schoolId, level_id: g2Lvl.id, name: 'Grade 2', stream: 'West' },
    { id: `cls-${schoolSlug}-g4`, school_id: schoolId, level_id: g4Lvl.id, name: 'Grade 4', stream: 'Alpha' },
    { id: `cls-${schoolSlug}-g6`, school_id: schoolId, level_id: g6Lvl.id, name: 'Grade 6', stream: 'Pioneers' },
    { id: `cls-${schoolSlug}-g7`, school_id: schoolId, level_id: g7Lvl.id, name: 'Grade 7', stream: 'Horizon' },
    { id: `cls-${schoolSlug}-g9`, school_id: schoolId, level_id: g9Lvl.id, name: 'Grade 9', stream: 'Summit' },
  ];

  // 4. Users
  const adminUser: User = {
    id: `usr-${schoolSlug}-admin`,
    school_id: schoolId,
    email: schoolSlug === 'kilimani-academy' ? 'admin@kilimani.ac.ke' : 'admin@mombasaheritage.ac.ke',
    role: 'SCHOOL_ADMIN',
    full_name: schoolSlug === 'kilimani-academy' ? 'Madam Grace Ochieng (Principal)' : 'Mr. Omar Salim (Director)',
    phone: '+254 711 223 344',
    is_active: true,
    created_at: '2025-01-10T08:00:00Z',
  };

  const teacherMwangiUser: User = {
    id: `usr-${schoolSlug}-teacher-1`,
    school_id: schoolId,
    email: schoolSlug === 'kilimani-academy' ? 'mwangi@kilimani.ac.ke' : 'hassan@mombasaheritage.ac.ke',
    role: 'TEACHER',
    full_name: 'Tr. Daniel Mwangi (B.Ed Science)',
    phone: '+254 722 556 677',
    is_active: true,
    created_at: '2025-01-11T09:00:00Z',
  };

  const teacherAminaUser: User = {
    id: `usr-${schoolSlug}-teacher-2`,
    school_id: schoolId,
    email: schoolSlug === 'kilimani-academy' ? 'amina@kilimani.ac.ke' : 'fatma@mombasaheritage.ac.ke',
    role: 'TEACHER',
    full_name: 'Tr. Amina Cherono (Early Years Lead)',
    phone: '+254 733 445 566',
    is_active: true,
    created_at: '2025-01-12T09:00:00Z',
  };

  const parentOtienoUser: User = {
    id: `usr-${schoolSlug}-parent-1`,
    school_id: schoolId,
    email: 'otieno@gmail.com',
    role: 'PARENT',
    full_name: 'Eng. David Otieno',
    phone: '+254 720 123 456',
    is_active: true,
    created_at: '2025-01-15T10:00:00Z',
  };

  const studentBrianUser: User = {
    id: `usr-${schoolSlug}-student-1`,
    school_id: schoolId,
    email: 'brian.otieno@student.ke',
    role: 'STUDENT',
    full_name: 'Brian Otieno (Grade 9)',
    phone: '+254 720 123 456',
    is_active: true,
    created_at: '2025-01-15T10:00:00Z',
  };

  const users: User[] = [adminUser, teacherMwangiUser, teacherAminaUser, parentOtienoUser, studentBrianUser];

  // 5. Teachers profile
  const teachers: Teacher[] = [
    {
      id: `tch-${schoolSlug}-1`,
      school_id: schoolId,
      user_id: teacherMwangiUser.id,
      employee_number: 'TSC/77892',
      subject_specialty: 'Mathematics, Science & Technology, Pre-Technical',
      hire_date: '2023-01-05',
      assigned_level_ids: [g4Lvl.id, g6Lvl.id, g7Lvl.id, g9Lvl.id],
      assigned_class_ids: [classes[4].id, classes[5].id, classes[7].id],
      is_active: true,
    },
    {
      id: `tch-${schoolSlug}-2`,
      school_id: schoolId,
      user_id: teacherAminaUser.id,
      employee_number: 'TSC/89401',
      subject_specialty: 'Early Years, Language Activities, Creative Arts',
      hire_date: '2022-05-10',
      assigned_level_ids: [pp1Lvl.id, pp2Lvl.id, g1Lvl.id, g2Lvl.id],
      assigned_class_ids: [classes[0].id, classes[1].id, classes[2].id],
      is_active: true,
    },
  ];

  // Link class teachers
  classes[4].class_teacher_id = teachers[0].id; // Grade 4 -> Mwangi
  classes[7].class_teacher_id = teachers[0].id; // Grade 9 -> Mwangi
  classes[0].class_teacher_id = teachers[1].id; // PP1 -> Amina

  // 6. Parents profile
  const parents: Parent[] = [
    {
      id: `par-${schoolSlug}-1`,
      school_id: schoolId,
      user_id: parentOtienoUser.id,
      relationship: 'father',
      occupation: 'Civil Engineer (KURA)',
      linked_student_ids: [`std-${schoolSlug}-g9-1`, `std-${schoolSlug}-g4-1`],
    },
  ];

  // 7. Students - Seed learners across all active classes
  const admPrefix = schoolSlug.includes('muungano') ? 'MSS' : schoolSlug.includes('mombasa') ? 'MHA' : 'KJA';
  const students: Student[] = [
    // --- Grade 9 (Junior Secondary Exit Level) ---
    {
      id: `std-${schoolSlug}-g9-1`,
      school_id: schoolId,
      user_id: studentBrianUser.id,
      admission_number: `${admPrefix}/2026/042`,
      full_name: 'Brian Otieno',
      level_id: g9Lvl.id,
      class_id: classes[7].id,
      parent_user_id: parentOtienoUser.id,
      dob: '2011-04-18',
      gender: 'male',
      student_type: 'boarding',
      photo_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=150&auto=format&fit=crop&q=80',
      kpsea_score: 84,
      sba_score: 86,
      placement_score: 82.5,
      pathway_preference: 'STEM',
      status: 'active',
      created_at: '2024-01-08T08:00:00Z',
    },
    {
      id: `std-${schoolSlug}-g9-2`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/043`,
      full_name: 'Faith Chebet',
      level_id: g9Lvl.id,
      class_id: classes[7].id,
      parent_user_id: parentOtienoUser.id,
      dob: '2011-08-22',
      gender: 'female',
      student_type: 'boarding',
      kpsea_score: 76,
      sba_score: 80,
      placement_score: 77.2,
      pathway_preference: 'SocialSciences',
      status: 'active',
      created_at: '2024-01-08T08:00:00Z',
    },
    {
      id: `std-${schoolSlug}-g9-3`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/044`,
      full_name: 'Derrick Njoroge',
      level_id: g9Lvl.id,
      class_id: classes[7].id,
      dob: '2011-02-10',
      gender: 'male',
      student_type: 'day',
      kpsea_score: 79,
      sba_score: 83,
      placement_score: 80.5,
      pathway_preference: 'STEM',
      status: 'active',
      created_at: '2024-01-08T08:00:00Z',
    },
    {
      id: `std-${schoolSlug}-g9-4`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/045`,
      full_name: 'Sharon Atieno',
      level_id: g9Lvl.id,
      class_id: classes[7].id,
      dob: '2011-11-30',
      gender: 'female',
      student_type: 'boarding',
      kpsea_score: 82,
      sba_score: 85,
      placement_score: 83.1,
      pathway_preference: 'Arts',
      status: 'active',
      created_at: '2024-01-08T08:00:00Z',
    },
    {
      id: `std-${schoolSlug}-g9-5`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/046`,
      full_name: 'Kelvin Kiprop',
      level_id: g9Lvl.id,
      class_id: classes[7].id,
      dob: '2011-06-14',
      gender: 'male',
      student_type: 'day',
      kpsea_score: 71,
      sba_score: 75,
      placement_score: 73.0,
      pathway_preference: 'STEM',
      status: 'active',
      created_at: '2024-01-08T08:00:00Z',
    },
    {
      id: `std-${schoolSlug}-g9-6`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/047`,
      full_name: 'Mercy Chepngetich',
      level_id: g9Lvl.id,
      class_id: classes[7].id,
      dob: '2011-09-03',
      gender: 'female',
      student_type: 'boarding',
      kpsea_score: 88,
      sba_score: 89,
      placement_score: 87.5,
      pathway_preference: 'SocialSciences',
      status: 'active',
      created_at: '2024-01-08T08:00:00Z',
    },

    // --- Grade 7 (Junior School) ---
    {
      id: `std-${schoolSlug}-g7-1`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/071`,
      full_name: 'Ian Kipkemboi',
      level_id: g7Lvl.id,
      class_id: classes[6].id,
      dob: '2013-05-19',
      gender: 'male',
      student_type: 'day',
      status: 'active',
      created_at: '2024-01-10T08:00:00Z',
    },
    {
      id: `std-${schoolSlug}-g7-2`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/072`,
      full_name: 'Sandra Akinyi',
      level_id: g7Lvl.id,
      class_id: classes[6].id,
      dob: '2013-08-11',
      gender: 'female',
      student_type: 'day',
      status: 'active',
      created_at: '2024-01-10T08:00:00Z',
    },
    {
      id: `std-${schoolSlug}-g7-3`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/073`,
      full_name: 'Dennis Kamau',
      level_id: g7Lvl.id,
      class_id: classes[6].id,
      dob: '2013-01-25',
      gender: 'male',
      student_type: 'boarding',
      status: 'active',
      created_at: '2024-01-10T08:00:00Z',
    },
    {
      id: `std-${schoolSlug}-g7-4`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/074`,
      full_name: 'Hope Wanjiku',
      level_id: g7Lvl.id,
      class_id: classes[6].id,
      dob: '2013-10-09',
      gender: 'female',
      student_type: 'day',
      status: 'active',
      created_at: '2024-01-10T08:00:00Z',
    },

    // --- Grade 6 (KPSEA Exam Year) ---
    {
      id: `std-${schoolSlug}-g6-1`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/091`,
      full_name: 'Kelvin Kiprotich',
      level_id: g6Lvl.id,
      class_id: classes[5].id,
      dob: '2014-04-12',
      gender: 'male',
      student_type: 'day',
      status: 'active',
      created_at: '2024-01-09T08:00:00Z',
    },
    {
      id: `std-${schoolSlug}-g6-2`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/092`,
      full_name: 'Faith Mutheu',
      level_id: g6Lvl.id,
      class_id: classes[5].id,
      dob: '2014-07-28',
      gender: 'female',
      student_type: 'day',
      status: 'active',
      created_at: '2024-01-09T08:00:00Z',
    },
    {
      id: `std-${schoolSlug}-g6-3`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/093`,
      full_name: 'Collins Oduor',
      level_id: g6Lvl.id,
      class_id: classes[5].id,
      dob: '2014-02-18',
      gender: 'male',
      student_type: 'day',
      status: 'active',
      created_at: '2024-01-09T08:00:00Z',
    },

    // --- Grade 4 (Upper Primary) ---
    {
      id: `std-${schoolSlug}-g4-1`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/118`,
      full_name: 'Stacy Otieno',
      level_id: g4Lvl.id,
      class_id: classes[4].id,
      parent_user_id: parentOtienoUser.id,
      dob: '2016-11-05',
      gender: 'female',
      student_type: 'day',
      status: 'active',
      created_at: '2024-01-08T08:00:00Z',
    },
    {
      id: `std-${schoolSlug}-g4-2`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/119`,
      full_name: 'Kevin Mutua',
      level_id: g4Lvl.id,
      class_id: classes[4].id,
      dob: '2016-03-12',
      gender: 'male',
      student_type: 'day',
      status: 'active',
      created_at: '2024-01-08T08:00:00Z',
    },
    {
      id: `std-${schoolSlug}-g4-3`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/120`,
      full_name: 'Cynthia Wangari',
      level_id: g4Lvl.id,
      class_id: classes[4].id,
      dob: '2016-09-17',
      gender: 'female',
      student_type: 'day',
      status: 'active',
      created_at: '2024-01-08T08:00:00Z',
    },
    {
      id: `std-${schoolSlug}-g4-4`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/121`,
      full_name: 'Joshua Kiplagat',
      level_id: g4Lvl.id,
      class_id: classes[4].id,
      dob: '2016-01-29',
      gender: 'male',
      student_type: 'day',
      status: 'active',
      created_at: '2024-01-08T08:00:00Z',
    },

    // --- Grade 2 (Lower Primary) ---
    {
      id: `std-${schoolSlug}-g2-1`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/151`,
      full_name: 'Emmanuel Kibet',
      level_id: g2Lvl.id,
      class_id: classes[3].id,
      dob: '2018-06-15',
      gender: 'male',
      student_type: 'day',
      status: 'active',
      created_at: '2024-01-08T08:00:00Z',
    },
    {
      id: `std-${schoolSlug}-g2-2`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/152`,
      full_name: 'Nicole Wambui',
      level_id: g2Lvl.id,
      class_id: classes[3].id,
      dob: '2018-09-21',
      gender: 'female',
      student_type: 'day',
      status: 'active',
      created_at: '2024-01-08T08:00:00Z',
    },
    {
      id: `std-${schoolSlug}-g2-3`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/153`,
      full_name: 'Victor Ochieng',
      level_id: g2Lvl.id,
      class_id: classes[3].id,
      dob: '2018-03-08',
      gender: 'male',
      student_type: 'day',
      status: 'active',
      created_at: '2024-01-08T08:00:00Z',
    },

    // --- Grade 1 (Foundation Primary) ---
    {
      id: `std-${schoolSlug}-g1-1`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/171`,
      full_name: 'Nathan Kimani',
      level_id: g1Lvl.id,
      class_id: classes[2].id,
      dob: '2019-02-14',
      gender: 'male',
      student_type: 'day',
      status: 'active',
      created_at: '2025-01-06T08:00:00Z',
    },
    {
      id: `std-${schoolSlug}-g1-2`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/172`,
      full_name: 'Precious Wairimu',
      level_id: g1Lvl.id,
      class_id: classes[2].id,
      dob: '2019-05-18',
      gender: 'female',
      student_type: 'day',
      status: 'active',
      created_at: '2025-01-06T08:00:00Z',
    },
    {
      id: `std-${schoolSlug}-g1-3`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/173`,
      full_name: 'Jabari Otieno',
      level_id: g1Lvl.id,
      class_id: classes[2].id,
      dob: '2019-10-30',
      gender: 'male',
      student_type: 'day',
      status: 'active',
      created_at: '2025-01-06T08:00:00Z',
    },

    // --- PP2 (Pre-Primary 2) ---
    {
      id: `std-${schoolSlug}-pp2-1`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/191`,
      full_name: 'Chloe Akinyi',
      level_id: pp2Lvl.id,
      class_id: classes[1].id,
      dob: '2020-04-10',
      gender: 'female',
      student_type: 'day',
      status: 'active',
      created_at: '2025-01-06T08:00:00Z',
    },
    {
      id: `std-${schoolSlug}-pp2-2`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/192`,
      full_name: 'Ryan Kipchumba',
      level_id: pp2Lvl.id,
      class_id: classes[1].id,
      dob: '2020-07-22',
      gender: 'male',
      student_type: 'day',
      status: 'active',
      created_at: '2025-01-06T08:00:00Z',
    },
    {
      id: `std-${schoolSlug}-pp2-3`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/193`,
      full_name: 'Melanie Njeri',
      level_id: pp2Lvl.id,
      class_id: classes[1].id,
      dob: '2020-11-05',
      gender: 'female',
      student_type: 'day',
      status: 'active',
      created_at: '2025-01-06T08:00:00Z',
    },

    // --- PP1 (Pre-Primary 1) ---
    {
      id: `std-${schoolSlug}-pp1-1`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/205`,
      full_name: 'Liam Kiprono',
      level_id: pp1Lvl.id,
      class_id: classes[0].id,
      dob: '2021-02-14',
      gender: 'male',
      student_type: 'day',
      status: 'active',
      created_at: '2025-01-06T08:00:00Z',
    },
    {
      id: `std-${schoolSlug}-pp1-2`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/206`,
      full_name: 'Zahra Nyambura',
      level_id: pp1Lvl.id,
      class_id: classes[0].id,
      dob: '2021-07-19',
      gender: 'female',
      student_type: 'day',
      status: 'active',
      created_at: '2025-01-06T08:00:00Z',
    },
    {
      id: `std-${schoolSlug}-pp1-3`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/207`,
      full_name: 'Ethan Barasa',
      level_id: pp1Lvl.id,
      class_id: classes[0].id,
      dob: '2021-09-02',
      gender: 'male',
      student_type: 'day',
      status: 'active',
      created_at: '2025-01-06T08:00:00Z',
    },
    {
      id: `std-${schoolSlug}-pp1-4`,
      school_id: schoolId,
      admission_number: `${admPrefix}/2026/208`,
      full_name: 'Amani Wanjiru',
      level_id: pp1Lvl.id,
      class_id: classes[0].id,
      dob: '2021-12-11',
      gender: 'female',
      student_type: 'day',
      status: 'active',
      created_at: '2025-01-06T08:00:00Z',
    },
  ];

  // 8. Exams
  const exams: Exam[] = [
    {
      id: `ex-${schoolSlug}-1`,
      school_id: schoolId,
      name: 'Term 1 End-Term Assessment 2026',
      term: 'Term 1',
      year: 2026,
      exam_type: 'Endterm',
      start_date: '2026-03-24',
      end_date: '2026-03-28',
      is_published: true,
    },
    {
      id: `ex-${schoolSlug}-2`,
      school_id: schoolId,
      name: 'Term 1 Mid-Term Evaluation 2026',
      term: 'Term 1',
      year: 2026,
      exam_type: 'Midterm',
      start_date: '2026-02-15',
      end_date: '2026-02-18',
      is_published: true,
    },
  ];

  // 9. Grades for Brian Otieno (Grade 9) and Stacy Otieno (Grade 4)
  const g9Subjects = subjects.filter((s) => s.level_id === g9Lvl.id);
  const g4Subjects = subjects.filter((s) => s.level_id === g4Lvl.id);
  const pp1Subjects = subjects.filter((s) => s.level_id === pp1Lvl.id);

  const grades: Grade[] = [];

  // Seed Grade 9 Brian
  const brianMarksMap: Record<string, number> = {
    ENG: 88, // EE2
    KISW: 76, // EE2
    MATH: 94, // EE1
    ISCI: 91, // EE1
    HLTH: 82, // EE2
    '912': 85, // EE2 (Pre-Technical)
    SS: 72, // ME1
    RE: 92, // EE1
    BUS: 81, // EE2
    '906': 78, // EE2 (Agriculture)
    LIFE: 95, // EE1
    PE: 88, // EE2
    '911': 90, // EE1 (Creative Arts)
  };

  g9Subjects.forEach((sub) => {
    const mark = brianMarksMap[sub.code] || 75;
    let rubric: any = 'ME1';
    let pts = 6;
    if (mark >= 90) {
      rubric = 'EE1';
      pts = 8;
    } else if (mark >= 75) {
      rubric = 'EE2';
      pts = 7;
    } else if (mark >= 58) {
      rubric = 'ME1';
      pts = 6;
    } else if (mark >= 41) {
      rubric = 'ME2';
      pts = 5;
    }

    grades.push({
      id: `grd-${schoolSlug}-brian-${sub.code}`,
      school_id: schoolId,
      exam_id: exams[0].id,
      student_id: students[0].id,
      subject_id: sub.id,
      marks: mark,
      rubric_level: rubric,
      points: pts,
      teacher_comment:
        pts >= 7
          ? 'Demonstrates exemplary competency and critical analytical skills.'
          : 'Consistent progress shown in core strand competencies.',
      entered_by_teacher_id: teachers[0].id,
    });
  });

  // Seed Grade 4 Stacy
  g4Subjects.forEach((sub, sIdx) => {
    const marks = [82, 74, 91, 79, 85, 68, 88, 92][sIdx % 8];
    let rubric: any = 'EE2';
    let pts = 7;
    if (marks >= 90) {
      rubric = 'EE1';
      pts = 8;
    } else if (marks >= 75) {
      rubric = 'EE2';
      pts = 7;
    } else if (marks >= 58) {
      rubric = 'ME1';
      pts = 6;
    }

    grades.push({
      id: `grd-${schoolSlug}-stacy-${sub.code}`,
      school_id: schoolId,
      exam_id: exams[0].id,
      student_id: students[2].id,
      subject_id: sub.id,
      marks,
      rubric_level: rubric,
      points: pts,
      teacher_comment: 'Good understanding of concepts with active classroom participation.',
      entered_by_teacher_id: teachers[0].id,
    });
  });

  // Seed PP1 Liam (Rubric only, marks NULL)
  pp1Subjects.forEach((sub, sIdx) => {
    const rubrics: any[] = ['EE1', 'EE2', 'ME1', 'EE1', 'ME1'];
    const rubric = rubrics[sIdx % rubrics.length];
    grades.push({
      id: `grd-${schoolSlug}-liam-${sub.code}`,
      school_id: schoolId,
      exam_id: exams[0].id,
      student_id: students[4].id,
      subject_id: sub.id,
      marks: null, // PP1 Rubric only!
      rubric_level: rubric,
      points: rubric === 'EE1' ? 8 : rubric === 'EE2' ? 7 : 6,
      teacher_comment: 'Demonstrates joyful coordination, curiosity and social interaction.',
      entered_by_teacher_id: teachers[1].id,
    });
  });

  // 10. Formative Assessments
  const formativeAssessments: FormativeAssessment[] = [
    {
      id: `fa-${schoolSlug}-1`,
      school_id: schoolId,
      student_id: students[0].id,
      subject_id: g9Subjects[0].id,
      strand: 'Reading Comprehension',
      sub_strand: 'Critical analysis of contemporary African prose',
      rubric_level: 'EE1',
      points: 8,
      assessed_by_teacher_id: teachers[0].id,
      assessment_date: '2026-02-10',
      comment: 'Excellent synthesis of allegorical themes and voice.',
    },
    {
      id: `fa-${schoolSlug}-2`,
      school_id: schoolId,
      student_id: students[0].id,
      subject_id: g9Subjects[2].id, // Math
      strand: 'Algebraic Expressions',
      sub_strand: 'Quadratic equations in real-life problem solving',
      rubric_level: 'EE1',
      points: 8,
      assessed_by_teacher_id: teachers[0].id,
      assessment_date: '2026-02-18',
      comment: 'Mastery in factoring and graphical quadratic models.',
    },
  ];

  // 11. Report Cards
  const reportCards: ReportCard[] = [
    {
      id: `rc-${schoolSlug}-brian`,
      school_id: schoolId,
      student_id: students[0].id,
      exam_id: exams[0].id,
      published: true,
      published_at: '2026-03-30T10:00:00Z',
      class_teacher_remark: 'An exceptional learner who consistently exhibits deep conceptual mastery.',
      principal_remark: 'Outstanding attainment across all CBC core learning areas. Ready for senior secondary STEM.',
    },
    {
      id: `rc-${schoolSlug}-stacy`,
      school_id: schoolId,
      student_id: students[2].id,
      exam_id: exams[0].id,
      published: true,
      published_at: '2026-03-30T10:00:00Z',
      class_teacher_remark: 'Stacy is hardworking and cooperates well with her peers during practical activities.',
      principal_remark: 'Commendable performance. Keep maintaining this keen focus in Grade 4.',
    },
  ];

  // 12. Attendance
  const attendance: Attendance[] = [
    {
      id: `att-${schoolSlug}-1`,
      school_id: schoolId,
      student_id: students[0].id,
      date: '2026-03-02',
      status: 'present',
      marked_by_teacher_id: teachers[0].id,
      remarks: 'Punctual',
    },
    {
      id: `att-${schoolSlug}-2`,
      school_id: schoolId,
      student_id: students[0].id,
      date: '2026-03-03',
      status: 'present',
      marked_by_teacher_id: teachers[0].id,
    },
    {
      id: `att-${schoolSlug}-3`,
      school_id: schoolId,
      student_id: students[0].id,
      date: '2026-03-04',
      status: 'present',
      marked_by_teacher_id: teachers[0].id,
    },
    {
      id: `att-${schoolSlug}-4`,
      school_id: schoolId,
      student_id: students[2].id,
      date: '2026-03-02',
      status: 'present',
      marked_by_teacher_id: teachers[0].id,
    },
    {
      id: `att-${schoolSlug}-5`,
      school_id: schoolId,
      student_id: students[2].id,
      date: '2026-03-03',
      status: 'late',
      marked_by_teacher_id: teachers[0].id,
      remarks: 'Morning traffic delay',
    },
  ];

  // 13. Fee Structures
  const feeStructures: FeeStructure[] = [
    {
      id: `fee-${schoolSlug}-g9-t1`,
      school_id: schoolId,
      class_id: classes[7].id, // Grade 9
      term: 'Term 1',
      year: 2026,
      line_items: [
        { name: 'Tuition & Academic CBC Materials', amount: 32000, applies_to: 'all' },
        { name: 'Science Laboratory & Practical Kit', amount: 6500, applies_to: 'all' },
        { name: 'ICT & Coding Lab Fee', amount: 4500, applies_to: 'all' },
        { name: 'Boarding, Accommodation & Diet', amount: 28000, applies_to: 'boarding_only' },
        { name: 'School Lunch & Refreshment Program', amount: 9500, applies_to: 'day_only' },
        { name: 'Activity, Sports & Co-Curricular', amount: 3000, applies_to: 'all' },
      ],
      total_day_amount: 55500,
      total_boarding_amount: 74000,
    },
    {
      id: `fee-${schoolSlug}-g4-t1`,
      school_id: schoolId,
      class_id: classes[4].id, // Grade 4
      term: 'Term 1',
      year: 2026,
      line_items: [
        { name: 'Tuition & Workbooks', amount: 24000, applies_to: 'all' },
        { name: 'School Lunch Program', amount: 8000, applies_to: 'day_only' },
        { name: 'Swimming & Physical Education', amount: 3500, applies_to: 'all' },
        { name: 'Boarding Fee', amount: 22000, applies_to: 'boarding_only' },
      ],
      total_day_amount: 35500,
      total_boarding_amount: 49500,
    },
  ];

  // 14. Invoices
  const invoices: Invoice[] = [
    {
      id: `inv-${schoolSlug}-brian`,
      school_id: schoolId,
      student_id: students[0].id,
      fee_structure_id: feeStructures[0].id,
      invoice_number: `INV-${schoolSlug.toUpperCase()}-2026-001`,
      amount_due: 74000, // Boarding
      amount_paid: 74000,
      balance: 0,
      due_date: '2026-01-20',
      status: 'paid',
      created_at: '2026-01-05T09:00:00Z',
    },
    {
      id: `inv-${schoolSlug}-stacy`,
      school_id: schoolId,
      student_id: students[2].id,
      fee_structure_id: feeStructures[1].id,
      invoice_number: `INV-${schoolSlug.toUpperCase()}-2026-002`,
      amount_due: 35500, // Day
      amount_paid: 25000,
      balance: 10500,
      due_date: '2026-01-20',
      status: 'partial',
      created_at: '2026-01-05T09:00:00Z',
    },
  ];

  // 15. Payments
  const payments: Payment[] = [
    {
      id: `pay-${schoolSlug}-1`,
      school_id: schoolId,
      invoice_id: invoices[0].id,
      amount_paid: 74000,
      payment_date: '2026-01-12',
      method: 'mpesa',
      reference: 'QKD89XLP47',
      receipt_number: `REC-${schoolSlug.slice(0, 3).toUpperCase()}-1001`,
      recorded_by: adminUser.full_name,
    },
    {
      id: `pay-${schoolSlug}-2`,
      school_id: schoolId,
      invoice_id: invoices[1].id,
      amount_paid: 25000,
      payment_date: '2026-01-14',
      method: 'bank',
      reference: 'EBNK-9823412',
      receipt_number: `REC-${schoolSlug.slice(0, 3).toUpperCase()}-1002`,
      recorded_by: adminUser.full_name,
    },
  ];

  // 16. Timetable
  const timetable: TimetableSlot[] = [
    {
      id: `tt-${schoolSlug}-1`,
      school_id: schoolId,
      class_id: classes[7].id, // Grade 9
      subject_id: g9Subjects[2].id, // Math
      teacher_id: teachers[0].id,
      day_of_week: 1, // Mon
      period: 1,
      start_time: '08:00',
      end_time: '08:45',
      room: 'Science Lab 2',
    },
    {
      id: `tt-${schoolSlug}-2`,
      school_id: schoolId,
      class_id: classes[7].id,
      subject_id: g9Subjects[3].id, // Integrated Sci
      teacher_id: teachers[0].id,
      day_of_week: 1,
      period: 2,
      start_time: '08:45',
      end_time: '09:30',
      room: 'Science Lab 2',
    },
    {
      id: `tt-${schoolSlug}-3`,
      school_id: schoolId,
      class_id: classes[7].id,
      subject_id: g9Subjects[0].id, // English
      teacher_id: teachers[1].id,
      day_of_week: 1,
      period: 3,
      start_time: '09:45',
      end_time: '10:30',
      room: 'Room 9A',
    },
  ];

  // 17. Messages
  const messages: Message[] = [
    {
      id: `msg-${schoolSlug}-1`,
      school_id: schoolId,
      sender_user_id: parentOtienoUser.id,
      receiver_user_id: teacherMwangiUser.id,
      student_id: students[0].id,
      body: 'Good morning Tr. Daniel. Please advise on the equipment needed for the Grade 9 Robotics & Pre-Technical project.',
      read_at: '2026-02-12T08:30:00Z',
      created_at: '2026-02-12T07:45:00Z',
    },
    {
      id: `msg-${schoolSlug}-2`,
      school_id: schoolId,
      sender_user_id: teacherMwangiUser.id,
      receiver_user_id: parentOtienoUser.id,
      student_id: students[0].id,
      body: 'Hello Eng. Otieno. Brian has already been assigned our standard school Arduino sensor kit; he only requires safety goggles and standard AA batteries.',
      read_at: '2026-02-12T09:05:00Z',
      created_at: '2026-02-12T08:50:00Z',
    },
  ];

  // 18. Announcements
  const announcements: Announcement[] = [
    {
      id: `anc-${schoolSlug}-1`,
      school_id: schoolId,
      title: 'Term 1 2026 Academic Clinic & Career Pathway Exhibition',
      body: 'Dear Parents, our Senior School Pathway Guidance Forum for Grade 8 and 9 learners will take place on Saturday, March 21st from 9:00 AM at the Multi-Purpose Hall.',
      audience: 'all',
      posted_by: adminUser.full_name,
      created_at: '2026-03-01T10:00:00Z',
      sms_sent: true,
    },
    {
      id: `anc-${schoolSlug}-2`,
      school_id: schoolId,
      title: 'KNEC CBA Assessment Portal Upload Schedule',
      body: 'Teachers are reminded to complete all formative and project score entry on ElimuCore by Friday 15th to facilitate synchronized batch upload.',
      audience: 'teachers',
      posted_by: adminUser.full_name,
      created_at: '2026-03-05T14:30:00Z',
      sms_sent: false,
    },
  ];

  // 19. Library
  const books: Book[] = [
    {
      id: `bk-${schoolSlug}-1`,
      school_id: schoolId,
      title: 'Spotlight Junior Secondary Integrated Science Grade 9',
      author: 'Dr. J. K. Mungai & Team',
      isbn: '978-9966-05-412-1',
      category: 'Science',
      total_copies: 40,
      available_copies: 38,
    },
    {
      id: `bk-${schoolSlug}-2`,
      school_id: schoolId,
      title: 'Moran Pre-Technical & Pre-Career Education Learner’s Book',
      author: 'Prof. A. W. Wanjala',
      isbn: '978-9966-34-882-9',
      category: 'Technical',
      total_copies: 35,
      available_copies: 34,
    },
    {
      id: `bk-${schoolSlug}-3`,
      school_id: schoolId,
      title: 'A Doll’s House & Selected African Plays',
      author: 'Henrik Ibsen / KICD Approved',
      isbn: '978-0140-44-842-8',
      category: 'Literature',
      total_copies: 50,
      available_copies: 48,
    },
  ];

  const bookLoans: BookLoan[] = [
    {
      id: `ln-${schoolSlug}-1`,
      school_id: schoolId,
      book_id: books[0].id,
      student_id: students[0].id,
      borrowed_at: '2026-02-01',
      due_date: '2026-02-15',
      returned_at: '2026-02-14',
      fine_amount: 0,
      status: 'returned',
    },
    {
      id: `ln-${schoolSlug}-2`,
      school_id: schoolId,
      book_id: books[1].id,
      student_id: students[0].id,
      borrowed_at: '2026-03-01',
      due_date: '2026-03-15',
      fine_amount: 0,
      status: 'active',
    },
  ];

  // 20. Transport
  const routes: TransportRoute[] = [
    {
      id: `rt-${schoolSlug}-1`,
      school_id: schoolId,
      name: 'Route 1: Kileleshwa - Lavington - Kilimani Express',
      description: 'Morning and evening scheduled yellow bus transport',
      fee_per_term: 14000,
    },
    {
      id: `rt-${schoolSlug}-2`,
      school_id: schoolId,
      name: 'Route 2: Ngong Road - Karen - Adams Arcade',
      description: 'Executive shuttle with GPS tracking',
      fee_per_term: 16500,
    },
  ];

  const routeStops: RouteStop[] = [
    {
      id: `stp-${schoolSlug}-1`,
      school_id: schoolId,
      route_id: routes[0].id,
      stop_name: 'Lavington Mall Roundabout',
      pickup_time: '06:45 AM',
      dropoff_time: '04:15 PM',
      order_index: 1,
    },
    {
      id: `stp-${schoolSlug}-2`,
      school_id: schoolId,
      route_id: routes[0].id,
      stop_name: 'Kileleshwa Police Station Junction',
      pickup_time: '07:05 AM',
      dropoff_time: '04:35 PM',
      order_index: 2,
    },
  ];

  const studentTransports: StudentTransport[] = [
    {
      id: `st-${schoolSlug}-1`,
      school_id: schoolId,
      student_id: students[2].id, // Stacy (Day student)
      route_id: routes[0].id,
      stop_id: routeStops[0].id,
      term: 'Term 1',
      year: 2026,
    },
  ];

  // 21. Hostel
  const hostels: Hostel[] = [
    { id: `hst-${schoolSlug}-1`, school_id: schoolId, name: 'Mount Kenya Boys Hall', gender: 'male', capacity: 80 },
    { id: `hst-${schoolSlug}-2`, school_id: schoolId, name: 'Aberdare Girls Hall', gender: 'female', capacity: 80 },
  ];

  const hostelRooms: HostelRoom[] = [
    { id: `rm-${schoolSlug}-101`, school_id: schoolId, hostel_id: hostels[0].id, room_number: 'B-101', capacity: 4 },
    { id: `rm-${schoolSlug}-102`, school_id: schoolId, hostel_id: hostels[0].id, room_number: 'B-102', capacity: 4 },
  ];

  const hostelAllocations: HostelAllocation[] = [
    {
      id: `ha-${schoolSlug}-1`,
      school_id: schoolId,
      student_id: students[0].id, // Brian Otieno (Boarding)
      room_id: hostelRooms[0].id,
      term: 'Term 1',
      year: 2026,
      check_in_date: '2026-01-07',
    },
  ];

  // 22. Payroll & Staff
  const staffAttendances: StaffAttendance[] = [
    {
      id: `sa-${schoolSlug}-1`,
      school_id: schoolId,
      teacher_id: teachers[0].id,
      date: '2026-03-02',
      status: 'present',
      check_in: '07:15',
      check_out: '16:45',
    },
    {
      id: `sa-${schoolSlug}-2`,
      school_id: schoolId,
      teacher_id: teachers[1].id,
      date: '2026-03-02',
      status: 'present',
      check_in: '07:22',
      check_out: '16:30',
    },
  ];

  const leaveRequests: LeaveRequest[] = [
    {
      id: `lr-${schoolSlug}-1`,
      school_id: schoolId,
      teacher_id: teachers[0].id,
      start_date: '2026-04-05',
      end_date: '2026-04-07',
      reason: 'Attending KICD National Curriculum Sensitization Workshop',
      status: 'approved',
      approved_by: adminUser.full_name,
      created_at: '2026-02-20T11:00:00Z',
    },
  ];

  const payrollRecords: PayrollRecord[] = [
    {
      id: `pr-${schoolSlug}-1`,
      school_id: schoolId,
      teacher_id: teachers[0].id,
      month: 2,
      year: 2026,
      basic_salary: 68000,
      allowances: 14000, // House + Commuter allowance
      deductions: 9200, // PAYE + SHIF + NSSF + Housing Levy
      net_pay: 72800,
      status: 'paid',
      paid_at: '2026-02-28T16:00:00Z',
    },
    {
      id: `pr-${schoolSlug}-2`,
      school_id: schoolId,
      teacher_id: teachers[1].id,
      month: 2,
      year: 2026,
      basic_salary: 62000,
      allowances: 12500,
      deductions: 8400,
      net_pay: 66100,
      status: 'paid',
      paid_at: '2026-02-28T16:00:00Z',
    },
  ];

  // 23. Grade 9 KJSEA Project Scores
  const projectScores: ProjectScore[] = [
    {
      id: `ps-${schoolSlug}-1`,
      school_id: schoolId,
      student_id: students[0].id,
      subject_code: '911', // Creative Arts
      project_score: 92,
      uploaded_at: '2026-03-12T14:00:00Z',
      uploaded_by: teachers[0].employee_number,
    },
    {
      id: `ps-${schoolSlug}-2`,
      school_id: schoolId,
      student_id: students[0].id,
      subject_code: '912', // Pre-Technical
      project_score: 95,
      uploaded_at: '2026-03-12T14:00:00Z',
      uploaded_by: teachers[0].employee_number,
    },
    {
      id: `ps-${schoolSlug}-3`,
      school_id: schoolId,
      student_id: students[0].id,
      subject_code: '906', // Agriculture
      project_score: 88,
      uploaded_at: '2026-03-12T14:00:00Z',
      uploaded_by: teachers[0].employee_number,
    },
  ];

  // 24. Discipline Logs
  const disciplineLogs: DisciplineLog[] = [
    {
      id: `disc-${schoolSlug}-1`,
      school_id: schoolId,
      student_id: students[1].id,
      incident_date: '2026-02-14',
      category: 'minor',
      description: 'Found outside assigned dormitory study hall during evening prep hours.',
      action_taken: 'Verbal reprimand and assigned library organization duty on Saturday morning.',
      recorded_by: teachers[0].user_id,
    },
  ];

  // 25. Inventory Items
  const inventoryItems: InventoryItem[] = [
    {
      id: `inv-it-${schoolSlug}-1`,
      school_id: schoolId,
      name: 'A4 Ruled Exercise Books (200 Pages)',
      category: 'Stationery',
      quantity: 480,
      unit_price: 120,
    },
    {
      id: `inv-it-${schoolSlug}-2`,
      school_id: schoolId,
      name: 'Microcontroller Starter Kit for Pre-Technical Studies',
      category: 'Laboratory Kits',
      quantity: 8, // Low stock alert! (<10)
      unit_price: 3500,
    },
    {
      id: `inv-it-${schoolSlug}-3`,
      school_id: schoolId,
      name: 'Junior Football / Soccer Balls (Size 4)',
      category: 'Sports',
      quantity: 24,
      unit_price: 1800,
    },
  ];

  const inventoryIssues: InventoryIssue[] = [
    {
      id: `issue-${schoolSlug}-1`,
      school_id: schoolId,
      item_id: inventoryItems[1].id,
      issued_to_user_id: teachers[0].user_id,
      quantity: 4,
      issue_date: '2026-01-22',
      notes: 'Issued for Grade 9 Summit pre-technical breadboard demonstration.',
    },
  ];

  // 26. Gate Passes
  const gatePasses: GatePass[] = [
    {
      id: `gp-${schoolSlug}-1`,
      school_id: schoolId,
      student_id: students[0].id,
      reason: 'Scheduled orthodontist clinic appointment at Nairobi Hospital',
      out_time: '2026-03-02 10:00',
      in_time: '2026-03-02 13:45',
      approved_by: adminUser.full_name,
      status: 'returned',
    },
  ];

  // 27. Donations
  const donations: Donation[] = [
    {
      id: `don-${schoolSlug}-1`,
      school_id: schoolId,
      donor_name: 'Kilimani Alumni Association 2018',
      amount: 150000,
      category: 'STEM Laboratory Expansion',
      receipt_no: `DON-${schoolSlug.slice(0, 3).toUpperCase()}-0082`,
      donation_date: '2026-02-05',
      notes: 'Earmarked for renewable solar experiment benches in Junior Secondary.',
    },
  ];

  // 28. DPA 2019 Compliance Records
  const consentRecords: ConsentRecord[] = [
    {
      id: `cs-${schoolSlug}-1`,
      school_id: schoolId,
      student_id: students[0].id,
      parent_user_id: parentOtienoUser.id,
      consent_type: 'data_processing',
      granted: true,
      granted_at: '2025-01-15T10:10:00Z',
      ip_address: '102.219.208.4',
    },
    {
      id: `cs-${schoolSlug}-2`,
      school_id: schoolId,
      student_id: students[0].id,
      parent_user_id: parentOtienoUser.id,
      consent_type: 'sms_communication',
      granted: true,
      granted_at: '2025-01-15T10:10:00Z',
      ip_address: '102.219.208.4',
    },
    {
      id: `cs-${schoolSlug}-3`,
      school_id: schoolId,
      student_id: students[0].id,
      parent_user_id: parentOtienoUser.id,
      consent_type: 'photo_use',
      granted: true,
      granted_at: '2025-01-15T10:10:00Z',
      ip_address: '102.219.208.4',
    },
  ];

  const dataRequests: DataRequest[] = [
    {
      id: `dreq-${schoolSlug}-1`,
      school_id: schoolId,
      requester_user_id: parentOtienoUser.id,
      request_type: 'access',
      status: 'completed',
      sla_due_date: '2026-02-28',
      completed_at: '2026-02-24',
      notes: 'Full student digital profile export provided to verified parent.',
      created_at: '2026-02-21T09:00:00Z',
    },
  ];

  const breachLogs: BreachLog[] = [
    {
      id: `br-${schoolSlug}-1`,
      school_id: schoolId,
      detected_at: '2025-11-12T04:20:00Z',
      description: 'Simulated brute-force lockout triggered on portal endpoint. Automatically contained by rate limiter.',
      affected_users: 0,
      notified_odpc_at: '2025-11-12T12:00:00Z',
      remediation: 'IP range banned, two-factor authentication enforced on staff endpoints.',
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: `aud-${schoolSlug}-1`,
      school_id: schoolId,
      user_id: adminUser.id,
      action: 'PUBLISH_EXAM_RESULTS',
      entity: 'Exam',
      entity_id: exams[0].id,
      ip_address: '197.237.142.12',
      created_at: '2026-03-30T10:00:00Z',
    },
    {
      id: `aud-${schoolSlug}-2`,
      school_id: schoolId,
      user_id: teacherMwangiUser.id,
      action: 'GRADE_MODIFIED',
      entity: 'Grade',
      entity_id: `${exams[0].id}:MATH-rubric-revision`,
      ip_address: '197.237.142.18',
      created_at: '2026-03-29T14:22:00Z',
    },
    {
      id: `aud-${schoolSlug}-3`,
      school_id: schoolId,
      user_id: adminUser.id,
      action: 'FEE_ADJUSTED',
      entity: 'Invoice',
      entity_id: `INV-${schoolSlug.toUpperCase()}-2026-0001:Bursary-Credit-5000`,
      ip_address: '197.237.142.12',
      created_at: '2026-03-28T11:15:00Z',
    },
    {
      id: `aud-${schoolSlug}-4`,
      school_id: schoolId,
      user_id: adminUser.id,
      action: 'STUDENT_DELETED',
      entity: 'Student',
      entity_id: `Transfer-Cleared:${schoolSlug.toUpperCase()}-2026-019`,
      ip_address: '197.237.142.12',
      created_at: '2026-03-27T09:40:00Z',
    },
    {
      id: `aud-${schoolSlug}-5`,
      school_id: schoolId,
      user_id: adminUser.id,
      action: 'FEE_PAYMENT_RECORDED',
      entity: 'Payment',
      entity_id: `MPESA-SKD492018:KES-15000`,
      ip_address: '197.237.142.15',
      created_at: '2026-03-26T16:05:00Z',
    },
  ];

  return {
    levels,
    subjects,
    classes,
    users,
    teachers,
    parents,
    students,
    exams,
    grades,
    formativeAssessments,
    reportCards,
    attendance,
    feeStructures,
    invoices,
    payments,
    timetable,
    messages,
    announcements,
    books,
    bookLoans,
    routes,
    routeStops,
    studentTransports,
    hostels,
    hostelRooms,
    hostelAllocations,
    staffAttendances,
    leaveRequests,
    payrollRecords,
    projectScores,
    disciplineLogs,
    inventoryItems,
    inventoryIssues,
    gatePasses,
    donations,
    consentRecords,
    dataRequests,
    breachLogs,
    auditLogs,
  };
}
