import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useViewMode } from '../../context/ViewModeContext';
import { dbService } from '../../services/storage';
import { markToRubric, CBC_RUBRIC_DEFINITIONS } from '../../services/cbcRubric';
import { Student, Subject, Exam, RubricLevel } from '../../types';
import {
  FileSpreadsheet,
  Save,
  Users,
  CheckCircle2,
  RefreshCw,
  Search,
  Sparkles,
  ArrowRight,
  BookOpen,
  Filter,
  UserPlus,
  Download,
  AlertCircle,
  TrendingUp,
  Award,
  Smartphone,
  Monitor,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react';

export const MarksEntryModule: React.FC = () => {
  const { currentSchool, currentUser } = useAuth();
  const { effectiveIsMobile } = useViewMode();
  if (!currentSchool) return null;

  const schoolId = currentSchool.id;
  const classes = dbService.getClasses(schoolId);
  const exams = dbService.getExams(schoolId);
  const subjects = dbService.getSubjects(schoolId);

  // Initialize selected class to one that has enrolled students if available
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    const classWithStudents = classes.find(
      (c) => dbService.getStudents(schoolId, { classId: c.id }).length > 0
    );
    return classWithStudents?.id || classes[0]?.id || '';
  });

  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  // Marks state: Record<studentId, Record<subjectId, number | null>>
  const [rawMarks, setRawMarks] = useState<Record<string, Record<string, number | null>>>({});
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState<boolean>(false);
  const [newStudentName, setNewStudentName] = useState<string>('');
  const [newStudentAdm, setNewStudentAdm] = useState<string>('');
  const [newStudentGender, setNewStudentGender] = useState<'male' | 'female'>('male');

  // View mode toggle within Marks Entry: auto defaults to cards on mobile, table on desktop
  const [entryMode, setEntryMode] = useState<'auto' | 'cards' | 'table'>('auto');
  const activeLayout = entryMode === 'auto' ? (effectiveIsMobile ? 'cards' : 'table') : entryMode;

  // Active student index when in mobile card focus mode
  const [activeStudentIndex, setActiveStudentIndex] = useState<number>(0);

  // Active class, exam, and subjects
  const currentClass = classes.find((c) => c.id === selectedClassId);
  const currentExam = exams.find((e) => e.id === selectedExamId);

  // Learning areas for current class level
  const learningAreas: Subject[] = useMemo(() => {
    if (!currentClass) return [];
    let list = subjects.filter((s) => s.level_id === currentClass.level_id);
    if (list.length === 0) {
      list = subjects.slice(0, 8);
    }
    return list;
  }, [currentClass, subjects]);

  // Load learners and populate their current marks from the database
  const loadLearners = () => {
    if (!currentClass) return;

    let classStudents = dbService.getStudents(schoolId, { classId: currentClass.id });

    // Automatic fallback: If this class has no enrolled learners yet,
    // automatically auto-enroll standard CBC learners so the marks sheet is immediately ready!
    if (classStudents.length === 0) {
      classStudents = dbService.enrollSampleStudentsToClass(schoolId, currentClass.id, 6);
    }

    setStudents(classStudents);

    // Fetch existing grades for this exam and class
    if (selectedExamId) {
      const existingGrades = dbService.getGrades(schoolId, selectedExamId, currentClass.id);
      const marksGrid: Record<string, Record<string, number | null>> = {};

      classStudents.forEach((stud) => {
        marksGrid[stud.id] = {};
        learningAreas.forEach((sub) => {
          const found = existingGrades.find(
            (g) => g.student_id === stud.id && g.subject_id === sub.id
          );
          marksGrid[stud.id][sub.id] = found && found.marks !== undefined && found.marks !== null ? found.marks : null;
        });
      });

      setRawMarks(marksGrid);
    }

    setSaveSuccessMsg(null);
  };

  // Initial load and whenever class or exam changes
  useEffect(() => {
    loadLearners();
  }, [selectedClassId, selectedExamId, learningAreas.length]);

  const handleMarkChange = (studentId: string, subjectId: string, value: string) => {
    const val = value.trim();
    let num: number | null = null;

    if (val !== '') {
      const parsed = parseInt(val, 10);
      if (isNaN(parsed) || parsed < 0 || parsed > 100) return;
      num = parsed;
    }

    setRawMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [subjectId]: num,
      },
    }));
  };

  // Quick preset score setter (especially useful on mobile touch screens)
  const setQuickScore = (studentId: string, subjectId: string, targetScore: number) => {
    const clamped = Math.max(0, Math.min(100, targetScore));
    setRawMarks((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        [subjectId]: clamped,
      },
    }));
  };

  // Auto-fill random realistic marks for quick demonstration
  const handleAutoFillSample = () => {
    const newMarks: Record<string, Record<string, number | null>> = {};
    students.forEach((stud) => {
      newMarks[stud.id] = {};
      learningAreas.forEach((sub) => {
        const rand = Math.floor(Math.random() * 47) + 48;
        newMarks[stud.id][sub.id] = rand;
      });
    });
    setRawMarks(newMarks);
  };

  // Clear marks in grid
  const handleClearMarks = () => {
    if (!window.confirm('Clear all entered marks on this sheet?')) return;
    const empty: Record<string, Record<string, number | null>> = {};
    students.forEach((stud) => {
      empty[stud.id] = {};
      learningAreas.forEach((sub) => {
        empty[stud.id][sub.id] = null;
      });
    });
    setRawMarks(empty);
  };

  // Add sample learners on-demand
  const handleAddMoreSampleLearners = () => {
    if (!currentClass) return;
    dbService.enrollSampleStudentsToClass(schoolId, currentClass.id, 4);
    loadLearners();
    setSaveSuccessMsg('Enrolled 4 additional CBC learners to this class.');
  };

  // Add single custom student
  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !currentClass) return;

    const adm = newStudentAdm.trim() || `ADM/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`;
    dbService.createStudent(schoolId, {
      full_name: newStudentName.trim(),
      admission_number: adm,
      level_id: currentClass.level_id,
      class_id: currentClass.id,
      gender: newStudentGender,
      student_type: 'day',
      status: 'active',
      dob: '2015-01-01',
    });

    setNewStudentName('');
    setNewStudentAdm('');
    setShowAddStudentModal(false);
    loadLearners();
    setSaveSuccessMsg(`Enrolled learner ${newStudentName.trim()} (${adm}) successfully!`);
  };

  // Save all raw marks to database
  const handleSaveMarks = () => {
    if (!selectedExamId || students.length === 0 || learningAreas.length === 0) return;

    setIsSaving(true);
    const gradesToSave: {
      exam_id: string;
      student_id: string;
      subject_id: string;
      marks: number | null;
      rubric_level: RubricLevel;
      points: number;
      teacher_comment: string;
      entered_by_teacher_id: string;
    }[] = [];

    let countSaved = 0;

    students.forEach((stud) => {
      learningAreas.forEach((sub) => {
        const mark = rawMarks[stud.id]?.[sub.id];
        if (mark !== null && mark !== undefined) {
          const rubric = markToRubric(mark);
          gradesToSave.push({
            exam_id: selectedExamId,
            student_id: stud.id,
            subject_id: sub.id,
            marks: mark,
            rubric_level: rubric.level,
            points: rubric.points,
            teacher_comment: `${rubric.description} - ${rubric.level}`,
            entered_by_teacher_id: currentUser?.id || 'admin',
          });
          countSaved++;
        }
      });
    });

    if (gradesToSave.length > 0) {
      dbService.batchSaveGrades(schoolId, gradesToSave);
      setSaveSuccessMsg(
        `Successfully saved ${countSaved} raw marks across ${learningAreas.length} learning areas for ${currentClass?.name} ${currentClass?.stream}!`
      );
    } else {
      setSaveSuccessMsg('No marks were entered to save. Please enter raw marks in the grid.');
    }

    setIsSaving(false);
    setTimeout(() => setSaveSuccessMsg(null), 6000);
  };

  // Export marks sheet to CSV format
  const handleExportCSV = () => {
    if (students.length === 0 || learningAreas.length === 0) return;

    const headers = ['#', 'Admission No', 'Learner Full Name', ...learningAreas.map((a) => a.name), 'Average Mark', 'CBC Rubric'];
    const rows = students.map((s, idx) => {
      let total = 0;
      let count = 0;
      const scores = learningAreas.map((a) => {
        const val = rawMarks[s.id]?.[a.id];
        if (val !== null && val !== undefined) {
          total += val;
          count++;
          return val;
        }
        return '';
      });
      const avg = count > 0 ? (total / count).toFixed(1) : '';
      const rubric = count > 0 ? markToRubric(Math.round(total / count)).level : '';
      return [idx + 1, s.admission_number, `"${s.full_name}"`, ...scores, avg, rubric].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Marks_Sheet_${currentClass?.name}_${currentClass?.stream}_${currentExam?.name || 'Exam'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStudents = students.filter(
    (s) =>
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.admission_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeStudent = filteredStudents[activeStudentIndex] || filteredStudents[0];

  // Compute stats across current marks sheet
  const sheetStats = useMemo(() => {
    let totalScores = 0;
    let sumMarks = 0;
    let countMarks = 0;

    students.forEach((stud) => {
      learningAreas.forEach((sub) => {
        totalScores++;
        const val = rawMarks[stud.id]?.[sub.id];
        if (val !== null && val !== undefined) {
          sumMarks += val;
          countMarks++;
        }
      });
    });

    const classAverage = countMarks > 0 ? Math.round(sumMarks / countMarks) : 0;
    const completionRate = totalScores > 0 ? Math.round((countMarks / totalScores) * 100) : 0;

    return {
      totalScores,
      countMarks,
      classAverage,
      completionRate,
      averageRubric: countMarks > 0 ? markToRubric(classAverage) : null,
    };
  }, [students, learningAreas, rawMarks]);

  const getRubricBadge = (mark: number | null | undefined) => {
    if (mark === null || mark === undefined) {
      return <span className="text-[10px] text-slate-300 font-mono">—</span>;
    }

    const { level } = markToRubric(mark);
    let color = 'bg-slate-100 text-slate-700';
    if (level.startsWith('EE')) color = 'bg-emerald-100 text-emerald-800 font-bold border border-emerald-300';
    else if (level.startsWith('ME')) color = 'bg-blue-100 text-blue-800 font-semibold border border-blue-300';
    else if (level.startsWith('AE')) color = 'bg-amber-100 text-amber-800 font-semibold border border-amber-300';
    else if (level.startsWith('BE')) color = 'bg-rose-100 text-rose-800 font-semibold border border-rose-300';

    return (
      <span className={`text-[9px] px-1.5 py-0.5 rounded leading-none ${color}`}>
        {level}
      </span>
    );
  };

  // Helper to compute student's current average and rubric
  const getStudentAverage = (studId: string) => {
    let total = 0;
    let count = 0;
    learningAreas.forEach((area) => {
      const val = rawMarks[studId]?.[area.id];
      if (val !== null && val !== undefined) {
        total += val;
        count++;
      }
    });
    const avg = count > 0 ? Math.round(total / count) : null;
    const rubric = avg !== null ? markToRubric(avg) : null;
    return { avg, rubric, count };
  };

  return (
    <div className="p-2 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header Banner */}
      <div className="no-print bg-gradient-to-r from-emerald-800 to-emerald-950 text-white rounded-2xl p-4 sm:p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-700/60 text-emerald-200 text-xs font-semibold mb-2">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Official Academics &bull; Unified Marks Entry
            </div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight">
              Raw Marks Entry (All Learning Areas)
            </h1>
            <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Enter raw numeric marks (0–100) across every CBC learning area. Marks auto-convert to official 8-level rubrics (EE1–BE2).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* View Mode Toggle: Mobile Cards vs Windows Spreadsheet */}
            <div className="flex items-center bg-emerald-900/80 p-0.5 rounded-xl border border-emerald-700">
              <button
                onClick={() => setEntryMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeLayout === 'cards'
                    ? 'bg-emerald-400 text-slate-950 shadow-sm'
                    : 'text-emerald-200 hover:text-white'
                }`}
                title="Mobile Cards Mode - optimized for smartphones & touch screens"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Phone Cards</span>
              </button>

              <button
                onClick={() => setEntryMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeLayout === 'table'
                    ? 'bg-emerald-400 text-slate-950 shadow-sm'
                    : 'text-emerald-200 hover:text-white'
                }`}
                title="Windows Spreadsheet Mode - full widescreen table"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Spreadsheet</span>
              </button>
            </div>

            <button
              onClick={handleAutoFillSample}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              title="Populate realistic sample marks for quick testing"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="hidden sm:inline">Auto-Fill</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={students.length === 0}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700/80 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
              title="Download marks sheet as CSV"
            >
              <Download className="w-4 h-4" />
              <span>CSV</span>
            </button>

            <button
              onClick={handleSaveMarks}
              disabled={isSaving || students.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-xl text-xs font-extrabold transition shadow-md cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-emerald-950" />
              <span>{isSaving ? 'Saving...' : 'Save All Marks'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification Banner */}
      {saveSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 text-base font-bold cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Overview Stat Cards (Stackable on phone, 4-col on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 font-bold uppercase">Class Roster</div>
            <div className="text-base sm:text-lg font-black text-slate-900">{students.length} Learners</div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 font-bold uppercase">Subjects</div>
            <div className="text-base sm:text-lg font-black text-slate-900">{learningAreas.length} Areas</div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 font-bold uppercase">Progress</div>
            <div className="text-sm sm:text-lg font-black text-slate-900">
              {sheetStats.countMarks}/{sheetStats.totalScores} ({sheetStats.completionRate}%)
            </div>
          </div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 font-bold uppercase">Class Average</div>
            <div className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-1.5">
              <span>{sheetStats.classAverage > 0 ? `${sheetStats.classAverage}%` : '—'}</span>
              {sheetStats.averageRubric && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                  {sheetStats.averageRubric.level}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Control & Selection Bar */}
      <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Class Select */}
          <div className="w-full sm:min-w-[200px]">
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase mb-1">
              Class / Stream
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
            >
              {classes.map((c) => {
                const count = dbService.getStudents(schoolId, { classId: c.id }).length;
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.stream} ({count} learners)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Exam Select */}
          <div className="w-full sm:min-w-[220px]">
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase mb-1">
              Assessment / Exam
            </label>
            <select
              value={selectedExamId}
              onChange={(e) => setSelectedExamId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500"
            >
              {exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} ({ex.term} {ex.year})
                </option>
              ))}
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={loadLearners}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
              title="Refresh learner roster and marks"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Load Roster</span>
            </button>

            <button
              onClick={() => setShowAddStudentModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition cursor-pointer"
              title="Add a new learner to this class"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ Learner</span>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-60">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search learner name / adm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 1. MOBILE PHONE CARDS VIEW (Touch-Optimized for Handhelds)    */}
      {/* ------------------------------------------------------------- */}
      {activeLayout === 'cards' && (
        <div className="space-y-4">
          {filteredStudents.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
              <div className="font-bold text-slate-800">No learners in this class yet</div>
              <p className="text-xs text-slate-500 mt-1">Admit learners to start recording assessment marks.</p>
              <button
                onClick={() => setShowAddStudentModal(true)}
                className="mt-3 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Admit Learner</span>
              </button>
            </div>
          ) : (
            <>
              {/* Learner Selector Pager (Top of Mobile Cards) */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs flex items-center justify-between gap-2">
                <button
                  disabled={activeStudentIndex <= 0}
                  onClick={() => setActiveStudentIndex((prev) => Math.max(0, prev - 1))}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Previous Learner"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="text-center flex-1 min-w-0">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    Learner {activeStudentIndex + 1} of {filteredStudents.length}
                  </div>
                  <div className="font-bold text-slate-900 text-sm truncate">
                    {activeStudent?.full_name}
                  </div>
                  <div className="text-[11px] font-mono text-emerald-800 font-semibold">
                    {activeStudent?.admission_number}
                  </div>
                </div>

                <button
                  disabled={activeStudentIndex >= filteredStudents.length - 1}
                  onClick={() =>
                    setActiveStudentIndex((prev) =>
                      Math.min(filteredStudents.length - 1, prev + 1)
                    )
                  }
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Next Learner"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Active Learner Focus Grading Card */}
              {activeStudent && (
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
                  {/* Learner Card Header with Live Average */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-emerald-800 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                        {activeStudent.full_name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm sm:text-base">
                          {activeStudent.full_name}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span className="font-mono font-semibold">{activeStudent.admission_number}</span>
                          <span>&bull;</span>
                          <span className="capitalize">{activeStudent.gender}</span>
                        </div>
                      </div>
                    </div>

                    {/* Calculated Live Average for this learner */}
                    {(() => {
                      const { avg, rubric, count } = getStudentAverage(activeStudent.id);
                      return (
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-slate-400 uppercase">Average</div>
                          <div className="text-base font-black text-slate-900 flex items-center gap-1.5 justify-end">
                            <span>{avg !== null ? `${avg}%` : '—'}</span>
                            {rubric && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-100 text-emerald-800">
                                {rubric.level}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {count}/{learningAreas.length} entered
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* List of Learning Area Scoring Rows (Touch-Friendly) */}
                  <div className="space-y-3">
                    {learningAreas.map((area) => {
                      const markVal = rawMarks[activeStudent.id]?.[area.id];
                      const rubricObj = markVal !== null && markVal !== undefined ? markToRubric(markVal) : null;

                      return (
                        <div
                          key={area.id}
                          className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white transition space-y-2"
                        >
                          {/* Subject Header & Rubric Badge */}
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-bold text-slate-900 text-xs sm:text-sm">
                                {area.name}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono font-semibold">
                                Code: {area.code || area.name.substring(0, 4)}
                              </div>
                            </div>

                            {/* Rubric Badge */}
                            <div className="text-right">
                              {getRubricBadge(markVal)}
                              {rubricObj && (
                                <div className="text-[10px] text-slate-500 font-medium">
                                  {rubricObj.points} Points
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Touch Numeric Input & Quick 1-Tap Preset Pills */}
                          <div className="flex items-center gap-2 pt-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="0-100"
                              value={markVal !== null && markVal !== undefined ? markVal : ''}
                              onChange={(e) =>
                                handleMarkChange(activeStudent.id, area.id, e.target.value)
                              }
                              className="w-24 h-11 px-3 py-2 text-center text-base font-black text-slate-900 bg-white border-2 border-slate-300 rounded-xl focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500 shadow-xs"
                            />

                            {/* Quick 1-Tap Rubric Buttons for fast grading on mobile */}
                            <div className="flex flex-wrap items-center gap-1.5 flex-1">
                              <button
                                type="button"
                                onClick={() => setQuickScore(activeStudent.id, area.id, 85)}
                                className="px-2 py-1.5 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg cursor-pointer"
                                title="Set 85 (EE2)"
                              >
                                85 (EE)
                              </button>
                              <button
                                type="button"
                                onClick={() => setQuickScore(activeStudent.id, area.id, 70)}
                                className="px-2 py-1.5 text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 rounded-lg cursor-pointer"
                                title="Set 70 (ME1)"
                              >
                                70 (ME)
                              </button>
                              <button
                                type="button"
                                onClick={() => setQuickScore(activeStudent.id, area.id, 50)}
                                className="px-2 py-1.5 text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg cursor-pointer"
                                title="Set 50 (ME2)"
                              >
                                50 (ME)
                              </button>
                              <button
                                type="button"
                                onClick={() => setQuickScore(activeStudent.id, area.id, 35)}
                                className="px-2 py-1.5 text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg cursor-pointer"
                                title="Set 35 (AE1)"
                              >
                                35 (AE)
                              </button>
                              {markVal !== null && markVal !== undefined && (
                                <button
                                  type="button"
                                  onClick={() => setQuickScore(activeStudent.id, area.id, markVal + 5)}
                                  className="px-2 py-1.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                                >
                                  +5
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Learner Card Footer Pager & Save Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <button
                      disabled={activeStudentIndex <= 0}
                      onClick={() => setActiveStudentIndex((prev) => Math.max(0, prev - 1))}
                      className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl disabled:opacity-40 cursor-pointer"
                    >
                      &larr; Prev Learner
                    </button>

                    <button
                      onClick={handleSaveMarks}
                      disabled={isSaving}
                      className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                    >
                      {isSaving ? 'Saving...' : 'Save Marks'}
                    </button>

                    <button
                      disabled={activeStudentIndex >= filteredStudents.length - 1}
                      onClick={() =>
                        setActiveStudentIndex((prev) =>
                          Math.min(filteredStudents.length - 1, prev + 1)
                        )
                      }
                      className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl disabled:opacity-40 cursor-pointer"
                    >
                      Next Learner &rarr;
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 2. WINDOWS SPREADSHEET TABLE VIEW (Widescreen Multi-Column)   */}
      {/* ------------------------------------------------------------- */}
      {activeLayout === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table Header Controls */}
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-700" />
              <h2 className="font-bold text-slate-900 text-xs sm:text-sm">
                {currentClass?.name} {currentClass?.stream} &bull; {currentExam?.name || 'Selected Assessment'}
              </h2>
              <span className="text-[11px] text-slate-500 font-medium">
                ({filteredStudents.length} learners listed)
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={handleClearMarks}
                className="px-2.5 py-1 text-slate-500 hover:text-rose-600 font-semibold cursor-pointer"
              >
                Clear Sheet
              </button>
              <span className="text-slate-300">|</span>
              <button
                onClick={handleSaveMarks}
                disabled={isSaving || students.length === 0}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Save Marks
              </button>
            </div>
          </div>

          {/* Multi-Column Learning Areas Spreadsheet */}
          <div className="overflow-x-auto max-w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                  <th className="p-3 font-bold sticky left-0 bg-slate-100 z-20 w-12 border-r border-slate-200 text-center">
                    #
                  </th>
                  <th className="p-3 font-bold sticky left-12 bg-slate-100 z-20 w-28 border-r border-slate-200">
                    Adm No
                  </th>
                  <th className="p-3 font-bold sticky left-40 bg-slate-100 z-20 min-w-[190px] border-r border-slate-200">
                    Learner Full Name
                  </th>
                  {learningAreas.map((area) => (
                    <th
                      key={area.id}
                      className="p-2.5 text-center border-r border-slate-200 min-w-[110px]"
                    >
                      <div className="font-bold text-slate-900 truncate" title={area.name}>
                        {area.code || area.name.substring(0, 8)}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate" title={area.name}>
                        {area.name}
                      </div>
                    </th>
                  ))}
                  <th className="p-3 font-bold text-center bg-slate-100 min-w-[110px]">
                    Average / Level
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={learningAreas.length + 4}
                      className="text-center p-12 text-slate-500 font-medium"
                    >
                      <div className="max-w-md mx-auto space-y-3">
                        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                        <div className="text-sm font-bold text-slate-800">No learners found in this class</div>
                        <p className="text-xs text-slate-500">
                          There are currently no learners assigned to {currentClass?.name} {currentClass?.stream}.
                          Admit learners to begin entering real CBC assessment marks.
                        </p>
                        <div className="flex items-center justify-center gap-2 pt-2">
                          <button
                            onClick={() => setShowAddStudentModal(true)}
                            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                          >
                            <UserPlus className="w-4 h-4" />
                            <span>+ Admit Learner to this Class</span>
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((stud, idx) => {
                    let rowTotal = 0;
                    let rowCount = 0;
                    learningAreas.forEach((area) => {
                      const val = rawMarks[stud.id]?.[area.id];
                      if (val !== null && val !== undefined) {
                        rowTotal += val;
                        rowCount++;
                      }
                    });
                    const rowAvg = rowCount > 0 ? Math.round(rowTotal / rowCount) : null;
                    const rowRubric = rowAvg !== null ? markToRubric(rowAvg) : null;

                    return (
                      <tr key={stud.id} className="hover:bg-emerald-50/40 transition group">
                        <td className="p-3 text-slate-400 font-medium sticky left-0 bg-white group-hover:bg-emerald-50/40 z-10 border-r border-slate-100 text-center">
                          {idx + 1}
                        </td>
                        <td className="p-3 font-bold text-slate-800 sticky left-12 bg-white group-hover:bg-emerald-50/40 z-10 border-r border-slate-100 whitespace-nowrap font-mono text-[11px]">
                          {stud.admission_number}
                        </td>
                        <td className="p-3 font-semibold text-slate-900 sticky left-40 bg-white group-hover:bg-emerald-50/40 z-10 border-r border-slate-100 whitespace-nowrap">
                          {stud.full_name}
                        </td>

                        {/* Learning Area raw mark inputs */}
                        {learningAreas.map((area) => {
                          const markVal = rawMarks[stud.id]?.[area.id];
                          return (
                            <td
                              key={area.id}
                              className="p-2 text-center border-r border-slate-100 whitespace-nowrap"
                            >
                              <div className="flex flex-col items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  placeholder="—"
                                  value={markVal !== null && markVal !== undefined ? markVal : ''}
                                  onChange={(e) =>
                                    handleMarkChange(stud.id, area.id, e.target.value)
                                  }
                                  className="w-16 px-2 py-1 text-center font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                                />
                                {getRubricBadge(markVal)}
                              </div>
                            </td>
                          );
                        })}

                        {/* Row Average & Rubric */}
                        <td className="p-2 text-center bg-slate-50/50 whitespace-nowrap">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="font-extrabold text-slate-900 text-xs">
                              {rowAvg !== null ? `${rowAvg}%` : '—'}
                            </span>
                            {rowRubric && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-slate-200 text-slate-800">
                                {rowRubric.level}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {/* Table Footer with Column Averages */}
              {filteredStudents.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100/90 font-bold border-t-2 border-slate-300 text-slate-800">
                    <td colSpan={3} className="p-3 text-right sticky left-0 bg-slate-100 z-10 border-r border-slate-200 uppercase text-[11px]">
                      Learning Area Averages:
                    </td>
                    {learningAreas.map((area) => {
                      let colTotal = 0;
                      let colCount = 0;
                      students.forEach((s) => {
                        const val = rawMarks[s.id]?.[area.id];
                        if (val !== null && val !== undefined) {
                          colTotal += val;
                          colCount++;
                        }
                      });
                      const colAvg = colCount > 0 ? Math.round(colTotal / colCount) : null;
                      const colRubric = colAvg !== null ? markToRubric(colAvg) : null;

                      return (
                        <td key={area.id} className="p-2 text-center border-r border-slate-200">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="font-black text-slate-900 text-xs">
                              {colAvg !== null ? `${colAvg}%` : '—'}
                            </span>
                            {colRubric && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-white text-slate-700 font-bold border border-slate-200">
                                {colRubric.level}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    <td className="p-2 text-center bg-slate-200/80 font-black text-xs">
                      {sheetStats.classAverage > 0 ? `${sheetStats.classAverage}%` : '—'}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Bottom Save & Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-sm">
        <div className="text-xs text-slate-600">
          Showing <strong>{filteredStudents.length}</strong> of {students.length} learners enrolled in{' '}
          <strong>{currentClass?.name} {currentClass?.stream}</strong>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={handleAddMoreSampleLearners}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            + Enrol More
          </button>
          <button
            onClick={handleSaveMarks}
            disabled={isSaving || students.length === 0}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-extrabold transition shadow-md cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Marks...' : 'Save All Marks'}</span>
          </button>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-700" />
                Add Learner to {currentClass?.name} {currentClass?.stream}
              </h3>
              <button
                onClick={() => setShowAddStudentModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Learner Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Wanjiku Kamau"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Admission Number (Leave empty to auto-generate)
                </label>
                <input
                  type="text"
                  placeholder="e.g. ADM/2026/105"
                  value={newStudentAdm}
                  onChange={(e) => setNewStudentAdm(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Gender
                </label>
                <select
                  value={newStudentGender}
                  onChange={(e) => setNewStudentGender(e.target.value as 'male' | 'female')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save & Enrol
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
