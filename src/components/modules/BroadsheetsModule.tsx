import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useViewMode } from '../../context/ViewModeContext';
import { dbService } from '../../services/storage';
import { markToRubric, CBC_RUBRIC_DEFINITIONS } from '../../services/cbcRubric';
import { Student, Grade, RubricLevel } from '../../types';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Info,
  BookOpen,
  Sparkles,
  List,
  Table as TableIcon,
  CheckCircle2,
  Users,
  ChevronLeft,
  ChevronRight,
  Save,
  Edit3,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const BroadsheetsModule: React.FC = () => {
  const { currentSchool, currentUser } = useAuth();
  const { effectiveIsMobile } = useViewMode();
  if (!currentSchool) return null;

  const schoolId = currentSchool.id;
  const classes = dbService.getClasses(schoolId);
  const exams = dbService.getExams(schoolId);
  const subjects = dbService.getSubjects(schoolId);

  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    const classWithStudents = classes.find(
      (c) => dbService.getStudents(schoolId, { classId: c.id }).length > 0
    );
    return classWithStudents?.id || classes[0]?.id || '';
  });
  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [mobileViewFormat, setMobileViewFormat] = useState<'cards' | 'table'>('cards');

  const currentClass = classes.find((c) => c.id === selectedClassId);
  const currentExam = exams.find((e) => e.id === selectedExamId);
  
  // Ensure students are loaded, with sample enrollment fallback if class is empty
  const students: Student[] = React.useMemo(() => {
    if (!currentClass) return [];
    let list = dbService.getStudents(schoolId, { classId: currentClass.id });
    if (list.length === 0) {
      list = dbService.enrollSampleStudentsToClass(schoolId, currentClass.id, 6);
    }
    return list;
  }, [currentClass, schoolId]);

  // Filter subjects for this class's level
  const classSubjects = currentClass
    ? subjects.filter((s) => s.level_id === currentClass.level_id)
    : [];

  // Local state for editable raw marks: `${student_id}_${subject_id}` -> { marks, rubric, points }
  const [editableGrades, setEditableGrades] = useState<
    Record<string, { marks: number | null; rubric: string; points: number }>
  >({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Carousel ref and active card index for horizontal-scrolling card-based list on small screens
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeCardIndex, setActiveCardIndex] = useState<number>(0);

  // Initialize editable grades from storage whenever selection changes
  useEffect(() => {
    if (!selectedExamId || students.length === 0) return;
    const currentGrades = dbService.getGrades(schoolId, selectedExamId);
    const initialMap: Record<string, { marks: number | null; rubric: string; points: number }> = {};

    students.forEach((stud) => {
      classSubjects.forEach((sub) => {
        const key = `${stud.id}_${sub.id}`;
        const match = currentGrades.find(
          (g) => g.student_id === stud.id && g.subject_id === sub.id
        );
        if (match) {
          const m = match.marks !== undefined ? match.marks : null;
          const rub = match.rubric_level || (m !== null ? markToRubric(m).level : '');
          const pts = match.points || (m !== null ? markToRubric(m).points : 0);
          initialMap[key] = { marks: m, rubric: rub, points: pts };
        } else {
          initialMap[key] = { marks: null, rubric: '', points: 0 };
        }
      });
    });

    setEditableGrades(initialMap);
    setHasUnsavedChanges(false);
    setActiveCardIndex(0);
  }, [schoolId, selectedExamId, selectedClassId, students.length, classSubjects.length]);

  // Handle live mark input edit
  const handleMarkChange = (studentId: string, subjectId: string, val: string) => {
    const key = `${studentId}_${subjectId}`;
    if (val === '') {
      setEditableGrades((prev) => ({
        ...prev,
        [key]: { marks: null, rubric: '', points: 0 },
      }));
      setHasUnsavedChanges(true);
      return;
    }

    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    const clamped = Math.max(0, Math.min(100, num));
    const rubricData = markToRubric(clamped);

    setEditableGrades((prev) => ({
      ...prev,
      [key]: {
        marks: clamped,
        rubric: rubricData.level,
        points: rubricData.points,
      },
    }));
    setHasUnsavedChanges(true);
  };

  // Quick 1-tap preset button
  const handleApplyPreset = (studentId: string, subjectId: string, score: number) => {
    handleMarkChange(studentId, subjectId, String(score));
  };

  // Save all modified grades to persistent storage
  const handleSaveGrades = () => {
    if (!selectedExamId) return;
    setIsSaving(true);
    try {
      const gradesToSave: any[] = [];
      Object.entries(editableGrades).forEach(([key, val]) => {
        if (val.marks !== null && val.marks !== undefined) {
          const [studentId, subjectId] = key.split('_');
          const rub = (val.rubric as RubricLevel) || markToRubric(val.marks).level;
          const pts = val.points || markToRubric(val.marks).points;
          gradesToSave.push({
            exam_id: selectedExamId,
            student_id: studentId,
            subject_id: subjectId,
            marks: val.marks,
            rubric_level: rub,
            points: pts,
            teacher_comment: 'Assessed on CBC Academic Broadsheet',
            entered_by_teacher_id: currentUser?.id || 'admin',
          });
        }
      });

      if (gradesToSave.length > 0) {
        dbService.batchSaveGrades(schoolId, gradesToSave);
      }
      setHasUnsavedChanges(false);
      setSaveSuccessMsg(`Broadsheet marks saved for ${gradesToSave.length} assessments!`);
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(`Error saving marks: ${err?.message || 'Please check input values'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Carousel navigation helpers for horizontal scroll
  const scrollToCard = (index: number) => {
    if (!carouselRef.current) return;
    const targetIdx = Math.max(0, Math.min(index, filteredStudents.length - 1));
    setActiveCardIndex(targetIdx);
    const cardEl = carouselRef.current.children[targetIdx] as HTMLElement;
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  const handleCarouselScroll = () => {
    if (!carouselRef.current) return;
    const scrollLeft = carouselRef.current.scrollLeft;
    const firstCard = carouselRef.current.firstElementChild as HTMLElement;
    if (!firstCard) return;
    const cardWidth = firstCard.clientWidth + 14;
    const newIndex = Math.round(scrollLeft / cardWidth);
    setActiveCardIndex(Math.max(0, Math.min(newIndex, filteredStudents.length - 1)));
  };

  const filteredStudents = students.filter(
    (s: Student) =>
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.admission_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.upi && s.upi.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Subject statistics calculation (Distribution of EE1-BE2)
  const subjectStats = classSubjects.map((sub) => {
    const counts: Record<string, number> = {
      EE1: 0,
      EE2: 0,
      ME1: 0,
      ME2: 0,
      AE1: 0,
      AE2: 0,
      BE1: 0,
      BE2: 0,
    };
    let totalMarks = 0;
    let scoredCount = 0;

    students.forEach((stud: Student) => {
      const g = editableGrades[`${stud.id}_${sub.id}`];
      if (g && g.rubric) {
        counts[g.rubric] = (counts[g.rubric] || 0) + 1;
        if (g.marks !== null && g.marks !== undefined) {
          totalMarks += g.marks;
          scoredCount++;
        }
      }
    });

    const averageMark = scoredCount > 0 ? Math.round(totalMarks / scoredCount) : null;
    const avgRubric = averageMark !== null ? markToRubric(averageMark) : null;

    return {
      subject: sub,
      counts,
      averageMark,
      avgRubric,
      scoredCount,
    };
  });

  // Export to Excel handler
  const handleExportExcel = () => {
    if (!currentClass || !currentExam) return;

    const headers = [
      'Adm No',
      'UPI / NEMIS',
      'Learner Full Name',
      'Gender',
      ...classSubjects.flatMap((s) => [`${s.name} (Marks)`, `${s.name} (Rubric)`]),
      'Teacher Observations / Competency Summary',
    ];

    const rows = students.map((s: Student) => {
      const rowData: any[] = [
        s.admission_number,
        s.upi || 'N/A',
        s.full_name,
        s.gender,
      ];

      classSubjects.forEach((sub) => {
        const g = editableGrades[`${s.id}_${sub.id}`];
        rowData.push(g?.marks ?? '—');
        rowData.push(g?.rubric ?? '—');
      });

      rowData.push(
        'CBC Assessment strictly follows MOE guidelines: No total marks, No average %, No rank.'
      );
      return rowData;
    });

    const worksheet = XLSX.utils.aoa_to_sheet([
      [`${currentSchool.name.toUpperCase()} - CBC BROADSHEET`],
      [`Class: ${currentClass.name} ${currentClass.stream} | Exam: ${currentExam.name} (${currentExam.term} ${currentExam.year})`],
      ['Kenya Competency-Based Curriculum (CBC) Official Broadsheet Assessment Matrix'],
      [],
      headers,
      ...rows,
      [],
      ['SUBJECT RUBRIC PERFORMANCE SUMMARY'],
      ['Subject', 'EE1 (90-100)', 'EE2 (75-89)', 'ME1 (58-74)', 'ME2 (41-57)', 'AE1 (31-40)', 'AE2 (21-30)', 'BE1 (11-20)', 'BE2 (1-10)'],
      ...subjectStats.map((st) => [
        st.subject.name,
        st.counts['EE1'] || 0,
        st.counts['EE2'] || 0,
        st.counts['ME1'] || 0,
        st.counts['ME2'] || 0,
        st.counts['AE1'] || 0,
        st.counts['AE2'] || 0,
        st.counts['BE1'] || 0,
        st.counts['BE2'] || 0,
      ]),
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Broadsheet');
    XLSX.writeFile(
      workbook,
      `${currentSchool.slug}_broadsheet_${currentClass.name}_${currentExam.term}_${currentExam.year}.xlsx`
    );
  };

  const getRubricBadge = (rubric?: string) => {
    if (!rubric) return <span className="text-slate-300">—</span>;
    let bg = 'bg-slate-100 text-slate-700 border-slate-200';
    if (rubric.startsWith('EE')) {
      bg = 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
    } else if (rubric.startsWith('ME')) {
      bg = 'bg-blue-100 text-blue-800 border-blue-300 font-semibold';
    } else if (rubric.startsWith('AE')) {
      bg = 'bg-amber-100 text-amber-800 border-amber-300 font-semibold';
    } else if (rubric.startsWith('BE')) {
      bg = 'bg-rose-100 text-rose-800 border-rose-300 font-semibold';
    }

    return (
      <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] border ${bg}`}>
        {rubric}
      </span>
    );
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Official Print Header (Visible ONLY during Print) */}
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-3 mb-4">
        <h1 className="text-xl font-black uppercase tracking-wider text-slate-950">
          {currentSchool.name}
        </h1>
        <div className="text-xs text-slate-600 font-medium">
          {currentSchool.address} &bull; Phone: {currentSchool.phone} &bull; Email: {currentSchool.email}
        </div>
        <div className="text-xs font-bold text-emerald-900 uppercase tracking-widest mt-1">
          Republic of Kenya &bull; Ministry of Education Official CBC Broadsheet Matrix
        </div>
        <div className="inline-block mt-1 px-3 py-0.5 bg-slate-900 text-white text-[11px] font-bold rounded uppercase">
          Class: {currentClass?.name} {currentClass?.stream} &bull; Exam: {currentExam?.name} ({currentExam?.term} {currentExam?.year})
        </div>
      </div>

      {/* Top Banner & Title (Hidden on Print) */}
      <div className="no-print bg-gradient-to-r from-emerald-800 to-emerald-950 text-white rounded-2xl p-4 sm:p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/50 text-emerald-200 text-xs font-semibold mb-2 border border-emerald-600/50">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Kenya Ministry of Education CBC Regulation
            </div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight">
              CBC Academic Broadsheet
            </h1>
            <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Comprehensive multi-subject assessment broadsheet for {currentSchool.name}.
              Displays 8-level rubric ratings (EE1–BE2) across all learners without unfair student
              rankings or total marks aggregation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleSaveGrades}
              disabled={isSaving}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs transition shadow cursor-pointer min-h-[38px] ${
                hasUnsavedChanges
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-black ring-2 ring-amber-300 ring-offset-1 ring-offset-emerald-950 animate-pulse'
                  : 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Marks *' : 'Save Marks'}</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3.5 py-2 bg-white text-emerald-900 rounded-xl font-bold text-xs hover:bg-emerald-50 transition shadow cursor-pointer min-h-[38px]"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span>Export (.xlsx)</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl font-bold text-xs transition cursor-pointer min-h-[38px]"
            >
              <Printer className="w-4 h-4" />
              <span>Print Broadsheet</span>
            </button>
          </div>
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccessMsg && (
        <div className="no-print p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Filters Bar (Hidden on Print) */}
      <div className="no-print bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Class Select */}
          <div className="w-full sm:w-auto">
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase mb-1">
              Select Class / Grade
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 min-h-[36px]"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.stream}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Select */}
          <div className="w-full sm:w-auto">
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase mb-1">
              Assessment / Exam
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 min-h-[36px]"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} ({ex.term} {ex.year})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Small Screen Layout Switcher & Search */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
          <div className="md:hidden flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setMobileViewFormat('cards')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 font-bold transition min-h-[32px] ${
                mobileViewFormat === 'cards'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              <span>Horizontal Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileViewFormat('table')}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 font-bold transition min-h-[32px] ${
                mobileViewFormat === 'table'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              <span>Full Sheet</span>
            </button>
          </div>

          {/* Search */}
          <div className="w-full sm:w-56">
            <input
              type="text"
              placeholder="Search name or Adm No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 min-h-[36px]"
            />
          </div>
        </div>
      </div>

      {/* 1. Mobile Phone Horizontal-Scrolling Card-Based List (Optimized for Small Screens) */}
      <div className={`no-print ${mobileViewFormat === 'cards' ? 'block md:hidden' : 'hidden'} space-y-3`}>
        {/* Carousel Stepper Header */}
        <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
          <button
            type="button"
            onClick={() => scrollToCard(activeCardIndex - 1)}
            disabled={activeCardIndex === 0}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition min-h-[38px] min-w-[38px] flex items-center justify-center"
            title="Previous Learner"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <span className="text-xs font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-full">
              Learner {activeCardIndex + 1} of {filteredStudents.length}
            </span>
            <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
              Swipe ↔ or use arrows
            </div>
          </div>

          <button
            type="button"
            onClick={() => scrollToCard(activeCardIndex + 1)}
            disabled={activeCardIndex >= filteredStudents.length - 1}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 disabled:opacity-30 disabled:pointer-events-none transition min-h-[38px] min-w-[38px] flex items-center justify-center"
            title="Next Learner"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Horizontal Scrolling Card Track */}
        {filteredStudents.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
            No learners found for this class and filter.
          </div>
        ) : (
          <div
            ref={carouselRef}
            onScroll={handleCarouselScroll}
            className="flex overflow-x-auto snap-x snap-mandatory gap-3.5 pb-4 px-1 scrollbar-thin scroll-smooth -mx-1"
          >
            {filteredStudents.map((stud: Student, idx: number) => {
              let ee = 0, me = 0, ae = 0, be = 0;
              classSubjects.forEach((sub) => {
                const g = editableGrades[`${stud.id}_${sub.id}`];
                if (g?.rubric?.startsWith('EE')) ee++;
                else if (g?.rubric?.startsWith('ME')) me++;
                else if (g?.rubric?.startsWith('AE')) ae++;
                else if (g?.rubric?.startsWith('BE')) be++;
              });

              const scoredCount = classSubjects.filter(
                (sub) => editableGrades[`${stud.id}_${sub.id}`]?.marks !== null
              ).length;

              return (
                <div
                  key={stud.id}
                  className="w-[88vw] max-w-[350px] shrink-0 snap-center bg-white rounded-2xl border-2 border-slate-200 shadow-md hover:border-emerald-500 transition-all p-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Top: Learner Info */}
                    <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black flex items-center justify-center text-xs shadow-xs shrink-0">
                          {stud.full_name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 text-sm truncate">
                            {stud.full_name}
                          </div>
                          <div className="font-mono text-xs font-semibold text-emerald-800">
                            {stud.admission_number} • <span className="capitalize">{stud.gender}</span>
                          </div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 shrink-0">
                        #{idx + 1}
                      </span>
                    </div>

                    {/* Competency live summary tally */}
                    <div className="flex items-center justify-between text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <span className="text-slate-500 font-semibold">CBC Rubrics:</span>
                      <div className="flex items-center gap-1 text-[10px]">
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">{ee} EE</span>
                        <span className="bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">{me} ME</span>
                        <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">{ae} AE</span>
                        <span className="bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded">{be} BE</span>
                      </div>
                    </div>

                    {/* Editable Raw Marks List */}
                    <div className="space-y-2 pt-1 max-h-[50vh] overflow-y-auto pr-1">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                        <span>Editable Learning Areas:</span>
                        <span className="text-slate-400 font-mono text-[9px]">{scoredCount}/{classSubjects.length} Scored</span>
                      </div>
                      {classSubjects.map((sub) => {
                        const key = `${stud.id}_${sub.id}`;
                        const g = editableGrades[key];
                        const marksVal = g?.marks !== null && g?.marks !== undefined ? g.marks : '';
                        const currentRubric = g?.rubric;

                        return (
                          <div
                            key={sub.id}
                            className="p-2.5 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 transition"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-800 truncate" title={sub.name}>
                                  {sub.name}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {sub.code || 'CORE'}
                                </div>
                              </div>
                              <div className="shrink-0">
                                {getRubricBadge(currentRubric)}
                              </div>
                            </div>

                            {/* Raw Mark Input with Touch Friendly Sizing & Quick Pills */}
                            <div className="flex items-center justify-between gap-2 pt-1">
                              <div className="flex items-center gap-1.5">
                                <label className="text-[10px] font-bold text-slate-500">Score:</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  placeholder="0–100"
                                  value={marksVal}
                                  onChange={(e) => handleMarkChange(stud.id, sub.id, e.target.value)}
                                  className="w-16 min-h-[42px] px-2 py-1 text-center font-black text-slate-900 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                                />
                                <span className="text-xs text-slate-400 font-semibold">%</span>
                              </div>

                              {/* 1-tap quick rubric pills for speed */}
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleApplyPreset(stud.id, sub.id, 80)}
                                  className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold rounded-md transition"
                                  title="Quick set 80 (EE2)"
                                >
                                  80
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApplyPreset(stud.id, sub.id, 65)}
                                  className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-[10px] font-bold rounded-md transition"
                                  title="Quick set 65 (ME1)"
                                >
                                  65
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApplyPreset(stud.id, sub.id, 50)}
                                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded-md transition"
                                  title="Quick set 50 (ME2)"
                                >
                                  50
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3 border-t border-slate-100 mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>{scoredCount} / {classSubjects.length} Completed</span>
                    {idx < filteredStudents.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => scrollToCard(idx + 1)}
                        className="text-emerald-700 font-bold hover:underline flex items-center gap-0.5"
                      >
                        Next Learner →
                      </button>
                    ) : (
                      <span className="text-emerald-700 font-bold">End of Class</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Mobile Sticky Save Bar */}
        <div className="fixed bottom-16 md:bottom-4 left-0 right-0 z-30 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-xl flex items-center justify-between gap-3 max-w-lg mx-auto sm:rounded-2xl sm:border sm:bottom-4 no-print">
          <div className="text-xs">
            <span className="font-bold text-slate-900">
              {hasUnsavedChanges ? '⚠️ Unsaved edits' : '✅ All marks saved'}
            </span>
            <div className="text-[10px] text-slate-500">
              {filteredStudents.length} learners enrolled
            </div>
          </div>
          <button
            type="button"
            onClick={handleSaveGrades}
            disabled={isSaving}
            className="min-h-[44px] px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Broadsheet Marks'}</span>
          </button>
        </div>
      </div>

      {/* 2. Desktop & Full Sheet Master Table (Editable Raw Marks on Large Screens, and on Print) */}
      <div
        className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${
          mobileViewFormat === 'table' ? 'block' : 'hidden md:block print:block'
        }`}
      >
        <div className="no-print p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
            <h2 className="font-bold text-slate-900 text-sm">
              {currentClass?.name} {currentClass?.stream} — {currentExam?.name} Broadsheet List
            </h2>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              {filteredStudents.length} Learners Enrolled
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              Term: {currentExam?.term} | Year: {currentExam?.year} • Editable Raw Marks
            </span>
            <button
              onClick={handleSaveGrades}
              disabled={isSaving}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Table Marks'}</span>
            </button>
          </div>
        </div>

        {/* Horizontal scroll hint */}
        <div className="md:hidden no-print px-3 py-1.5 bg-emerald-50 border-b border-emerald-100 text-emerald-800 text-[11px] font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Swipe horizontally to view all subjects across the student list</span>
        </div>

        <div className="overflow-x-auto max-w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700">
                <th className="p-3 font-bold sticky left-0 bg-slate-100 z-10 w-12 border-r border-slate-200">
                  #
                </th>
                <th className="p-3 font-bold sticky left-12 bg-slate-100 z-10 w-28 border-r border-slate-200">
                  Adm No
                </th>
                <th className="p-3 font-bold sticky left-40 bg-slate-100 z-10 min-w-[180px] border-r border-slate-200">
                  Learner Name
                </th>
                <th className="p-3 font-bold text-center w-12 border-r border-slate-200">
                  Gen
                </th>
                {classSubjects.map((sub) => (
                  <th
                    key={sub.id}
                    className="p-2.5 font-bold text-center border-r border-slate-200 min-w-[110px]"
                  >
                    <div className="truncate font-bold text-slate-800" title={sub.name}>
                      {sub.code || sub.name.substring(0, 8)}
                    </div>
                    <div className="text-[9px] text-slate-500 font-normal">Score | Rubric</div>
                  </th>
                ))}
                <th className="p-3 font-bold text-center min-w-[130px]">
                  Competency Profile
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td
                    colSpan={classSubjects.length + 5}
                    className="text-center p-8 text-slate-400 font-medium"
                  >
                    No learners found for this class and filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((stud: Student, idx: number) => {
                  let eeCount = 0;
                  let meCount = 0;
                  let aeCount = 0;
                  let beCount = 0;

                  return (
                    <tr
                      key={stud.id}
                      className="hover:bg-emerald-50/40 transition group"
                    >
                      <td className="p-3 text-slate-400 font-medium sticky left-0 bg-white group-hover:bg-emerald-50/40 z-10 border-r border-slate-100">
                        {idx + 1}
                      </td>
                      <td className="p-3 font-bold text-slate-800 sticky left-12 bg-white group-hover:bg-emerald-50/40 z-10 border-r border-slate-100 whitespace-nowrap font-mono">
                        {stud.admission_number}
                      </td>
                      <td className="p-3 font-semibold text-slate-900 sticky left-40 bg-white group-hover:bg-emerald-50/40 z-10 border-r border-slate-100 whitespace-nowrap">
                        {stud.full_name}
                      </td>
                      <td className="p-3 text-center text-slate-500 uppercase border-r border-slate-100">
                        {stud.gender.charAt(0)}
                      </td>

                      {classSubjects.map((sub) => {
                        const key = `${stud.id}_${sub.id}`;
                        const g = editableGrades[key];
                        if (g?.rubric?.startsWith('EE')) eeCount++;
                        else if (g?.rubric?.startsWith('ME')) meCount++;
                        else if (g?.rubric?.startsWith('AE')) aeCount++;
                        else if (g?.rubric?.startsWith('BE')) beCount++;

                        const marksVal = g?.marks !== null && g?.marks !== undefined ? g.marks : '';

                        return (
                          <td
                            key={sub.id}
                            className="p-2 text-center border-r border-slate-100 whitespace-nowrap"
                          >
                            <div className="flex items-center justify-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                inputMode="numeric"
                                value={marksVal}
                                onChange={(e) => handleMarkChange(stud.id, sub.id, e.target.value)}
                                className="w-12 text-center font-bold text-xs py-1 px-1 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-emerald-500 focus:outline-none"
                                placeholder="—"
                              />
                              {getRubricBadge(g?.rubric)}
                            </div>
                          </td>
                        );
                      })}

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-[10px]">
                          {eeCount > 0 && (
                            <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                              {eeCount} EE
                            </span>
                          )}
                          {meCount > 0 && (
                            <span className="bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                              {meCount} ME
                            </span>
                          )}
                          {aeCount > 0 && (
                            <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                              {aeCount} AE
                            </span>
                          )}
                          {beCount > 0 && (
                            <span className="bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded">
                              {beCount} BE
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subject Performance & Rubric Distribution Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-700" />
            Subject Rubric Distribution (Class Competency Analysis)
          </h3>
          <span className="text-xs text-slate-500">
            Based on {classSubjects.length} Registered CBC Subjects
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {subjectStats.map((st) => (
            <div
              key={st.subject.id}
              className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900 text-xs truncate max-w-[170px]">
                  {st.subject.name}
                </span>
                {st.avgRubric ? (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 text-[10px] font-bold rounded-full">
                    Dominant: {st.avgRubric.level}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">Pending</span>
                )}
              </div>

              <div className="grid grid-cols-4 gap-1 text-center text-[10px]">
                <div className="bg-emerald-50 border border-emerald-200 rounded p-1">
                  <div className="font-bold text-emerald-800">
                    {(st.counts['EE1'] || 0) + (st.counts['EE2'] || 0)}
                  </div>
                  <div className="text-[9px] text-emerald-600 font-medium">EE</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded p-1">
                  <div className="font-bold text-blue-800">
                    {(st.counts['ME1'] || 0) + (st.counts['ME2'] || 0)}
                  </div>
                  <div className="text-[9px] text-blue-600 font-medium">ME</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded p-1">
                  <div className="font-bold text-amber-800">
                    {(st.counts['AE1'] || 0) + (st.counts['AE2'] || 0)}
                  </div>
                  <div className="text-[9px] text-amber-600 font-medium">AE</div>
                </div>
                <div className="bg-rose-50 border border-rose-200 rounded p-1">
                  <div className="font-bold text-rose-800">
                    {(st.counts['BE1'] || 0) + (st.counts['BE2'] || 0)}
                  </div>
                  <div className="text-[9px] text-rose-600 font-medium">BE</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
