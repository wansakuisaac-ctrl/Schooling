import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import { SyncService } from '../../services/syncService';
import {
  Briefcase,
  CalendarCheck,
  ListCheck,
  FileText,
  Calendar,
  MessageSquare,
  Award,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
} from 'lucide-react';

interface TeacherPortalProps {
  onNavigate: (module: string) => void;
}

export const TeacherPortal: React.FC<TeacherPortalProps> = ({ onNavigate }) => {
  const { currentSchool, currentUser } = useAuth();
  const schoolId = currentSchool?.id || '';

  // Leave Form
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveReason, setLeaveReason] = useState('Attending KICD Competency-Based Assessment Workshop');
  const [leaveStart, setLeaveStart] = useState('2026-04-10');
  const [leaveEnd, setLeaveEnd] = useState('2026-04-12');
  const [leaveSuccess, setLeaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (schoolId) {
      void SyncService.cacheActiveSchool(schoolId);
    }
  }, [schoolId]);

  if (!currentSchool || !currentUser) return null;

  const teachers = dbService.getTeachers(schoolId);
  const myTeacherProfile = teachers.find((t) => t.user_id === currentUser.id) || teachers[0];
  const classes = dbService.getClasses(schoolId);
  const myClasses = myTeacherProfile
    ? classes.filter((c) => myTeacherProfile.assigned_class_ids.includes(c.id))
    : [];

  const myLeaves = myTeacherProfile
    ? dbService.getLeaveRequests(schoolId, myTeacherProfile.id)
    : [];
  const myPayslips = myTeacherProfile
    ? dbService.getPayrollRecords(schoolId, myTeacherProfile.id)
    : [];

  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myTeacherProfile) return;
    dbService.submitLeaveRequest(schoolId, {
      teacher_id: myTeacherProfile.id,
      start_date: leaveStart,
      end_date: leaveEnd,
      reason: leaveReason,
    });
    setIsLeaveModalOpen(false);
    setLeaveSuccess('Leave request submitted to School Principal for approval.');
    setTimeout(() => setLeaveSuccess(null), 4000);
  };

  const displayName = myTeacherProfile?.user.full_name || currentUser.full_name;
  const displayEmpNo = myTeacherProfile?.employee_number || 'TSC-FACULTY';
  const displaySpecialty = myTeacherProfile?.subject_specialty || 'CBC Learning Areas';

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header Profile Banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-xl font-black">
            {displayName.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold">{displayName}</h1>
            <div className="text-xs text-emerald-300 mt-0.5 flex flex-wrap items-center gap-2">
              <span className="font-mono bg-emerald-800/60 px-2 py-0.5 rounded font-bold">
                {displayEmpNo}
              </span>
              <span>•</span>
              <span>Specialty: {displaySpecialty}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsLeaveModalOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Apply for Leave
        </button>
      </div>

      {leaveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{leaveSuccess}</span>
        </div>
      )}

      {/* Quick Access Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <button
          onClick={() => onNavigate('attendance')}
          className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-emerald-500 text-left transition flex flex-col justify-between group"
        >
          <div className="p-2 w-fit rounded-lg bg-emerald-100 text-emerald-800 mb-3 group-hover:bg-emerald-700 group-hover:text-white transition">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm">Daily Roll-Call</div>
            <div className="text-slate-500 text-[11px] mt-0.5">Mark class attendance</div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('exams_scores')}
          className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-emerald-500 text-left transition flex flex-col justify-between group"
        >
          <div className="p-2 w-fit rounded-lg bg-blue-100 text-blue-800 mb-3 group-hover:bg-blue-700 group-hover:text-white transition">
            <ListCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm">8-Level CBC Scores</div>
            <div className="text-slate-500 text-[11px] mt-0.5">Enter summative rubrics</div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('formative')}
          className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-emerald-500 text-left transition flex flex-col justify-between group"
        >
          <div className="p-2 w-fit rounded-lg bg-teal-100 text-teal-800 mb-3 group-hover:bg-teal-700 group-hover:text-white transition">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm">Formative Strands</div>
            <div className="text-slate-500 text-[11px] mt-0.5">Continuous CBA records</div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('timetable')}
          className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs hover:border-emerald-500 text-left transition flex flex-col justify-between group"
        >
          <div className="p-2 w-fit rounded-lg bg-purple-100 text-purple-800 mb-3 group-hover:bg-purple-700 group-hover:text-white transition">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm">Weekly Timetable</div>
            <div className="text-slate-500 text-[11px] mt-0.5">Teaching periods & rooms</div>
          </div>
        </button>
      </div>

      {/* Assigned Classes */}
      <div className="space-y-3">
        <h3 className="font-bold text-sm text-slate-900">My Assigned Teaching Classes</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {myClasses.map((cls) => {
            const count = dbService.getStudents(schoolId, { classId: cls.id }).length;
            return (
              <div key={cls.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-900">{cls.name} - {cls.stream}</span>
                  <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                    {count} Learners
                  </span>
                </div>
                <p className="text-slate-500 text-[11px]">
                  Assigned curriculum lead for Mathematics, Integrated Science & Technology.
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leave Application Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Teacher Leave Application</h3>
            <form onSubmit={handleApplyLeave} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={leaveStart}
                    onChange={(e) => setLeaveStart(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={leaveEnd}
                    onChange={(e) => setLeaveEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Leave</label>
                <textarea
                  rows={3}
                  required
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsLeaveModalOpen(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 text-white rounded-lg font-bold"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
