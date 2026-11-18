import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useViewMode } from '../../context/ViewModeContext';
import { dbService } from '../../services/storage';
import { SyncService } from '../../services/syncService';
import { PdfGeneratorService } from '../../services/pdfGenerator';
import { markToRubric, CBC_RUBRIC_DEFINITIONS } from '../../services/cbcRubric';
import { ReportCardTrendsPanel } from './ReportCardTrendsPanel';
import {
  Award,
  Download,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  FileText,
  Lock,
  Globe,
  Printer,
  X,
  ChevronRight,
  BookOpen,
  TrendingUp,
} from 'lucide-react';
import { Student, SchoolClass, Exam, Grade, Subject, ReportCard } from '../../types';

interface ReportCardModuleProps {
  onNavigateToNotifications?: (examId: string) => void;
}

export const ReportCardModule: React.FC<ReportCardModuleProps> = ({ onNavigateToNotifications }) => {
  const { currentSchool } = useAuth();
  const { effectiveIsMobile } = useViewMode();
  if (!currentSchool) return null;
  const schoolId = currentSchool.id;

  const exams = dbService.getExams(schoolId);
  const classes = dbService.getClasses(schoolId);
  const levels = dbService.getLevels(schoolId);

  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || '');
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    const classWithStudents = classes.find(
      (c) => dbService.getStudents(schoolId, { classId: c.id }).length > 0
    );
    return classWithStudents?.id || classes[0]?.id || '';
  });

  const [classTeacherRemark, setClassTeacherRemark] = useState(
    'Demonstrates consistent diligence, collaborative spirit, and exemplary competency mastery.'
  );
  const [principalRemark, setPrincipalRemark] = useState(
    'Commendable performance across all CBC learning areas. Ready to advance to the next curriculum competencies.'
  );

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [printStudent, setPrintStudent] = useState<Student | null>(null);
  const [isPrintingAll, setIsPrintingAll] = useState<boolean>(false);
  const [trendStudentId, setTrendStudentId] = useState<string>('');
  const trendsSectionRef = useRef<HTMLDivElement | null>(null);

  const selectedExam = exams.find((e) => e.id === selectedExamId);
  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const students = dbService.getStudents(schoolId, { classId: selectedClassId });
  const existingReportCards = dbService.getReportCards(schoolId, selectedExamId);

  useEffect(() => {
    if (students.length === 0) {
      if (trendStudentId !== '') setTrendStudentId('');
      return;
    }
    const stillExists = students.some((s) => s.id === trendStudentId);
    if (!stillExists) {
      setTrendStudentId(students[0].id);
    }
  }, [selectedClassId, students, trendStudentId]);

  const handleFocusStudentTrend = (studentId: string) => {
    setTrendStudentId(studentId);
    trendsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  // Completeness check
  const completenessData = students.map((std) => {
    const studentGrades = dbService.getStudentGrades(schoolId, std.id, selectedExamId);
    const lvlSubjects = dbService.getSubjects(schoolId, std.level_id);
    const assessedCount = studentGrades.length;
    const isComplete = assessedCount >= lvlSubjects.length && lvlSubjects.length > 0;
    const rc = existingReportCards.find((r) => r.student_id === std.id);

    return {
      student: std,
      assessedCount,
      totalSubjects: lvlSubjects.length,
      isComplete,
      reportCard: rc,
      grades: studentGrades,
      subjects: lvlSubjects,
    };
  });

  const allComplete = completenessData.every((c) => c.isComplete);
  const publishedCount = completenessData.filter((c) => c.reportCard?.published).length;

  // Generate Single Report Card PDF
  const handleDownloadSinglePdf = (student: Student) => {
    const stdClass = classes.find((c) => c.id === student.class_id) || classes[0];
    const stdGrades = dbService.getStudentGrades(schoolId, student.id, selectedExamId);
    const stdSubjects = dbService.getSubjects(schoolId, student.level_id);
    const rc = existingReportCards.find((r) => r.student_id === student.id);

    const doc = PdfGeneratorService.generateReportCardPdf(
      currentSchool,
      student,
      stdClass,
      selectedExam || exams[0],
      stdGrades,
      stdSubjects,
      rc?.class_teacher_remark || classTeacherRemark,
      rc?.principal_remark || principalRemark
    );

    doc.save(`${student.admission_number.replace(/\//g, '_')}_CBC_ReportCard.pdf`);
  };

  // Direct Browser Print for a single student
  const handlePrintSingle = (student: Student) => {
    setPrintStudent(student);
    setIsPrintingAll(false);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Direct Browser Print for entire class
  const handlePrintAll = () => {
    setPrintStudent(null);
    setIsPrintingAll(true);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Generate All & Save DB records
  const handleGenerateAll = () => {
    students.forEach((std) => {
      dbService.upsertReportCard(schoolId, {
        student_id: std.id,
        exam_id: selectedExamId,
        published: false,
        class_teacher_remark: classTeacherRemark,
        principal_remark: principalRemark,
      });
    });

    void SyncService.cacheReportCards(
      schoolId,
      dbService.getReportCards(schoolId, selectedExamId)
    );

    setStatusMsg({
      type: 'success',
      text: `Generated official CBC Report Cards for all ${students.length} learners.`,
    });
  };

  // Publish All
  const handlePublishAll = () => {
    const count = dbService.publishReportCards(schoolId, selectedExamId, selectedClassId);
    void SyncService.cacheReportCards(
      schoolId,
      dbService.getReportCards(schoolId, selectedExamId)
    );
    setStatusMsg({
      type: 'success',
      text: `Published ${count} CBC Report Cards to Parent Portals. Parents can now download official PDF report cards.`,
    });
  };

  // Printable Single Student Report Card Component
  const renderSinglePrintableCard = (student: Student) => {
    const stdClass = classes.find((c) => c.id === student.class_id) || selectedClass;
    const stdGrades = dbService.getStudentGrades(schoolId, student.id, selectedExamId);
    const stdSubjects = dbService.getSubjects(schoolId, student.level_id);
    const rc = existingReportCards.find((r) => r.student_id === student.id);

    let totalPoints = 0;
    let scoredCount = 0;

    return (
      <div key={student.id} className="printable-document bg-white p-6 md:p-8 max-w-4xl mx-auto page-break-after border border-slate-300 rounded-xl my-4 text-slate-900">
        {/* Official Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-4 text-center">
          <div className="flex items-center justify-between gap-4 mb-2">
            {currentSchool.logo_url ? (
              <img src={currentSchool.logo_url} alt="Logo" className="w-16 h-16 object-contain rounded-lg border border-slate-200" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-emerald-800 text-white font-black flex items-center justify-center text-xl">
                {currentSchool.name.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-950">
                {currentSchool.name}
              </h1>
              <div className="text-xs text-slate-600 font-medium">
                {currentSchool.address} &bull; Phone: {currentSchool.phone} &bull; Email: {currentSchool.email}
              </div>
              <div className="text-xs font-bold text-emerald-800 uppercase tracking-widest mt-1">
                Republic of Kenya &bull; Ministry of Education CBC Assessment Report
              </div>
            </div>
            <div className="w-16 h-16 hidden sm:block" />
          </div>

          <div className="inline-block px-4 py-1 bg-slate-900 text-white text-xs font-bold uppercase rounded-md tracking-wider">
            {selectedExam?.name || 'Summative Assessment'} ({selectedExam?.term || 'Term 1'} {selectedExam?.year || 2026})
          </div>
        </div>

        {/* Learner Particulars Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs mb-4">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Learner Name</span>
            <span className="font-bold text-slate-900 text-sm">{student.full_name}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Admission Number</span>
            <span className="font-mono font-bold text-slate-900">{student.admission_number}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">Class & Stream</span>
            <span className="font-bold text-slate-900">{stdClass?.name} {stdClass?.stream}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold">UPI / Assessment No</span>
            <span className="font-mono font-bold text-slate-900">{student.upi || 'PENDING-NEMIS'}</span>
          </div>
        </div>

        {/* CBC 8-Level Rubric Table */}
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-left text-xs border border-slate-300">
            <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
              <tr>
                <th className="p-2 border-r border-slate-300">#</th>
                <th className="p-2 border-r border-slate-300">Learning Area (Subject)</th>
                <th className="p-2 border-r border-slate-300 text-center">Raw Mark</th>
                <th className="p-2 border-r border-slate-300 text-center">CBC Rubric</th>
                <th className="p-2 border-r border-slate-300 text-center">Points</th>
                <th className="p-2">Teacher Competency Comment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {stdSubjects.map((sub, idx) => {
                const g = stdGrades.find((grade) => grade.subject_id === sub.id);
                if (g && g.points) {
                  totalPoints += g.points;
                  scoredCount++;
                }

                return (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="p-2 border-r border-slate-200 font-mono text-center text-slate-500">{idx + 1}</td>
                    <td className="p-2 border-r border-slate-200 font-bold text-slate-900">{sub.name}</td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-800">
                      {g?.marks !== undefined && g?.marks !== null ? `${g.marks}%` : '—'}
                    </td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold">
                      <span className="rubric-badge-print px-1.5 py-0.5 rounded text-[11px]">
                        {g?.rubric_level || '—'}
                      </span>
                    </td>
                    <td className="p-2 border-r border-slate-200 text-center font-bold text-slate-900">
                      {g?.points || '—'}
                    </td>
                    <td className="p-2 text-slate-700 text-[11px]">
                      {g?.teacher_comment || 'Satisfactory achievement of learning competencies.'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 8-Level CBC Rubric Reference Scale */}
        <div className="bg-slate-50 p-2.5 rounded border border-slate-200 mb-4 text-[10px]">
          <div className="font-bold text-slate-700 uppercase mb-1">Official CBC 8-Level Rubric Key:</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-slate-600">
            <div><strong className="text-emerald-800">EE1 (8 pts):</strong> 90–100% Exceeding</div>
            <div><strong className="text-emerald-700">EE2 (7 pts):</strong> 75–89% Exceeding</div>
            <div><strong className="text-blue-800">ME1 (6 pts):</strong> 58–74% Meeting</div>
            <div><strong className="text-blue-700">ME2 (5 pts):</strong> 41–57% Meeting</div>
            <div><strong className="text-amber-800">AE1 (4 pts):</strong> 31–40% Approaching</div>
            <div><strong className="text-amber-700">AE2 (3 pts):</strong> 21–30% Approaching</div>
            <div><strong className="text-rose-800">BE1 (2 pts):</strong> 11–20% Below</div>
            <div><strong className="text-rose-700">BE2 (1 pt):</strong> 1–10% Below</div>
          </div>
        </div>

        {/* Remarks & Signatures */}
        <div className="space-y-3 pt-2">
          <div className="border border-slate-200 p-2.5 rounded bg-slate-50/50 text-xs">
            <span className="font-bold text-slate-800 uppercase block mb-0.5">Class Teacher Remarks:</span>
            <p className="text-slate-700 italic">{rc?.class_teacher_remark || classTeacherRemark}</p>
          </div>

          <div className="border border-slate-200 p-2.5 rounded bg-slate-50/50 text-xs">
            <span className="font-bold text-slate-800 uppercase block mb-0.5">Head of School / Principal Remarks:</span>
            <p className="text-slate-700 italic">{rc?.principal_remark || principalRemark}</p>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-6 text-center text-xs">
            <div className="border-t border-slate-400 pt-1">
              <span className="block font-bold">Class Teacher Signature</span>
              <span className="text-[10px] text-slate-500">Date: ____________</span>
            </div>
            <div className="border-t border-slate-400 pt-1">
              <span className="block font-bold">Principal / Official Stamp</span>
              <span className="text-[10px] text-slate-500">Date: ____________</span>
            </div>
            <div className="border-t border-slate-400 pt-1">
              <span className="block font-bold">Parent / Guardian Signature</span>
              <span className="text-[10px] text-slate-500">Date: ____________</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header (Hidden on Print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Award className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              CBC Summative Report Cards
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Official Kenyan Ministry of Education CBC Format: Individual rubric assessment without student ranking
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrintAll}
            className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Print clean physical report cards for all students in class"
          >
            <Printer className="w-4 h-4" />
            <span>Print All Cards</span>
          </button>

          <button
            onClick={handleGenerateAll}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Save All in Class</span>
          </button>

          <button
            onClick={handlePublishAll}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Globe className="w-4 h-4" />
            <span>Publish to Portal</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`no-print p-3 rounded-xl border text-xs flex items-center justify-between ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{statusMsg.text}</span>
          </div>

          {onNavigateToNotifications && (
            <button
              onClick={() => onNavigateToNotifications(selectedExamId)}
              className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              Dispatch Parent SMS Broadcast &rarr;
            </button>
          )}
        </div>
      )}

      {/* Selectors (Hidden on Print) */}
      <div className="no-print bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="block font-bold text-slate-700 mb-1">Assessment Examination</label>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
          >
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name} ({ex.term} {ex.year})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Class Stream</label>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} - {c.stream}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Remarks Configuration (Hidden on Print) */}
      <div className="no-print bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="block font-bold text-slate-700 mb-1">Class Teacher General Remark</label>
          <input
            type="text"
            value={classTeacherRemark}
            onChange={(e) => setClassTeacherRemark(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
          />
        </div>
        <div>
          <label className="block font-bold text-slate-700 mb-1">Head of School / Principal Remark</label>
          <input
            type="text"
            value={principalRemark}
            onChange={(e) => setPrincipalRemark(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
          />
        </div>
      </div>

      {/* Completeness Summary Banner (Hidden on Print) */}
      <div className="no-print p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {allComplete ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          )}
          <span>
            Assessment Completeness: <strong>{completenessData.filter((c) => c.isComplete).length} of {students.length}</strong> learners assessed.
          </span>
        </div>
        <div className="font-bold text-emerald-800 text-xs">
          Published to Portal: {publishedCount} / {students.length}
        </div>
      </div>

      {/* Multi-Term Performance Trends (Recharts, Hidden on Print) */}
      <div ref={trendsSectionRef}>
        <ReportCardTrendsPanel
          schoolId={schoolId}
          selectedClass={selectedClass}
          selectedExamId={selectedExamId}
          exams={exams}
          students={students}
          selectedStudentId={trendStudentId}
          onSelectStudentId={setTrendStudentId}
        />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. MOBILE RESPONSIVE CARD VIEW (Rendered on phones / mobile)  */}
      {/* ------------------------------------------------------------- */}
      <div className="no-print block md:hidden space-y-3">
        {completenessData.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-500 text-xs">
            No learners found for this class.
          </div>
        ) : (
          completenessData.map((row) => (
            <div
              key={row.student.id}
              className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-2.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-bold text-slate-900 text-sm">{row.student.full_name}</div>
                  <div className="text-[11px] font-mono text-emerald-800 font-semibold">
                    {row.student.admission_number}
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    row.isComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {row.isComplete ? 'Complete' : 'Partial'}
                </span>
              </div>

              {/* Progress Bar of Assessed Subjects */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                  <span>Assessed Learning Areas</span>
                  <span className="font-bold text-slate-800">
                    {row.assessedCount} / {row.totalSubjects}
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      row.isComplete ? 'bg-emerald-600' : 'bg-amber-500'
                    }`}
                    style={{
                      width: `${
                        row.totalSubjects > 0
                          ? Math.min(100, Math.round((row.assessedCount / row.totalSubjects) * 100))
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                <button
                  onClick={() => handleFocusStudentTrend(row.student.id)}
                  className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 border transition ${
                    trendStudentId === row.student.id
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Trend</span>
                </button>

                <button
                  onClick={() => handleDownloadSinglePdf(row.student)}
                  className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-700" />
                  <span>PDF</span>
                </button>

                <button
                  onClick={() => handlePrintSingle(row.student)}
                  className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Card</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. DESKTOP / WINDOWS VIEW TABLE (Hidden on mobile phones)     */}
      {/* ------------------------------------------------------------- */}
      <div className="no-print hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
            <tr>
              <th className="py-3 px-4">Adm No</th>
              <th className="py-3 px-4">Learner Name</th>
              <th className="py-3 px-4">Assessed Subjects</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Portal Visibility</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {completenessData.map((row) => (
              <tr key={row.student.id} className="hover:bg-slate-50">
                <td className="py-3 px-4 font-mono font-bold text-slate-900">
                  {row.student.admission_number}
                </td>
                <td className="py-3 px-4 font-bold text-slate-900">
                  {row.student.full_name}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`font-semibold ${
                      row.isComplete ? 'text-emerald-700' : 'text-amber-600'
                    }`}
                  >
                    {row.assessedCount} / {row.totalSubjects} learning areas
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      row.isComplete ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {row.isComplete ? 'Complete' : 'Partial'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      row.reportCard?.published ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {row.reportCard?.published ? 'Published to Parent' : 'Draft Only'}
                  </span>
                </td>
                <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                  <button
                    onClick={() => handleFocusStudentTrend(row.student.id)}
                    className={`px-2.5 py-1 rounded font-bold transition inline-flex items-center gap-1 shadow-xs cursor-pointer border ${
                      trendStudentId === row.student.id
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-900'
                        : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-700" />
                    Trend
                  </button>
                  <button
                    onClick={() => handleDownloadSinglePdf(row.student)}
                    className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded font-bold transition inline-flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-700" />
                    PDF
                  </button>
                  <button
                    onClick={() => handlePrintSingle(row.student)}
                    className="px-2.5 py-1 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 text-emerald-800 rounded font-bold transition inline-flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. PRINTABLE REPORT CARDS CONTAINER (Active during print)     */}
      {/* ------------------------------------------------------------- */}
      <div className="printable-container">
        {printStudent && renderSinglePrintableCard(printStudent)}
        {isPrintingAll && students.map((std) => renderSinglePrintableCard(std))}
      </div>
    </div>
  );
};
