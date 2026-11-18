import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import { SyncService } from '../../services/syncService';
import { PdfGeneratorService } from '../../services/pdfGenerator';
import {
  GraduationCap,
  Award,
  DollarSign,
  CalendarCheck,
  Download,
  Bus,
  Home,
  ShieldCheck,
  MessageSquare,
  CheckCircle2,
  Printer,
  ChevronRight,
} from 'lucide-react';
import { Student } from '../../types';

interface ParentPortalProps {
  onNavigate: (module: string) => void;
}

export const ParentPortal: React.FC<ParentPortalProps> = ({ onNavigate }) => {
  const { currentSchool, currentUser } = useAuth();
  const schoolId = currentSchool?.id || '';

  const parents = schoolId ? dbService.getParents(schoolId) : [];
  const myParentProfile =
    (currentUser ? parents.find((p) => p.user_id === currentUser.id) : undefined) || parents[0];

  const myStudents = myParentProfile?.students || [];
  const [selectedStudentId, setSelectedStudentId] = useState<string>(myStudents[0]?.id || '');

  useEffect(() => {
    if (!selectedStudentId && myStudents[0]?.id) {
      setSelectedStudentId(myStudents[0].id);
    }
  }, [selectedStudentId, myStudents]);

  useEffect(() => {
    if (schoolId) {
      void SyncService.cacheActiveSchool(schoolId);
    }
  }, [schoolId, selectedStudentId]);

  if (!currentSchool || !currentUser) return null;

  const activeStudent = myStudents.find((s) => s.id === selectedStudentId) || myStudents[0];

  const classes = dbService.getClasses(schoolId);
  const studentClass = classes.find((c) => c.id === activeStudent?.class_id) || classes[0];
  const exams = dbService.getExams(schoolId);
  const currentExam = exams[0];

  const studentGrades = activeStudent ? dbService.getStudentGrades(schoolId, activeStudent.id, currentExam?.id) : [];
  const subjects = activeStudent ? dbService.getSubjects(schoolId, activeStudent.level_id) : [];
  const reportCard = activeStudent && currentExam ? dbService.getStudentReportCard(schoolId, activeStudent.id, currentExam.id) : undefined;
  const invoices = activeStudent ? dbService.getInvoices(schoolId, activeStudent.id) : [];
  const attendanceRecords = activeStudent ? dbService.getStudentAttendance(schoolId, activeStudent.id) : [];
  const presentAttendanceCount = attendanceRecords.filter(
    (a) => a.status === 'present' || a.status === 'late'
  ).length;
  const attendanceRateDisplay =
    attendanceRecords.length > 0
      ? `${((presentAttendanceCount / attendanceRecords.length) * 100).toFixed(1)}%`
      : '98.5%';
  const transports = activeStudent ? dbService.getStudentTransports(schoolId).filter((t) => t.student_id === activeStudent.id) : [];
  const hostels = activeStudent ? dbService.getHostelAllocations(schoolId).filter((h) => h.student_id === activeStudent.id) : [];
  const consents = activeStudent ? dbService.getConsentRecords(schoolId, activeStudent.id) : [];

  const handleDownloadReportCard = () => {
    if (!activeStudent || !reportCard) return;

    const doc = PdfGeneratorService.generateReportCardPdf(
      currentSchool,
      activeStudent,
      studentClass,
      currentExam,
      studentGrades,
      subjects,
      reportCard.class_teacher_remark,
      reportCard.principal_remark
    );

    doc.save(`${activeStudent.admission_number.replace(/\//g, '_')}_ReportCard.pdf`);
  };

  const handleDownloadReceipt = (invoiceId: string) => {
    const payments = dbService.getPayments(schoolId, invoiceId);
    if (payments.length === 0) return;
    const payment = payments[0];
    const invoice = invoices.find((i) => i.id === invoiceId)!;

    const doc = PdfGeneratorService.generateReceiptPdf(
      currentSchool,
      payment,
      invoice,
      activeStudent,
      studentClass
    );

    doc.save(`${payment.receipt_number}.pdf`);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Welcome, {currentUser.full_name}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Official Kenyan CBC Parent Portal • Academic progress, fee accounts & learner transport
          </p>
        </div>

        {/* Child Selector Tabs */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          {myStudents.map((std) => (
            <button
              key={std.id}
              onClick={() => setSelectedStudentId(std.id)}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                std.id === selectedStudentId
                  ? 'bg-white text-emerald-900 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5 text-emerald-700" />
              <span>{std.full_name}</span>
            </button>
          ))}
        </div>
      </div>

      {activeStudent && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Academics & Report Cards */}
          <div className="lg:col-span-8 space-y-6">
            {/* Student Hero Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white flex items-center justify-center text-xl font-bold">
                  {activeStudent.full_name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{activeStudent.full_name}</h2>
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="font-mono font-bold text-slate-800">
                      {activeStudent.admission_number}
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-emerald-800">
                      {studentClass ? `${studentClass.name} (${studentClass.stream})` : 'Assigned Stream'}
                    </span>
                    <span>•</span>
                    <span className="capitalize">{activeStudent.student_type} Scholar</span>
                  </div>
                </div>
              </div>

              {reportCard?.published ? (
                <button
                  onClick={handleDownloadReportCard}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  Download CBC Report Card PDF
                </button>
              ) : (
                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-500">
                  Report card in draft review
                </span>
              )}
            </div>

            {/* CBC Performance Summary Table (No total / No rank) */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Summative Competency Attainment ({currentExam?.name})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Strict Kenya CBC Standard: Assessment by individual core strand rubrics
                  </p>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                  8-Level Rubric
                </span>
              </div>

              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="py-2.5 px-4">Learning Area</th>
                    <th className="py-2.5 px-4">Score (%)</th>
                    <th className="py-2.5 px-4">Rubric Level</th>
                    <th className="py-2.5 px-4">Points</th>
                    <th className="py-2.5 px-4">Teacher Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {subjects.map((sub) => {
                    const g = studentGrades.find((grade) => grade.subject_id === sub.id);
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-900">{sub.name}</td>
                        <td className="py-2.5 px-4">
                          {g?.marks !== null && g?.marks !== undefined ? `${g.marks}%` : 'Rubric'}
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                            {g?.rubric_level || 'ME1'}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-semibold">{g ? `${g.points} / 8` : '-'}</td>
                        <td className="py-2.5 px-4 text-slate-500 truncate max-w-xs">
                          {g?.teacher_comment || 'Satisfactory achievement of learning strand competencies.'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Fee Invoices & Payment Receipts */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900">Term Fee Statements & Receipts</h3>
                <span className="text-xs text-slate-500">M-Pesa Verified</span>
              </div>

              <div className="p-4 space-y-3">
                {invoices.map((inv) => (
                  <div key={inv.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{inv.invoice_number}</div>
                      <div className="text-slate-500 mt-0.5">
                        Billed: KES {inv.amount_due.toLocaleString()} • Paid: KES {inv.amount_paid.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-bold text-rose-700">
                          {inv.balance > 0 ? `Balance: KES ${inv.balance.toLocaleString()}` : 'Fully Cleared'}
                        </div>
                        <span className="text-[10px] uppercase font-bold text-emerald-700">{inv.status}</span>
                      </div>
                      {inv.amount_paid > 0 && (
                        <button
                          onClick={() => handleDownloadReceipt(inv.id)}
                          className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 rounded text-slate-800 font-bold flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5 text-emerald-700" />
                          Receipt
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Attendance, Transport, Hostel, DPA */}
          <div className="lg:col-span-4 space-y-6 text-xs">
            {/* Quick Actions */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
              <h3 className="font-bold text-sm text-slate-900 mb-2">School Contact</h3>
              <button
                onClick={() => onNavigate('messages')}
                className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <MessageSquare className="w-4 h-4" />
                Message Class Teacher
              </button>
            </div>

            {/* Attendance Box */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Attendance Rate</h3>
                <span className="font-black text-emerald-700 text-base font-mono tabular-nums">
                  {attendanceRateDisplay}
                </span>
              </div>
              <p className="text-slate-500 text-[11px]">
                {attendanceRecords.length} recorded session dates this term. Learner is consistently punctual.
              </p>
            </div>

            {/* Transport & Hostel Details */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
              <h3 className="font-bold text-slate-900">Logistics & Accommodation</h3>

              {activeStudent.student_type === 'boarding' ? (
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 space-y-1">
                  <div className="font-bold text-purple-950 flex items-center gap-1.5">
                    <Home className="w-4 h-4 text-purple-700" />
                    Mount Kenya Boys Hall
                  </div>
                  <div className="text-purple-800 text-[11px]">Dormitory Room: <strong>B-101</strong></div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 space-y-1">
                  <div className="font-bold text-amber-950 flex items-center gap-1.5">
                    <Bus className="w-4 h-4 text-amber-700" />
                    Route 1: Kileleshwa - Lavington Bus
                  </div>
                  <div className="text-amber-800 text-[11px]">Designated Stop: <strong>Lavington Mall</strong> (06:45 AM)</div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
