import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import { CBC_RUBRIC_DEFINITIONS, RUBRIC_LEVEL_ORDER } from '../../services/cbcRubric';
import { RubricLevel } from '../../types';
import { FileText, Save, CheckCircle2, Plus, Sparkles, BookOpen } from 'lucide-react';

export const FormativeAssessments: React.FC = () => {
  const { currentSchool, currentUser } = useAuth();
  if (!currentSchool) return null;
  const schoolId = currentSchool.id;

  const classes = dbService.getClasses(schoolId);
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const subjects = dbService.getSubjects(schoolId, selectedClass?.level_id);
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || '');

  const [strand, setStrand] = useState('Critical Problem Solving & Scientific Inquiry');
  const [subStrand, setSubStrand] = useState('Application of scientific investigation tools in everyday life');
  const [assessmentDate, setAssessmentDate] = useState('2026-03-05');

  const students = dbService.getStudents(schoolId, { classId: selectedClassId });
  const [rubrics, setRubrics] = useState<Record<string, { level: RubricLevel; comment: string }>>(() => {
    const init: Record<string, { level: RubricLevel; comment: string }> = {};
    students.forEach((s) => {
      init[s.id] = {
        level: 'ME1',
        comment: 'Learner exhibits self-efficacy and active participation.',
      };
    });
    return init;
  });

  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleSave = () => {
    students.forEach((s) => {
      const item = rubrics[s.id] || { level: 'ME1', comment: '' };
      const def = CBC_RUBRIC_DEFINITIONS[item.level];
      dbService.createFormativeAssessment(schoolId, {
        student_id: s.id,
        subject_id: selectedSubjectId,
        strand,
        sub_strand: subStrand,
        rubric_level: item.level,
        points: def.points,
        assessed_by_teacher_id: currentUser?.id || 'admin',
        assessment_date: assessmentDate,
        comment: item.comment,
      });
    });

    setStatusMsg(`Formative assessment for ${students.length} learners recorded successfully.`);
    setTimeout(() => setStatusMsg(null), 4000);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-100 text-teal-800">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Formative Continuous Assessments (CBA)</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Strand and sub-strand continuous assessment records feeding CBC Learner Progress Portfolios
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
        >
          <Save className="w-4 h-4" />
          Save Formative Record
        </button>
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Selectors */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block font-bold text-slate-700 mb-1">Class</label>
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              const cls = classes.find((c) => c.id === e.target.value);
              const subs = dbService.getSubjects(schoolId, cls?.level_id);
              if (subs.length > 0) setSelectedSubjectId(subs[0].id);
            }}
            className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} - {c.stream}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Learning Area</label>
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Curriculum Strand</label>
          <input
            type="text"
            value={strand}
            onChange={(e) => setStrand(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Assessment Date</label>
          <input
            type="date"
            value={assessmentDate}
            onChange={(e) => setAssessmentDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
          />
        </div>
      </div>

      <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <label className="block font-bold text-slate-700 mb-1">Specific Sub-Strand Learning Outcome</label>
        <input
          type="text"
          value={subStrand}
          onChange={(e) => setSubStrand(e.target.value)}
          placeholder="e.g. Demonstration of safe chemical handling in laboratory experiments"
          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
        />
      </div>

      {/* Learners Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
            <tr>
              <th className="py-3 px-4">Adm No</th>
              <th className="py-3 px-4">Learner Name</th>
              <th className="py-3 px-4 w-56">Rubric Level Attained</th>
              <th className="py-3 px-4">Teacher Formative Commentary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {students.map((std) => {
              const current = rubrics[std.id] || { level: 'ME1', comment: '' };
              return (
                <tr key={std.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{std.admission_number}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{std.full_name}</td>
                  <td className="py-3 px-4">
                    <select
                      value={current.level}
                      onChange={(e) => {
                        const lvl = e.target.value as RubricLevel;
                        setRubrics((prev) => ({
                          ...prev,
                          [std.id]: { ...prev[std.id], level: lvl },
                        }));
                      }}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white"
                    >
                      {RUBRIC_LEVEL_ORDER.map((code) => {
                        const def = CBC_RUBRIC_DEFINITIONS[code];
                        return (
                          <option key={code} value={code}>
                            {code} ({def.description})
                          </option>
                        );
                      })}
                    </select>
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="text"
                      value={current.comment}
                      onChange={(e) => {
                        const comment = e.target.value;
                        setRubrics((prev) => ({
                          ...prev,
                          [std.id]: { ...prev[std.id], comment },
                        }));
                      }}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg"
                      placeholder="Comment on learner autonomy & competence..."
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
