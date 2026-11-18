import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useViewMode } from '../../context/ViewModeContext';
import {
  LayoutDashboard,
  Folder,
  FolderOpen,
  GraduationCap,
  Users,
  School,
  FileSpreadsheet,
  FileText,
  Calendar,
  BookOpen,
  Bus,
  MessageSquare,
  Award,
  Laptop,
  ChevronRight,
  ArrowLeft,
  X,
  UserCheck,
  CheckSquare,
  BarChart2,
  Trophy,
  HelpCircle,
  BookMarked,
  ShieldCheck,
  Building2,
  Server,
  DollarSign,
  HeartHandshake,
  Briefcase,
  Layers,
  FileCheck2,
  Search,
  LogOut,
  Database,
} from 'lucide-react';

interface SidebarProps {
  activeModule: string;
  setActiveModule: (mod: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

type SubmenuType =
  | 'root'
  | 'registry'
  | 'academics'
  | 'elearning'
  | 'timetable'
  | 'cbc'
  | 'library'
  | 'transport'
  | 'messaging'
  | 'finance';

interface SystemModuleItem {
  id: string;
  uniqueKey: string;
  title: string;
  category: string;
  icon: React.ElementType;
  keywords: string[];
  roleRequired?: string;
}

const ALL_SYSTEM_MODULES: SystemModuleItem[] = [
  // Dashboards & Portals
  {
    id: 'admin_dashboard',
    uniqueKey: 'admin_dashboard',
    title: 'Admin Dashboard',
    category: 'Dashboard',
    icon: LayoutDashboard,
    keywords: ['dashboard', 'overview', 'metrics', 'school stats', 'kpi', 'home'],
  },
  {
    id: 'db_health',
    uniqueKey: 'admin_db_health',
    title: 'PostgreSQL Pool Health',
    category: 'Dashboard',
    icon: Database,
    keywords: ['database', 'postgres', 'postgresql', 'health', 'latency', 'pool', 'connections', 'errors'],
  },
  {
    id: 'audit_logs',
    uniqueKey: 'admin_audit_logs',
    title: 'Audit Log & Security Trail',
    category: 'Dashboard',
    icon: ShieldCheck,
    keywords: ['audit', 'logs', 'security', 'grade modifications', 'fee adjustments', 'deletions', 'dpa'],
  },
  {
    id: 'teacher_portal',
    uniqueKey: 'teacher_portal',
    title: 'Teacher Portal',
    category: 'Portals',
    icon: GraduationCap,
    keywords: ['teacher', 'educator', 'my classes', 'grading', 'portal'],
  },
  {
    id: 'parent_portal',
    uniqueKey: 'parent_portal',
    title: 'Parent Portal',
    category: 'Portals',
    icon: HeartHandshake,
    keywords: ['parent', 'guardian', 'fees', 'progress', 'portal'],
  },
  {
    id: 'student_portal',
    uniqueKey: 'student_portal',
    title: 'Student Portal',
    category: 'Portals',
    icon: Users,
    keywords: ['student', 'learner', 'grades', 'homework', 'portal'],
  },
  {
    id: 'platform_dashboard',
    uniqueKey: 'platform_dashboard',
    title: 'Platform SaaS Dashboard',
    category: 'Platform SaaS',
    icon: Server,
    keywords: ['platform', 'saas', 'super admin', 'tenants'],
    roleRequired: 'PLATFORM_OWNER',
  },
  {
    id: 'platform_schools',
    uniqueKey: 'platform_schools',
    title: 'Platform Schools & Tenants',
    category: 'Platform SaaS',
    icon: Building2,
    keywords: ['schools', 'tenants', 'saas', 'multi-school'],
    roleRequired: 'PLATFORM_OWNER',
  },

  // Registry
  {
    id: 'classes_subjects',
    uniqueKey: 'registry_subjects',
    title: 'Subjects & Learning Areas',
    category: 'Registry',
    icon: GraduationCap,
    keywords: ['subjects', 'learning areas', 'curriculum', 'strands', 'academics'],
  },
  {
    id: 'teachers',
    uniqueKey: 'registry_teachers',
    title: 'School Staff & Teachers',
    category: 'Registry',
    icon: Users,
    keywords: ['staff', 'teachers', 'employees', 'faculty', 'tsc', 'instructors'],
  },
  {
    id: 'classes_subjects',
    uniqueKey: 'registry_classes',
    title: 'Classes & Streams',
    category: 'Registry',
    icon: School,
    keywords: ['classes', 'streams', 'levels', 'junior secondary', 'primary'],
  },
  {
    id: 'students',
    uniqueKey: 'registry_students',
    title: 'Students Data & Bio',
    category: 'Registry',
    icon: UserCheck,
    keywords: ['students', 'learners', 'pupils', 'nemisi', 'upi', 'bio', 'enrollment'],
  },
  {
    id: 'admissions',
    uniqueKey: 'registry_admissions',
    title: 'Admissions & Intake',
    category: 'Registry',
    icon: FileText,
    keywords: ['admissions', 'intake', 'enrollment', 'new student', 'registration'],
  },
  {
    id: 'book_records',
    uniqueKey: 'registry_book_records',
    title: 'Book Records & Courseware',
    category: 'Registry',
    icon: BookMarked,
    keywords: ['books', 'courseware', 'textbooks', 'issuance', 'kicd'],
  },
  {
    id: 'documents',
    uniqueKey: 'registry_documents',
    title: 'Documents & Certificates',
    category: 'Registry',
    icon: Folder,
    keywords: ['documents', 'certificates', 'transcripts', 'letters', 'uploads', 'files'],
  },
  {
    id: 'parents',
    uniqueKey: 'registry_parents',
    title: 'User Accounts & Guardians',
    category: 'Registry',
    icon: Users,
    keywords: ['parents', 'users', 'logins', 'credentials', 'guardians', 'passwords'],
  },
  {
    id: 'saved_files',
    uniqueKey: 'registry_saved_files',
    title: 'Saved Files & Downloads',
    category: 'Registry',
    icon: Folder,
    keywords: ['saved files', 'archives', 'downloads', 'exports', 'excel', 'reports'],
  },

  // Academics
  {
    id: 'marks_entry',
    uniqueKey: 'academics_marks_entry',
    title: 'Marks Entry (Assessment)',
    category: 'Academics',
    icon: FileSpreadsheet,
    keywords: ['marks entry', 'grading', 'scores', 'raw marks', 'cbc rubric', 'evaluations'],
  },
  {
    id: 'broadsheets',
    uniqueKey: 'academics_broadsheets',
    title: 'Broadsheets (Master Matrix)',
    category: 'Academics',
    icon: FileSpreadsheet,
    keywords: ['broadsheet', 'broadsheets', 'matrix', 'tabulation', 'class performance', 'marks list', 'score sheet'],
  },
  {
    id: 'marksheet',
    uniqueKey: 'academics_marksheet',
    title: 'Marksheets',
    category: 'Academics',
    icon: FileText,
    keywords: ['marksheet', 'marksheets', 'subject scores', 'grades sheet'],
  },
  {
    id: 'exams_scores',
    uniqueKey: 'academics_exams_scores',
    title: 'Manage Exams & Grading',
    category: 'Academics',
    icon: FileCheck2,
    keywords: ['exams', 'grading', 'rubrics', 'tests', 'assessments', '8-level'],
  },
  {
    id: 'report_cards',
    uniqueKey: 'academics_report_cards',
    title: 'CBC Progress Reports & Report Cards',
    category: 'Academics',
    icon: BarChart2,
    keywords: ['report cards', 'progress reports', 'transcripts', 'pdf', 'results'],
  },
  {
    id: 'contests',
    uniqueKey: 'academics_contests',
    title: 'Academic Contests & Olympiads',
    category: 'Academics',
    icon: Trophy,
    keywords: ['contests', 'competitions', 'olympiads', 'awards', 'symposiums'],
  },
  {
    id: 'elearning',
    uniqueKey: 'academics_elearning',
    title: 'eLearning & Study Notes',
    category: 'eLearning',
    icon: Laptop,
    keywords: ['elearning', 'study notes', 'revision', 'quizzes', 'flashcards', 'kicd'],
  },

  // CBC Management
  {
    id: 'formative',
    uniqueKey: 'cbc_formative',
    title: 'Formative Assessments & Strands',
    category: 'CBC Management',
    icon: CheckSquare,
    keywords: ['formative', 'strands', 'sub-strands', 'cba', 'continuous assessment', 'cbc'],
  },
  {
    id: 'kjsea',
    uniqueKey: 'cbc_kjsea',
    title: 'Grade 9 KJSEA & CBA Placement',
    category: 'CBC Management',
    icon: Award,
    keywords: ['kjsea', 'knec', 'grade 9', 'cba placement', 'senior school pathways'],
  },

  // Timetable & Operations
  {
    id: 'timetable',
    uniqueKey: 'ops_timetable',
    title: 'Timetables & Workload Allocations',
    category: 'Timetable',
    icon: Calendar,
    keywords: ['timetable', 'lessons', 'periods', 'routine', 'teacher workload', 'schedule'],
  },
  {
    id: 'attendance',
    uniqueKey: 'ops_attendance',
    title: 'Student Attendance Register',
    category: 'Operations',
    icon: CheckSquare,
    keywords: ['attendance', 'roll call', 'daily attendance', 'absenteeism', 'present'],
  },
  {
    id: 'library',
    uniqueKey: 'ops_library',
    title: 'Library & Book Lending',
    category: 'Library',
    icon: Building2,
    keywords: ['library', 'books', 'catalog', 'borrowing', 'returns', 'loans'],
  },
  {
    id: 'transport',
    uniqueKey: 'ops_transport',
    title: 'Transport & Bus Routes',
    category: 'Transport',
    icon: Bus,
    keywords: ['transport', 'bus routes', 'vans', 'drivers', 'stages', 'manifest'],
  },
  {
    id: 'hostel',
    uniqueKey: 'ops_hostel',
    title: 'Hostel & Boarding Facilities',
    category: 'Operations',
    icon: Building2,
    keywords: ['hostel', 'boarding', 'dormitory', 'beds', 'cubicles'],
  },
  {
    id: 'inventory',
    uniqueKey: 'ops_inventory',
    title: 'Inventory & School Stores',
    category: 'Operations',
    icon: Layers,
    keywords: ['inventory', 'stores', 'supplies', 'stock', 'procurement', 'assets'],
  },
  {
    id: 'gate_pass',
    uniqueKey: 'ops_gate_pass',
    title: 'Security & Gate Pass',
    category: 'Operations',
    icon: ShieldCheck,
    keywords: ['gate pass', 'security', 'visitor pass', 'student exit', 'clearance'],
  },
  {
    id: 'discipline',
    uniqueKey: 'ops_discipline',
    title: 'Discipline & Conduct Records',
    category: 'Operations',
    icon: ShieldCheck,
    keywords: ['discipline', 'conduct', 'merits', 'demerits', 'counseling', 'behavior'],
  },

  // Finance & Bursar
  {
    id: 'fees',
    uniqueKey: 'finance_fees',
    title: 'Fee Invoices & M-Pesa Collections',
    category: 'Finance',
    icon: DollarSign,
    keywords: ['fees', 'bursar', 'invoices', 'receipts', 'balances', 'mpesa', 'paybill'],
  },
  {
    id: 'payroll',
    uniqueKey: 'finance_payroll',
    title: 'Staff Payroll & Payslips',
    category: 'Finance',
    icon: Briefcase,
    keywords: ['payroll', 'salary', 'payslips', 'wages', 'nhif', 'nssf', 'statutory'],
  },
  {
    id: 'donations',
    uniqueKey: 'finance_donations',
    title: 'Donations & Sponsorships',
    category: 'Finance',
    icon: HeartHandshake,
    keywords: ['donations', 'sponsorships', 'bursaries', 'grants', 'fundraising'],
  },

  // Bulk Messaging & Communications
  {
    id: 'notifications',
    uniqueKey: 'msg_notifications',
    title: "Africa's Talking SMS Broadcast",
    category: 'Bulk Messaging',
    icon: MessageSquare,
    keywords: ['sms', 'notifications', 'bulk sms', 'broadcast', 'africas talking', 'text alerts'],
  },
  {
    id: 'announcements',
    uniqueKey: 'msg_announcements',
    title: 'School Circulars & Notices',
    category: 'Bulk Messaging',
    icon: BookOpen,
    keywords: ['announcements', 'circulars', 'notices', 'memo', 'bulletin', 'news'],
  },
  {
    id: 'messages',
    uniqueKey: 'msg_messages',
    title: 'Parent-Teacher Messaging & Chat',
    category: 'Bulk Messaging',
    icon: MessageSquare,
    keywords: ['messages', 'chat', 'parent teacher', 'conversations', 'inbox'],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeModule,
  setActiveModule,
  isOpen,
  onClose,
}) => {
  const { currentRole, currentSchool, currentUser, logout } = useAuth();
  const { effectiveIsMobile } = useViewMode();
  const [activeSubmenu, setActiveSubmenu] = useState<SubmenuType>('root');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const schoolName = currentSchool ? currentSchool.name.toUpperCase() : 'MUUNGANO SENIOR SCHOOL';

  const handleSelectModule = (modId: string) => {
    setActiveModule(modId);
    onClose();
  };

  const handleBackToRoot = () => {
    setActiveSubmenu('root');
  };

  // Keyboard shortcut: "/" to quickly focus global module search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter modules based on search query and user role
  const filteredModules = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    return ALL_SYSTEM_MODULES.filter((item) => {
      // Role access checks
      if (item.roleRequired && currentRole !== item.roleRequired) {
        return false;
      }
      if (
        item.id === 'teacher_portal' &&
        currentRole !== 'TEACHER' &&
        currentRole !== 'SCHOOL_ADMIN'
      ) {
        return false;
      }
      if (
        item.id === 'parent_portal' &&
        currentRole !== 'PARENT' &&
        currentRole !== 'SCHOOL_ADMIN'
      ) {
        return false;
      }
      if (
        (item.id === 'db_health' || item.id === 'audit_logs') &&
        currentRole !== 'SCHOOL_ADMIN' &&
        currentRole !== 'PLATFORM_OWNER'
      ) {
        return false;
      }
      if (
        item.id === 'student_portal' &&
        currentRole !== 'STUDENT' &&
        currentRole !== 'SCHOOL_ADMIN'
      ) {
        return false;
      }

      const matchTitle = item.title.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchId = item.id.toLowerCase().includes(q);
      const matchKeywords = item.keywords.some((kw) => kw.toLowerCase().includes(q));

      return matchTitle || matchCategory || matchId || matchKeywords;
    });
  }, [searchQuery, currentRole]);

  // Helper to highlight matching text in title
  const highlightMatch = (text: string, query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return text;
    const idx = text.toLowerCase().indexOf(trimmed.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-emerald-100 text-emerald-900 font-bold px-0.5 rounded-xs">
          {text.slice(idx, idx + trimmed.length)}
        </mark>
        {text.slice(idx + trimmed.length)}
      </>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className={`fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs ${
            effectiveIsMobile ? '' : 'md:hidden'
          }`}
          onClick={onClose}
        />
      )}

      {/* Drawer / Sidebar Container */}
      <aside
        className={`bg-white text-slate-800 flex flex-col border-r border-slate-200 transition-transform duration-200 ease-in-out shrink-0 overflow-hidden ${
          effectiveIsMobile
            ? `fixed top-0 left-0 z-50 h-screen w-72 sm:w-80 shadow-2xl ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
              }`
            : `fixed md:sticky top-0 left-0 z-40 h-screen w-72 sm:w-80 shadow-2xl md:shadow-none ${
                isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
              }`
        }`}
      >
        {/* Top Header Card - Exact Match with Green Banner */}
        <div className="bg-[#38a169] text-white px-4 py-3.5 flex items-center justify-between shadow-xs select-none">
          <div className="flex items-center gap-2 overflow-hidden">
            <h2 className="font-extrabold text-sm sm:text-base tracking-wide truncate uppercase leading-tight">
              {schoolName}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition shrink-0"
            title="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Global Module Search Input Field */}
        <div className="p-2.5 bg-slate-50 border-b border-slate-200">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchQuery('');
                }
              }}
              placeholder="Search modules (e.g. Marks, Fees)..."
              className="w-full pl-9 pr-8 py-2 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition shadow-2xs"
              aria-label="Filter modules by name"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2 p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="hidden sm:inline-block absolute right-2.5 text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 pointer-events-none">
                /
              </span>
            )}
          </div>
          {searchQuery.trim() && (
            <div className="mt-1.5 flex items-center justify-between px-1 text-[11px] text-slate-500 font-medium">
              <span>
                {filteredModules.length === 1
                  ? '1 module found'
                  : `${filteredModules.length} modules found`}
              </span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer font-semibold text-[11px]"
              >
                Clear filter
              </button>
            </div>
          )}
        </div>

        {/* Submenu Top Bar (when drilled down, only visible when not searching) */}
        {!searchQuery.trim() && activeSubmenu !== 'root' && (
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
            <button
              onClick={handleBackToRoot}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500 text-emerald-800 hover:bg-amber-50/50 font-bold text-xs transition"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-emerald-700" />
              <span>Back</span>
            </button>
            <span className="font-bold text-slate-800 text-sm capitalize">
              {activeSubmenu === 'cbc' ? 'CBC Management' : activeSubmenu}
            </span>
          </div>
        )}

        {/* Navigation Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-0.5">
          {searchQuery.trim() ? (
            /* SEARCH FILTERED RESULTS VIEW */
            <div className="space-y-1 py-1">
              {filteredModules.length > 0 ? (
                filteredModules.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = activeModule === item.id;
                  return (
                    <button
                      key={item.uniqueKey}
                      onClick={() => {
                        handleSelectModule(item.id);
                        setSearchQuery('');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition group ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 font-bold'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isActive
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 group-hover:bg-emerald-50 group-hover:text-emerald-700'
                          }`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <div className="text-[13px] font-semibold truncate leading-tight text-slate-900">
                            {highlightMatch(item.title, searchQuery)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                            <span className="uppercase tracking-wider px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold">
                              {item.category}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0 ml-2" />
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-8 px-4">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <Search className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    No modules match "{searchQuery}"
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Try searching for keywords like marks, fees, broadsheet, or attendance.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      searchInputRef.current?.focus();
                    }}
                    className="mt-3 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                  >
                    Reset Search
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* ROOT MENU LEVEL */}
              {activeSubmenu === 'root' && (
                <div className="space-y-1 py-1">
                  {/* 1. DASHBOARD */}
              <button
                onClick={() =>
                  handleSelectModule(
                    currentRole === 'PLATFORM_OWNER'
                      ? 'platform_dashboard'
                      : currentRole === 'TEACHER'
                      ? 'teacher_portal'
                      : currentRole === 'PARENT'
                      ? 'parent_portal'
                      : currentRole === 'STUDENT'
                      ? 'student_portal'
                      : 'admin_dashboard'
                  )
                }
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition text-left ${
                  activeModule === 'admin_dashboard' ||
                  activeModule === 'platform_dashboard' ||
                  activeModule === 'teacher_portal' ||
                  activeModule === 'parent_portal' ||
                  activeModule === 'student_portal'
                    ? 'bg-emerald-50 text-emerald-800 font-extrabold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <LayoutDashboard className="w-5 h-5 text-slate-600" />
                  <span className="tracking-wide uppercase font-bold text-[13px]">
                    DASHBOARD
                  </span>
                </div>
              </button>

              {(currentRole === 'SCHOOL_ADMIN' || currentRole === 'PLATFORM_OWNER') && (
                <>
                  <button
                    onClick={() => handleSelectModule('db_health')}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium transition text-left ${
                      activeModule === 'db_health'
                        ? 'bg-emerald-50 text-emerald-800 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <Database className="w-5 h-5 text-slate-600" />
                      <span className="text-[13px] font-semibold text-slate-800">
                        Database Health
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => handleSelectModule('audit_logs')}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium transition text-left ${
                      activeModule === 'audit_logs'
                        ? 'bg-emerald-50 text-emerald-800 font-bold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <ShieldCheck className="w-5 h-5 text-slate-600" />
                      <span className="text-[13px] font-semibold text-slate-800">
                        Audit Logs
                      </span>
                    </div>
                  </button>
                </>
              )}

              {/* 2. Saved Files */}
              <button
                onClick={() => handleSelectModule('saved_files')}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium transition text-left ${
                  activeModule === 'saved_files'
                    ? 'bg-emerald-50 text-emerald-800 font-bold'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <Folder className="w-5 h-5 text-slate-600" />
                  <span className="text-[13px] font-semibold text-slate-800">Saved Files</span>
                </div>
              </button>

              {/* 3. Registry > */}
              <button
                onClick={() => setActiveSubmenu('registry')}
                className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <FolderOpen className="w-5 h-5 text-slate-600" />
                  <span className="text-[13px] font-semibold text-slate-800">Registry</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" />
              </button>

              {/* 4. Academics > */}
              <button
                onClick={() => setActiveSubmenu('academics')}
                className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <GraduationCap className="w-5 h-5 text-slate-600" />
                  <span className="text-[13px] font-semibold text-slate-800">Academics</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" />
              </button>

              {/* 5. eLearning > */}
              <button
                onClick={() => setActiveSubmenu('elearning')}
                className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <Laptop className="w-5 h-5 text-slate-600" />
                  <span className="text-[13px] font-semibold text-slate-800">eLearning</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" />
              </button>

              {/* 6. Timetable > */}
              <button
                onClick={() => setActiveSubmenu('timetable')}
                className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <Calendar className="w-5 h-5 text-slate-600" />
                  <span className="text-[13px] font-semibold text-slate-800">Timetable</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" />
              </button>

              {/* 7. CBC Management > */}
              <button
                onClick={() => setActiveSubmenu('cbc')}
                className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <Users className="w-5 h-5 text-slate-600" />
                  <span className="text-[13px] font-semibold text-slate-800">CBC Management</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" />
              </button>

              {/* 8. Library > */}
              <button
                onClick={() => setActiveSubmenu('library')}
                className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <Building2 className="w-5 h-5 text-slate-600" />
                  <span className="text-[13px] font-semibold text-slate-800">Library</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" />
              </button>

              {/* 9. Transport > */}
              <button
                onClick={() => setActiveSubmenu('transport')}
                className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <Bus className="w-5 h-5 text-slate-600" />
                  <span className="text-[13px] font-semibold text-slate-800">Transport</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" />
              </button>

              {/* 10. Bulk Messaging > */}
              <button
                onClick={() => setActiveSubmenu('messaging')}
                className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <MessageSquare className="w-5 h-5 text-slate-600" />
                  <span className="text-[13px] font-semibold text-slate-800">Bulk Messaging</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" />
              </button>

              {/* Extra: Finance / Bursar > */}
              <button
                onClick={() => setActiveSubmenu('finance')}
                className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <DollarSign className="w-5 h-5 text-slate-600" />
                  <span className="text-[13px] font-semibold text-slate-800">Finance &amp; Fees</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition" />
              </button>

              {/* If Authenticated Platform Owner */}
              {currentRole === 'PLATFORM_OWNER' && currentUser?.role === 'PLATFORM_OWNER' && (
                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleSelectModule('platform_schools')}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-purple-800 bg-purple-50 hover:bg-purple-100 transition"
                  >
                    <div className="flex items-center gap-3">
                      <Server className="w-4 h-4 text-purple-700" />
                      <span>Platform SaaS Tenants</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SUBMENU 1: REGISTRY (Exact match to Screenshot 2) */}
          {activeSubmenu === 'registry' && (
            <div className="space-y-0.5 py-1">
              <button
                onClick={() => handleSelectModule('classes_subjects')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <GraduationCap className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">&gt;</span>
                  <span className="font-semibold text-slate-800 text-[13px]">Subjects</span>
                </div>
              </button>

              <button
                onClick={() => handleSelectModule('teachers')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">&gt;</span>
                  <span className="font-semibold text-slate-800 text-[13px]">School Staff</span>
                </div>
              </button>

              <button
                onClick={() => handleSelectModule('classes_subjects')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <School className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">&gt;</span>
                  <span className="font-semibold text-slate-800 text-[13px]">Classes</span>
                </div>
              </button>

              <button
                onClick={() => handleSelectModule('students')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <UserCheck className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">&gt;</span>
                  <span className="font-semibold text-slate-800 text-[13px]">Students Data</span>
                </div>
              </button>

              <button
                onClick={() => handleSelectModule('admissions')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition group"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">&gt;</span>
                  <span className="font-semibold text-slate-800 text-[13px]">Admissions</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => handleSelectModule('book_records')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition group"
              >
                <div className="flex items-center gap-3">
                  <BookMarked className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">&gt;</span>
                  <span className="font-semibold text-slate-800 text-[13px]">Book Records</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => handleSelectModule('documents')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition group"
              >
                <div className="flex items-center gap-3">
                  <Folder className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">&gt;</span>
                  <span className="font-semibold text-slate-800 text-[13px]">Documents</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => handleSelectModule('parents')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">&gt;</span>
                  <span className="font-semibold text-slate-800 text-[13px]">User Accounts</span>
                </div>
              </button>
            </div>
          )}

          {/* SUBMENU 2: ACADEMICS (Exact match to Screenshot 3 & 4) */}
          {activeSubmenu === 'academics' && (
            <div className="space-y-0.5 py-1">
              <button
                onClick={() => handleSelectModule('classes_subjects')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">&gt;</span>
                  <span className="font-semibold text-slate-800 text-[13px]">Academic Groups</span>
                </div>
              </button>

              <button
                onClick={() => handleSelectModule('timetable')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">&gt;</span>
                  <span className="font-semibold text-slate-800 text-[13px]">Lessons</span>
                </div>
              </button>

              <button
                onClick={() => handleSelectModule('exams_scores')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <BarChart2 className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">&gt;</span>
                  <span className="font-semibold text-slate-800 text-[13px]">Grading &amp; Remarks</span>
                </div>
              </button>

              <button
                onClick={() => handleSelectModule('exams_scores')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <FileCheck2 className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">&gt;</span>
                  <span className="font-semibold text-slate-800 text-[13px]">Manage Exams</span>
                </div>
              </button>

              {/* Marks Entry (Unified Learning Areas) */}
              <button
                onClick={() => handleSelectModule('marks_entry')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span className="text-slate-400">&gt;</span>
                  <span className="font-semibold text-slate-800 text-[13px]">Marks Entry</span>
                </div>
              </button>

              {/* Marksheet */}
              <button
                onClick={() => handleSelectModule('marksheet')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">&gt;</span>
                  <span className="font-semibold text-slate-800 text-[13px]">Marksheet</span>
                </div>
              </button>

              {/* Broadsheets */}
              <button
                onClick={() => handleSelectModule('broadsheets')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">&gt;</span>
                  <span className="font-semibold text-slate-800 text-[13px]">Broadsheets</span>
                </div>
              </button>

              {/* Reports & Analysis */}
              <button
                onClick={() => handleSelectModule('report_cards')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition group"
              >
                <div className="flex items-center gap-3">
                  <BarChart2 className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">&gt;</span>
                  <span className="font-semibold text-slate-800 text-[13px]">Reports &amp; Analysis</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Contests */}
              <button
                onClick={() => handleSelectModule('contests')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <Trophy className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">&gt;</span>
                  <span className="font-semibold text-slate-800 text-[13px]">Contests</span>
                </div>
              </button>

              {/* Learning Support */}
              <button
                onClick={() => handleSelectModule('elearning')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition group"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">&gt;</span>
                  <span className="font-semibold text-slate-800 text-[13px]">Learning Support</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* User Accounts */}
              <button
                onClick={() => handleSelectModule('teachers')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span className="text-slate-400">&gt;</span>
                  <span className="font-semibold text-slate-800 text-[13px]">User Accounts</span>
                </div>
              </button>
            </div>
          )}

          {/* SUBMENU 3: CBC MANAGEMENT */}
          {activeSubmenu === 'cbc' && (
            <div className="space-y-0.5 py-1">
              <button
                onClick={() => handleSelectModule('exams_scores')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <span className="text-slate-400">&gt;</span>
                <span>8-Level Rubrics (EE1–BE2)</span>
              </button>
              <button
                onClick={() => handleSelectModule('formative')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <span className="text-slate-400">&gt;</span>
                <span>Formative Assessments &amp; Strands</span>
              </button>
              <button
                onClick={() => handleSelectModule('kjsea')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <span className="text-slate-400">&gt;</span>
                <span>Grade 9 KJSEA &amp; CBA Placement</span>
              </button>
              <button
                onClick={() => handleSelectModule('report_cards')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <span className="text-slate-400">&gt;</span>
                <span>CBC Progress Reports (PDF)</span>
              </button>
            </div>
          )}

          {/* SUBMENU 4: ELEARNING */}
          {activeSubmenu === 'elearning' && (
            <div className="space-y-0.5 py-1">
              <button
                onClick={() => handleSelectModule('elearning')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <span className="text-slate-400">&gt;</span>
                <span>CBC Digital Study Notes</span>
              </button>
              <button
                onClick={() => handleSelectModule('elearning')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <span className="text-slate-400">&gt;</span>
                <span>Revision Quizzes &amp; Flashcards</span>
              </button>
              <button
                onClick={() => handleSelectModule('elearning')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <span className="text-slate-400">&gt;</span>
                <span>KICD Curriculum Guides</span>
              </button>
            </div>
          )}

          {/* SUBMENU 5: TIMETABLE */}
          {activeSubmenu === 'timetable' && (
            <div className="space-y-0.5 py-1">
              <button
                onClick={() => handleSelectModule('timetable')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <span className="text-slate-400">&gt;</span>
                <span>Class Master Timetables</span>
              </button>
              <button
                onClick={() => handleSelectModule('timetable')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <span className="text-slate-400">&gt;</span>
                <span>Teacher Workload Allocations</span>
              </button>
            </div>
          )}

          {/* SUBMENU 6: LIBRARY */}
          {activeSubmenu === 'library' && (
            <div className="space-y-0.5 py-1">
              <button
                onClick={() => handleSelectModule('library')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <span className="text-slate-400">&gt;</span>
                <span>Book Catalog &amp; Loans</span>
              </button>
              <button
                onClick={() => handleSelectModule('book_records')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <span className="text-slate-400">&gt;</span>
                <span>CBC Courseware Issuance</span>
              </button>
            </div>
          )}

          {/* SUBMENU 7: TRANSPORT */}
          {activeSubmenu === 'transport' && (
            <div className="space-y-0.5 py-1">
              <button
                onClick={() => handleSelectModule('transport')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <span className="text-slate-400">&gt;</span>
                <span>Bus Routes &amp; Pick-Up Stages</span>
              </button>
              <button
                onClick={() => handleSelectModule('transport')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <span className="text-slate-400">&gt;</span>
                <span>Student Passenger Manifests</span>
              </button>
            </div>
          )}

          {/* SUBMENU 8: BULK MESSAGING */}
          {activeSubmenu === 'messaging' && (
            <div className="space-y-0.5 py-1">
              <button
                onClick={() => handleSelectModule('notifications')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <span className="text-slate-400">&gt;</span>
                <span>Africa's Talking SMS Broadcast</span>
              </button>
              <button
                onClick={() => handleSelectModule('announcements')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <span className="text-slate-400">&gt;</span>
                <span>School Circulars &amp; Notices</span>
              </button>
              <button
                onClick={() => handleSelectModule('messages')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <span className="text-slate-400">&gt;</span>
                <span>Parent-Teacher Chat</span>
              </button>
            </div>
          )}

          {/* SUBMENU 9: FINANCE & FEES */}
          {activeSubmenu === 'finance' && (
            <div className="space-y-0.5 py-1">
              <button
                onClick={() => handleSelectModule('fees')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <span className="text-slate-400">&gt;</span>
                <span>Fee Invoices &amp; M-Pesa</span>
              </button>
              <button
                onClick={() => handleSelectModule('payroll')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <span className="text-slate-400">&gt;</span>
                <span>Staff Payroll &amp; Payslips</span>
              </button>
              <button
                onClick={() => handleSelectModule('donations')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-slate-50"
              >
                <span className="text-slate-400">&gt;</span>
                <span>Donations &amp; Sponsorships</span>
              </button>
            </div>
          )}
            </>
          )}
        </div>

        {/* Footer info with User & Tenant info */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/80 text-xs">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                {currentUser?.full_name?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-slate-800 text-xs truncate">
                  {currentUser?.full_name || 'Logged User'}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {currentUser?.role?.replace('_', ' ') || currentRole}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                logout();
              }}
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
            <span className="truncate">
              <strong className="text-slate-700">Tenant:</strong> {currentSchool?.slug}
            </span>
            <span className="flex items-center gap-1 shrink-0 text-emerald-700 font-medium text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Active
            </span>
          </div>
        </div>
      </aside>
    </>
  );
};
