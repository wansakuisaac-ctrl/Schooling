import React, { useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import { SyncService } from '../../services/syncService';
import {
  GraduationCap,
  Calendar,
  BookOpen,
  Award,
  DoorOpen,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface StudentPortalProps {
  onNavigate: (module: string) => void;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({ onNavigate }) => {
  const { currentSchool, currentUser } = useAuth();
  const schoolId = currentSchool?.id || '';

  useEffect(() => {
    if (schoolId) {
      void SyncService.cacheActiveSchool(schoolId);
    }
  }, [schoolId]);

  if (!currentSchool || !currentUser) return null;

  const students = dbService.getStudents(schoolId);
  const myStudent = students.find((s) => s.user_id === currentUser.id) || students[0];

  if (!myStudent) {
    return (
      <div className="p-6 text-center text-sm text-slate-600">
        No learner profile is currently loaded for {currentSchool.name}.
      </div>
    );
  }

  const classes = dbService.getClasses(schoolId);
  const myClass = classes.find((c) => c.id === myStudent.class_id) || classes[0];
  const subjects = dbService.getSubjects(schoolId, myStudent.level_id);
  const grades = dbService.getStudentGrades(schoolId, myStudent.id);
  const bookLoans = dbService.getBookLoans(schoolId, myStudent.id);
  const books = dbService.getBooks(schoolId);
  const gatePasses = dbService.getGatePasses(schoolId).filter((gp) => gp.student_id === myStudent.id);
  const timetable = dbService.getTimetable(schoolId, myStudent.class_id);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Student Profile Header */}
      <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white rounded-2xl p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-xl font-black">
            {myStudent.full_name.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold">{myStudent.full_name}</h1>
            <div className="text-xs text-emerald-300 mt-0.5 flex flex-wrap items-center gap-2">
              <span className="font-mono bg-emerald-800/60 px-2 py-0.5 rounded font-bold">
                Adm: {myStudent.admission_number}
              </span>
              <span>•</span>
              <span>{myClass ? `${myClass.name} - ${myClass.stream}` : 'Assigned Class'}</span>
              <span>•</span>
              <span className="capitalize">{myStudent.student_type} Scholar</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => onNavigate('report_cards')}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
        >
          <Award className="w-4 h-4" />
          View CBC Progress Report
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: My Learning Areas & Timetable */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Enrolled CBC Learning Areas</h3>
              <span className="text-xs text-emerald-800 font-bold">{subjects.length} Subjects</span>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {subjects.map((sub) => {
                const grade = grades.find((g) => g.subject_id === sub.id);
                return (
                  <div key={sub.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{sub.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">Code: {sub.code}</div>
                    </div>
                    {grade && (
                      <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 font-bold">
                        {grade.rubric_level} ({grade.points} pts)
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Timetable Snippet */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700" />
              Scheduled Class Timetable
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {timetable.slice(0, 3).map((slot) => {
                const sub = subjects.find((s) => s.id === slot.subject_id);
                return (
                  <div key={slot.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                    <div className="font-bold text-slate-900">{sub?.name || 'Period'}</div>
                    <div className="text-slate-500 text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {slot.start_time} - {slot.end_time}
                    </div>
                    <div className="text-emerald-800 font-semibold text-[11px]">{slot.room}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Library & Gate Passes */}
        <div className="lg:col-span-4 space-y-6 text-xs">
          {/* Library Borrowings */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-700" />
              Borrowed Library Books
            </h3>
            <div className="space-y-2">
              {bookLoans.length === 0 ? (
                <div className="text-slate-400 text-center py-4">No borrowed books</div>
              ) : (
                bookLoans.map((l) => {
                  const bk = books.find((b) => b.id === l.book_id);
                  return (
                    <div key={l.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                      <div className="font-bold text-slate-900">{bk?.title}</div>
                      <div className="text-slate-500 mt-1 flex justify-between text-[11px]">
                        <span>Due: {l.due_date}</span>
                        <span className="font-bold uppercase text-emerald-700">{l.status}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Gate Pass Status */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
              <DoorOpen className="w-4 h-4 text-purple-700" />
              Gate Passes
            </h3>
            <div className="space-y-2">
              {gatePasses.length === 0 ? (
                <div className="text-slate-400 text-center py-4">No recent passes issued</div>
              ) : (
                gatePasses.map((gp) => (
                  <div key={gp.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="font-bold text-slate-900">{gp.reason}</div>
                    <div className="text-slate-500 mt-1 text-[11px] flex justify-between">
                      <span>Out: {gp.out_time}</span>
                      <span className="font-bold uppercase text-purple-700">{gp.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
