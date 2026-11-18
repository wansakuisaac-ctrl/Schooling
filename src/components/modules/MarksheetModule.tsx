import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useViewMode } from '../../context/ViewModeContext';
import { dbService } from '../../services/storage';
import { markToRubric, CBC_RUBRIC_DEFINITIONS } from '../../services/cbcRubric';
import { Student, Grade, RubricLevel } from '../../types';
import {
  FileText,
  Save,
  Printer,
  CheckCircle,
  Search,
  Smartphone,
  Monitor,
  Users,
  Award,
  Sparkles,
  TrendingUp,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

export const MarksheetModule: React.FC = () => {
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

  const currentClass = classes.find((c) => c.id === selectedClassId);
  const classSubjects = currentClass
    ? subjects.filter((s) => s.level_id === currentClass.level_id)
    : [];

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    classSubjects[0]?.id || ''
  );

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [layoutMode, setLayoutMode] = useState<'cards' | 'table' | 'auto'>('auto');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const showCards = layoutMode === 'cards' || (layoutMode === 'auto' && effectiveIsMobile);

  const currentExam = exams.find((e) => e.id === selectedExamId);
  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);

  // Ensure students are loaded, with auto-enroll fallback if class is newly created or empty
  const students: Student[] = useMemo(() => {
    if (!currentClass) return [];
    let list = dbService.getStudents(schoolId, { classId: currentClass.id });
    if (list.length === 0) {
      list = dbService.enrollSampleStudentsToClass(schoolId, currentClass.id, 6);
    }
    return list;
  }, [currentClass, schoolId]);

  // Local state for editing marksheet
  const [scores, setScores] = useState<
    Record<string, { marks: number | null; rubric: string; remarks: string }>
  >({});

  // Initialize scores from database whenever selection changes
  useEffect(() => {
    if (!selectedExamId || !selectedSubjectId || students.length === 0) return;
    const allGrades = dbService.getGrades(
      schoolId,
      selectedExamId,
      selectedClassId,
      selectedSubjectId
    );
    const newScores: Record<
      string,
      { marks: number | null; rubric: string; remarks: string }
    > = {};

    students.forEach((stud: Student) => {
      const g = allGrades.find(
        (grade: Grade) =>
          grade.student_id === stud.id && grade.subject_id === selectedSubjectId
      );
      if (g) {
        const m = g.marks !== undefined ? g.marks : null;
        newScores[stud.id] = {
          marks: m,
          rubric: g.rubric_level || (m !== null ? markToRubric(m).level : ''),
          remarks: g.teacher_comment || '',
        };
      } else {
        newScores[stud.id] = {
          marks: null,
          rubric: '',
          remarks: '',
        };
      }
    });

    setScores(newScores);
    setHasUnsavedChanges(false);
  }, [selectedClassId, selectedExamId, selectedSubjectId, schoolId, students.length]);

  const handleMarkChange = (studentId: string, val: string) => {
    const num = val === '' ? null : parseInt(val, 10);
    if (num !== null && (isNaN(num) || num < 0 || num > 100)) return;

    let rubric = '';
    if (num !== null) {
      rubric = markToRubric(num).level;
    }

    setScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        marks: num,
        rubric: rubric,
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleApplyPreset = (studentId: string, presetMark: number) => {
    const rubric = markToRubric(presetMark).level;
    setScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        marks: presetMark,
        rubric: rubric,
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleRubricChange = (studentId: string, rubricVal: string) => {
    setScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        rubric: rubricVal,
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleRemarksChange = (studentId: string, remarksVal: string) => {
    setScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks: remarksVal,
      },
    }));
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    if (!selectedExamId || !selectedSubjectId) return;
    setIsSaving(true);

    try {
      const gradesToSave: {
        exam_id: string;
        student_id: string;
        subject_id: string;
        marks?: number | null;
        rubric_level: RubricLevel;
        points: number;
        teacher_comment: string;
        entered_by_teacher_id: string;
      }[] = [];

      students.forEach((stud: Student) => {
        const s = scores[stud.id];
        if (s && (s.marks !== null || s.rubric)) {
          const rubricLevel =
            (s.rubric as RubricLevel) ||
            (s.marks !== null ? markToRubric(s.marks).level : 'ME1');
          const points = CBC_RUBRIC_DEFINITIONS[rubricLevel]?.points || 5;

          gradesToSave.push({
            exam_id: selectedExamId,
            student_id: stud.id,
            subject_id: selectedSubjectId,
            marks: s.marks,
            rubric_level: rubricLevel,
            points,
            teacher_comment: s.remarks || 'Assessed on CBC Subject Marksheet',
            entered_by_teacher_id: currentUser?.id || 'admin',
          });
        }
      });

      if (gradesToSave.length > 0) {
        dbService.batchSaveGrades(schoolId, gradesToSave);
        setSaveSuccess(true);
        setHasUnsavedChanges(false);
        setTimeout(() => setSaveSuccess(false), 3500);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Filter students based on search term
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;
    const term = searchTerm.toLowerCase();
    return students.filter(
      (s) =>
        s.full_name.toLowerCase().includes(term) ||
        s.admission_number.toLowerCase().includes(term)
    );
  }, [students, searchTerm]);

  // Competency Statistics for the selected sheet
  const rubricStats = useMemo(() => {
    let ee = 0;
    let me = 0;
    let ae = 0;
    let be = 0;
    let graded = 0;

    Object.values(scores).forEach((s) => {
      if (s.marks !== null || s.rubric) {
        graded++;
        const rub = s.rubric || (s.marks !== null ? markToRubric(s.marks).level : '');
        if (rub.startsWith('EE')) ee++;
        else if (rub.startsWith('ME')) me++;
        else if (rub.startsWith('AE')) ae++;
        else if (rub.startsWith('BE')) be++;
      }
    });

    return { ee, me, ae, be, graded, total: students.length };
  }, [scores, students.length]);

  const rubricList = Object.values(CBC_RUBRIC_DEFINITIONS);

  return (
    <div className="p-3 sm:p-6 space-y-5">
      {/* Print-specific style tags */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
            font-size: 11pt !important;
          }
          .no-print, header, aside, nav, button, .sticky-save-bar {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .printable-sheet {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          th, td {
            border: 1px solid #475569 !important;
            padding: 6px 8px !important;
            font-size: 10pt !important;
          }
          th {
            background-color: #f1f5f9 !important;
            color: #0f172a !important;
            font-weight: 700 !important;
          }
          .page-break {
            page-break-after: always;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>

      {/* Official Print Header */}
      <div className="print-only mb-6 border-b-2 border-slate-900 pb-4 text-center">
        <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">
          {currentSchool.name}
        </h1>
        <p className="text-xs text-slate-700 italic">"{(currentSchool as any).motto || 'Excellence in Competency-Based Education'}"</p>
        <p className="text-xs text-slate-700">{currentSchool.address} &bull; Email: {currentSchool.email} &bull; Tel: {currentSchool.phone}</p>
        <div className="mt-3 pt-2 border-t border-slate-300 flex items-center justify-between text-xs font-bold text-slate-800">
          <span>DOCUMENT: OFFICIAL SUBJECT MARKSHEET</span>
          <span>CURRICULUM: KENYAN CBC (8-LEVEL RUBRIC)</span>
        </div>
        <div className="mt-1 grid grid-cols-4 text-left text-xs bg-slate-100 p-2 border border-slate-300">
          <div><span className="font-bold">Class:</span> {currentClass?.name} {currentClass?.stream}</div>
          <div><span className="font-bold">Subject:</span> {currentSubject?.name} ({currentSubject?.code})</div>
          <div><span className="font-bold">Assessment:</span> {currentExam?.name}</div>
          <div><span className="font-bold">Term / Year:</span> {currentExam?.term} {currentExam?.year}</div>
        </div>
      </div>

      {/* Screen Header */}
      <div className="no-print bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4" />
            Academics &bull; Subject Marksheet
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Official Subject Marksheet
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Fast numeric mark entry and 8-level CBC rubric evaluation for {currentSchool.name}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 font-bold animate-pulse">
              <CheckCircle className="w-4 h-4" />
              Saved successfully!
            </span>
          )}

          {/* Responsive Layout Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setLayoutMode('auto')}
              className={`px-2.5 py-1.5 rounded-lg transition ${
                layoutMode === 'auto'
                  ? 'bg-white text-emerald-800 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Auto responsive mode"
            >
              Auto
            </button>
            <button
              onClick={() => setLayoutMode('cards')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition ${
                layoutMode === 'cards'
                  ? 'bg-white text-emerald-800 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Force card view"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setLayoutMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition ${
                layoutMode === 'table'
                  ? 'bg-white text-emerald-800 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Force table view"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs ${
              hasUnsavedChanges
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white ring-2 ring-emerald-400 animate-pulse'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white'
            }`}
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes *' : 'Save Marksheet'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="no-print bg-white rounded-xl p-4 border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
            1. Class / Stream
          </label>
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              const found = classes.find((c) => c.id === e.target.value);
              const subs = found ? subjects.filter((s) => s.level_id === found.level_id) : [];
              if (subs.length > 0) setSelectedSubjectId(subs[0].id);
            }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.stream}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
            2. Learning Area / Subject
          </label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
          >
            {classSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
            3. Examination / Assessment
          </label>
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
          >
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.name} ({ex.term} {ex.year})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Live Competency Distribution Banner & Search Filter */}
      <div className="no-print bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-slate-700 flex items-center gap-1.5 mr-1">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Progress:</span>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-black">
              {rubricStats.graded} / {rubricStats.total} Graded
            </span>
          </span>

          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[11px]">
            {rubricStats.ee} Exceeding (EE)
          </span>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[11px]">
            {rubricStats.me} Meeting (ME)
          </span>
          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[11px]">
            {rubricStats.ae} Approaching (AE)
          </span>
          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[11px]">
            {rubricStats.be} Below (BE)
          </span>
        </div>

        {/* Search Learner */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search learner or adm..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* CARD-BASED VIEW (for mobile screens and small viewports) */}
      {showCards && (
        <div className="space-y-3.5 md:hidden">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
              No learners found matching "{searchTerm}".
            </div>
          ) : (
            filteredStudents.map((stud: Student, idx: number) => {
              const s = scores[stud.id] || { marks: null, rubric: '', remarks: '' };
              const currentRubric =
                s.rubric || (s.marks !== null ? markToRubric(s.marks).level : '');

              return (
                <div
                  key={stud.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3"
                >
                  {/* Top Learner Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-xs shrink-0">
                        {stud.full_name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm leading-tight">
                          {stud.full_name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Adm: {stud.admission_number}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-slate-400">
                      #{idx + 1}
                    </span>
                  </div>

                  {/* Marks & Quick 1-tap Presets */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 uppercase">
                        Raw Mark (0–100)
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-semibold">Presets:</span>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset(stud.id, 80)}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        >
                          80
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset(stud.id, 65)}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 hover:bg-blue-200"
                        >
                          65
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset(stud.id, 50)}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200"
                        >
                          50
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={s.marks !== null ? s.marks : ''}
                        onChange={(e) => handleMarkChange(stud.id, e.target.value)}
                        placeholder="0–100"
                        className="w-24 min-h-[44px] px-3 py-2 text-center text-base font-black text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                      />

                      {/* Live 8-level Rubric Select */}
                      <div className="flex-1">
                        <select
                          value={s.rubric}
                          onChange={(e) => handleRubricChange(stud.id, e.target.value)}
                          className={`w-full min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border transition ${
                            currentRubric.startsWith('EE')
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                              : currentRubric.startsWith('ME')
                              ? 'bg-blue-50 text-blue-900 border-blue-300'
                              : currentRubric.startsWith('AE')
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : currentRubric.startsWith('BE')
                              ? 'bg-rose-50 text-rose-900 border-rose-300'
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          <option value="">Rubric (EE1–BE2)</option>
                          {rubricList.map((r) => (
                            <option key={r.code} value={r.code}>
                              {r.code} &bull; {r.description} ({r.minMark}-{r.maxMark})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Qualitative Remarks */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Qualitative Remarks
                    </label>
                    <input
                      type="text"
                      value={s.remarks}
                      onChange={(e) => handleRemarksChange(stud.id, e.target.value)}
                      placeholder="e.g. Exemplary conceptual grasp, active inquiry..."
                      className="w-full min-h-[40px] px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* MASTER TABLE VIEW (for desktop or forced table mode) */}
      <div
        className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden printable-sheet ${
          showCards ? 'hidden md:block' : 'block'
        }`}
      >
        <div className="no-print p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="font-bold text-slate-800 text-sm">
            {currentSubject?.name} Marksheet &bull; {currentClass?.name} {currentClass?.stream}
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {filteredStudents.length} Learners Listed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                <th className="p-3 font-bold w-12">#</th>
                <th className="p-3 font-bold w-32">Adm No</th>
                <th className="p-3 font-bold">Learner Full Name</th>
                <th className="p-3 font-bold text-center w-28">Marks (0–100)</th>
                <th className="p-3 font-bold text-center w-48">CBC Rubric (EE1–BE2)</th>
                <th className="p-3 font-bold">Teacher Qualitative Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((stud: Student, idx: number) => {
                const s = scores[stud.id] || { marks: null, rubric: '', remarks: '' };

                return (
                  <tr key={stud.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 text-slate-400 font-medium">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-800 font-mono">{stud.admission_number}</td>
                    <td className="p-3 font-semibold text-slate-900">{stud.full_name}</td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={s.marks !== null ? s.marks : ''}
                        onChange={(e) => handleMarkChange(stud.id, e.target.value)}
                        placeholder="—"
                        className="w-20 px-2 py-1.5 text-center font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <select
                        value={s.rubric}
                        onChange={(e) => handleRubricChange(stud.id, e.target.value)}
                        className={`w-44 px-2.5 py-1.5 rounded-lg text-xs font-bold border ${
                          s.rubric.startsWith('EE')
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : s.rubric.startsWith('ME')
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : s.rubric.startsWith('AE')
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : s.rubric.startsWith('BE')
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-slate-50 text-slate-700 border-slate-300'
                        }`}
                      >
                        <option value="">Select Rubric</option>
                        {rubricList.map((r) => (
                          <option key={r.code} value={r.code}>
                            {r.code} &bull; {r.description}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <input
                        type="text"
                        value={s.remarks}
                        onChange={(e) => handleRemarksChange(stud.id, e.target.value)}
                        placeholder="Exemplary conceptual grasp, active inquiry..."
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:ring-2 focus:ring-emerald-500"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Printable Endorsement Signatures Block */}
        <div className="print-only mt-8 pt-4 border-t border-slate-400 grid grid-cols-3 gap-6 text-xs text-slate-800">
          <div>
            <div className="font-bold mb-6">Subject Teacher Signature:</div>
            <div className="border-b border-slate-800 w-44 mb-1"></div>
            <div>Date: ________________________</div>
          </div>
          <div>
            <div className="font-bold mb-6">Head of Department (Academics):</div>
            <div className="border-b border-slate-800 w-44 mb-1"></div>
            <div>Date: ________________________</div>
          </div>
          <div>
            <div className="font-bold mb-6">Principal / Headteacher Stamp:</div>
            <div className="border-b border-slate-800 w-44 mb-1"></div>
            <div>Date: ________________________</div>
          </div>
        </div>
      </div>

      {/* Sticky Mobile Save Bar */}
      {hasUnsavedChanges && (
        <div className="no-print md:hidden fixed bottom-16 left-3 right-3 z-30 bg-slate-900 text-white p-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xs font-bold text-amber-300">Unsaved marks!</span>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Marksheet'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

