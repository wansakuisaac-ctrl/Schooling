import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import { markToRubric, validateMarksRubricConflict, CBC_RUBRIC_DEFINITIONS, RUBRIC_LEVEL_ORDER } from '../../services/cbcRubric';
import { RubricLevel, Grade, Exam } from '../../types';
import {
  ListCheck,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  FileSpreadsheet,
  Award,
  ChevronRight,
  Info,
} from 'lucide-react';

export const ExamScoreEntry: React.FC = () => {
  const { currentSchool, currentUser } = useAuth();
  if (!currentSchool) return null;
  const schoolId = currentSchool.id;

  const exams = dbService.getExams(schoolId);
  const classes = dbService.getClasses(schoolId);
  const levels = dbService.getLevels(schoolId);

  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || '');
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const selectedLevel = levels.find((l) => l.id === selectedClass?.level_id);
  const subjects = dbService.getSubjects(schoolId, selectedLevel?.id);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');

  // Is PP1 - Grade 3 (Rubric Only mode, marks hidden & nullable)
  const isEarlyYearsOrLowerPrimary = selectedLevel
    ? ['PP1', 'PP2', 'Grade 1', 'Grade 2', 'Grade 3'].includes(selectedLevel.name)
    : false;

  const students = dbService.getStudents(schoolId, { classId: selectedClassId });
  const existingGrades = dbService.getGrades(schoolId, selectedExamId, selectedClassId, selectedSubjectId);

  // Row state: studentId -> { marks, rubric, points, comment, error }
  interface RowState {
    marks: number | null;
    rubric: RubricLevel;
    points: number;
    comment: string;
    hasError: boolean;
    errorMessage?: string;
  }

  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync state whenever exam/class/subject changes
  useEffect(() => {
    const nextRows: Record<string, RowState> = {};
    students.forEach((s) => {
      const g = existingGrades.find((grade) => grade.student_id === s.id);
      if (g) {
        nextRows[s.id] = {
          marks: g.marks !== undefined ? g.marks : null,
          rubric: g.rubric_level,
          points: g.points,
          comment: g.teacher_comment,
          hasError: false,
        };
      } else {
        // Defaults
        const defRubric: RubricLevel = isEarlyYearsOrLowerPrimary ? 'ME1' : 'ME1';
        const defPts = isEarlyYearsOrLowerPrimary ? 6 : 6;
        nextRows[s.id] = {
          marks: isEarlyYearsOrLowerPrimary ? null : 65,
          rubric: defRubric,
          points: defPts,
          comment: 'Demonstrates active learner participation and understanding.',
          hasError: false,
        };
      }
    });
    setRows(nextRows);
    setSaveStatus(null);
  }, [selectedExamId, selectedClassId, selectedSubjectId, students.length]);

  // Update Mark (computes Rubric & Points automatically)
  const handleMarkChange = (studentId: string, valStr: string) => {
    if (valStr === '') {
      setRows((prev) => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          marks: null,
          hasError: false,
          errorMessage: undefined,
        },
      }));
      return;
    }

    const marksNum = Number(valStr);
    if (isNaN(marksNum) || marksNum < 0 || marksNum > 100) {
      setRows((prev) => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          marks: marksNum,
          hasError: true,
          errorMessage: 'Mark must be between 0 and 100.',
        },
      }));
      return;
    }

    const autoRubric = markToRubric(marksNum);
    setRows((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        marks: marksNum,
        rubric: autoRubric.level,
        points: autoRubric.points,
        hasError: false,
        errorMessage: undefined,
      },
    }));
  };

  // Update Rubric (validates conflict with marks)
  const handleRubricChange = (studentId: string, level: RubricLevel) => {
    const currentRow = rows[studentId];
    const def = CBC_RUBRIC_DEFINITIONS[level];

    // Conflict check if mark exists
    const validation = validateMarksRubricConflict(currentRow.marks, level);

    setRows((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        rubric: level,
        points: def.points,
        hasError: !validation.valid,
        errorMessage: validation.error,
      },
    }));
  };

  const handleCommentChange = (studentId: string, comment: string) => {
    setRows((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        comment,
      },
    }));
  };

  // Save All
  const handleSaveAll = () => {
    // 1. Verify no conflict errors
    for (const [sid, r] of Object.entries(rows)) {
      if (r.hasError) {
        setSaveStatus({
          type: 'error',
          message: `Cannot save with rubric/mark conflict errors: ${r.errorMessage}`,
        });
        return;
      }
    }

    try {
      const gradesToSave = students.map((s) => {
        const r = rows[s.id];
        return {
          exam_id: selectedExamId,
          student_id: s.id,
          subject_id: selectedSubjectId,
          marks: r.marks,
          rubric_level: r.rubric,
          points: r.points,
          teacher_comment: r.comment,
          entered_by_teacher_id: currentUser?.id || 'admin',
        };
      });

      dbService.batchSaveGrades(schoolId, gradesToSave);
      setSaveStatus({
        type: 'success',
        message: `Successfully saved 8-level CBC grades for ${gradesToSave.length} learners.`,
      });
    } catch (err: any) {
      setSaveStatus({
        type: 'error',
        message: err.message || 'Failed to save grades.',
      });
    }
  };

  // Progress Count
  const enteredCount = students.filter((s) => {
    const g = existingGrades.find((grade) => grade.student_id === s.id);
    return Boolean(g);
  }).length;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <ListCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">8-Level CBC Score Entry</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Official KICD Assessment Framework: EE1 to BE2 rubric grading with live points & zero ranking
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
        >
          <Save className="w-4 h-4" />
          Save All Assessments
        </button>
      </div>

      {saveStatus && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            saveStatus.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {saveStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{saveStatus.message}</span>
        </div>
      )}

      {/* 3-Dropdown Selector Grid */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
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
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              const cls = classes.find((c) => c.id === e.target.value);
              const subs = dbService.getSubjects(schoolId, cls?.level_id);
              if (subs.length > 0) setSelectedSubjectId(subs[0].id);
            }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} - {c.stream}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Learning Area / Subject</label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Rubric Notice Banner */}
      <div className="p-3 bg-slate-900 text-white rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {isEarlyYearsOrLowerPrimary ? (
              <strong>PP1–Grade 3 Early Years Mode:</strong>
            ) : (
              <strong>Standard Marks & Rubric Sync:</strong>
            )}
            {' '}
            {isEarlyYearsOrLowerPrimary
              ? 'Marks are omitted by KICD guidelines. Select the competency rubric level directly.'
              : 'Enter marks (0-100) or choose rubric level. Any mismatch (e.g. 95% + EE2) triggers immediate validation error.'}
          </span>
        </div>
        <div className="text-[11px] text-slate-300 shrink-0">
          Progress: <strong className="text-white">{enteredCount} of {students.length}</strong> recorded
        </div>
      </div>

      {/* Score Entry Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-3 px-4">Adm No</th>
                <th className="py-3 px-4">Learner Full Name</th>
                {!isEarlyYearsOrLowerPrimary && (
                  <th className="py-3 px-4 w-28 text-center">Score (0–100%)</th>
                )}
                <th className="py-3 px-4 w-48">8-Level CBC Rubric</th>
                <th className="py-3 px-4 w-20 text-center">Points</th>
                <th className="py-3 px-4">Teacher Competency Narrative</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No learners found in this class stream.
                  </td>
                </tr>
              ) : (
                students.map((std, idx) => {
                  const row = rows[std.id] || {
                    marks: 65,
                    rubric: 'ME1',
                    points: 6,
                    comment: '',
                    hasError: false,
                  };

                  return (
                    <tr
                      key={std.id}
                      className={`hover:bg-slate-50/70 transition ${
                        row.hasError ? 'bg-rose-50/50' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {std.admission_number}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {std.full_name}
                      </td>

                      {/* Marks Column (Hidden for PP1 - G3) */}
                      {!isEarlyYearsOrLowerPrimary && (
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={row.marks !== null ? row.marks : ''}
                            onChange={(e) => handleMarkChange(std.id, e.target.value)}
                            className={`w-20 px-2 py-1.5 text-center font-bold rounded-lg border text-xs focus:outline-none focus:ring-2 ${
                              row.hasError
                                ? 'border-rose-500 bg-rose-50 text-rose-800 focus:ring-rose-400'
                                : 'border-slate-300 bg-slate-50 text-slate-900 focus:ring-emerald-500'
                            }`}
                          />
                        </td>
                      )}

                      {/* Rubric Dropdown */}
                      <td className="py-3 px-4">
                        <select
                          value={row.rubric}
                          onChange={(e) => handleRubricChange(std.id, e.target.value as RubricLevel)}
                          className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-bold focus:outline-none focus:ring-2 ${
                            row.hasError
                              ? 'border-rose-500 bg-rose-50 text-rose-800'
                              : 'border-slate-300 bg-white text-slate-900 focus:ring-emerald-500'
                          }`}
                        >
                          {RUBRIC_LEVEL_ORDER.map((code) => {
                            const def = CBC_RUBRIC_DEFINITIONS[code];
                            return (
                              <option key={code} value={code}>
                                {code} ({def.minMark}–{def.maxMark}% • {def.description})
                              </option>
                            );
                          })}
                        </select>
                        {row.hasError && (
                          <div className="text-[10px] text-rose-600 font-bold mt-1">
                            {row.errorMessage}
                          </div>
                        )}
                      </td>

                      {/* Points */}
                      <td className="py-3 px-4 text-center">
                        <span className="font-black text-xs px-2.5 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200">
                          {row.points} / 8
                        </span>
                      </td>

                      {/* Teacher Comment */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={row.comment}
                          onChange={(e) => handleCommentChange(std.id, e.target.value)}
                          placeholder="Specific competency feedback..."
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
