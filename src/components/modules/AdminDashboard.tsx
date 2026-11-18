import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import {
  Users,
  GraduationCap,
  DollarSign,
  CalendarCheck,
  Briefcase,
  PlusCircle,
  Award,
  CreditCard,
  ArrowRight,
  TrendingUp,
  Database,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { AuditLogModule } from './AuditLogModule';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

interface AdminDashboardProps {
  onNavigate: (module: string) => void;
  onOpenSetupProfile?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigate,
  onOpenSetupProfile,
}) => {
  const { currentSchool, currentUser } = useAuth();
  if (!currentSchool) return null;

  const schoolId = currentSchool.id;
  const students = dbService.getStudents(schoolId);
  const teachers = dbService.getTeachers(schoolId);
  const levels = dbService.getLevels(schoolId);
  const invoices = dbService.getInvoices(schoolId);
  const payments = dbService.getPayments(schoolId);
  const leaveRequests = dbService.getLeaveRequests(schoolId);
  const pendingLeaves = leaveRequests.filter((l) => l.status === 'pending');

  // Attendance rate today
  const today = '2026-03-02'; // Demo active date
  const todayAttendance = dbService.getAttendance(schoolId, undefined, today);
  const presentCount = todayAttendance.filter((a) => a.status === 'present' || a.status === 'late').length;
  const attendanceRate =
    todayAttendance.length > 0
      ? Math.round((presentCount / todayAttendance.length) * 100)
      : 0;

  // Fees calculation
  const totalBilled = invoices.reduce((sum, inv) => sum + inv.amount_due, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.amount_paid, 0);
  const feeRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

  // Breakdown by CBC tiers
  const earlyYears = students.filter((s) => {
    const lvl = levels.find((l) => l.id === s.level_id);
    return lvl && (lvl.name === 'PP1' || lvl.name === 'PP2');
  }).length;

  const lowerPrimary = students.filter((s) => {
    const lvl = levels.find((l) => l.id === s.level_id);
    return lvl && ['Grade 1', 'Grade 2', 'Grade 3'].includes(lvl.name);
  }).length;

  const middlePrimary = students.filter((s) => {
    const lvl = levels.find((l) => l.id === s.level_id);
    return lvl && ['Grade 4', 'Grade 5', 'Grade 6'].includes(lvl.name);
  }).length;

  const juniorSecondary = students.filter((s) => {
    const lvl = levels.find((l) => l.id === s.level_id);
    return lvl && ['Grade 7', 'Grade 8', 'Grade 9'].includes(lvl.name);
  }).length;

  // Chart data: Enrollment by Level
  const enrollmentByLevelData = levels.map((lvl) => {
    const count = students.filter((s) => s.level_id === lvl.id).length;
    return {
      level: lvl.name,
      learners: count,
    };
  });

  // Simulated Attendance 5-day Trend
  const attendanceTrendData = [
    { day: 'Mon', rate: 95 },
    { day: 'Tue', rate: 97 },
    { day: 'Wed', rate: 94 },
    { day: 'Thu', rate: 96 },
    { day: 'Fri', rate: 98 },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {currentUser?.needs_profile_setup && onOpenSetupProfile && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-sm font-semibold text-slate-900">
              Complete Your School Profile Setup
            </div>
            <p className="text-xs text-slate-600">
              Confirm your school name, active academic year, and initial CBC grade levels for this workspace.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenSetupProfile}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Setup Profile</span>
          </button>
        </div>
      )}

      {/* Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            {currentSchool.name}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Academic Year {currentSchool.academic_year} • {currentSchool.current_term} • CBC Educational Operations
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate('admissions')}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Admissions
          </button>
          <button
            onClick={() => onNavigate('marks_entry')}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Award className="w-3.5 h-3.5 text-white" />
            Marks Entry
          </button>
          <button
            onClick={() => onNavigate('broadsheets')}
            className="px-3 py-1.5 bg-emerald-900 hover:bg-emerald-950 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Award className="w-3.5 h-3.5 text-amber-300" />
            Broadsheets
          </button>
          <button
            onClick={() => onNavigate('marksheet')}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Award className="w-3.5 h-3.5 text-emerald-400" />
            Marksheet
          </button>
          <button
            onClick={() => onNavigate('saved_files')}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
            Saved Files
          </button>
          <button
            onClick={() => onNavigate('report_cards')}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
            Report Cards
          </button>
          <button
            onClick={() => onNavigate('db_health')}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs whitespace-nowrap"
          >
            <Database className="w-3.5 h-3.5 text-slate-700" />
            Database Health
          </button>
          <button
            onClick={() => onNavigate('audit_logs')}
            className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs whitespace-nowrap"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            Audit Logs
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Learners Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Enrolled Learners</span>
            <GraduationCap className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{students.length}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>JSS G7–9: <strong>{juniorSecondary}</strong></span>
          </div>
        </div>

        {/* Teachers Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active Teaching Staff</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{teachers.length}</div>
          <div className="text-[11px] text-blue-700 font-semibold mt-1">100% curriculum deployed</div>
        </div>

        {/* Fees Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Fees Collected</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            KES {totalPaid.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
            {feeRate}% of KES {totalBilled.toLocaleString()}
          </div>
        </div>

        {/* Attendance Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Today Attendance</span>
            <CalendarCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{attendanceRate}%</div>
          <div className="text-[11px] text-purple-700 font-semibold mt-1">
            {todayAttendance.filter((a) => a.status === 'absent').length} absent logged
          </div>
        </div>

        {/* Pending Leave Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Staff Leave Queue</span>
            <Briefcase className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{pendingLeaves.length}</div>
          <div className="text-[11px] text-amber-700 font-semibold mt-1">
            {pendingLeaves.length > 0 ? 'Requires Bursar Review' : 'All requests addressed'}
          </div>
        </div>
      </div>

      {/* CBC Level Breakdown Strip */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
          CBC Enrollment Distribution by Educational Stage
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
            <div className="text-xs text-emerald-800 font-semibold">Early Years (PP1–PP2)</div>
            <div className="text-xl font-bold text-emerald-950 mt-1">{earlyYears} learners</div>
            <div className="text-[11px] text-slate-500">Language, Math & Psychomotor</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="text-xs text-blue-800 font-semibold">Lower Primary (Grade 1–3)</div>
            <div className="text-xl font-bold text-blue-950 mt-1">{lowerPrimary} learners</div>
            <div className="text-[11px] text-slate-500">Foundational Literacy & Numeracy</div>
          </div>
          <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
            <div className="text-xs text-indigo-800 font-semibold">Middle Primary (Grade 4–6)</div>
            <div className="text-xl font-bold text-indigo-950 mt-1">{middlePrimary} learners</div>
            <div className="text-[11px] text-slate-500">KPSEA Assessment Ready</div>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
            <div className="text-xs text-purple-800 font-semibold">Junior Secondary (Grade 7–9)</div>
            <div className="text-xl font-bold text-purple-950 mt-1">{juniorSecondary} learners</div>
            <div className="text-[11px] text-slate-500">Grade 9 KJSEA Senior Placement</div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Enrollment by Level Bar Chart */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Learners per School Level</h3>
              <p className="text-xs text-slate-500">Distribution across PP1 to Grade 9</p>
            </div>
            <button
              onClick={() => onNavigate('students')}
              className="text-xs font-semibold text-emerald-700 hover:underline flex items-center gap-1"
            >
              View Roster <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={enrollmentByLevelData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="level" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="learners" fill="#047857" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance Rate Trend */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Attendance Rate Trend</h3>
              <p className="text-xs text-slate-500">Weekly school-wide presence %</p>
            </div>
            <span className="text-xs font-bold text-emerald-700 px-2 py-0.5 rounded bg-emerald-50">
              Avg 96.2%
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis domain={[80, 100]} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#7c3aed"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#7c3aed' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sensitive Activity & Audit Log Preview */}
      <AuditLogModule compact onViewFull={() => onNavigate('audit_logs')} />
    </div>
  );
};
