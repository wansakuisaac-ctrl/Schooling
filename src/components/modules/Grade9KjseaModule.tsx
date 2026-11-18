import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import { computeKjseaPlacementScore, recommendPathway } from '../../services/cbcRubric';
import { ExcelExportService } from '../../services/excelExport';
import {
  Award,
  Download,
  Calculator,
  Save,
  CheckCircle2,
  Info,
  Printer,
  Compass,
  Sparkles,
} from 'lucide-react';
import { PathwayPreference } from '../../types';

export const Grade9KjseaModule: React.FC = () => {
  const { currentSchool, currentUser } = useAuth();
  if (!currentSchool) return null;
  const schoolId = currentSchool.id;

  const levels = dbService.getLevels(schoolId);
  const classes = dbService.getClasses(schoolId);

  // Find Grade 9 level and classes
  const g9Level = levels.find((l) => l.name === 'Grade 9');
  const g9Classes = classes.filter((c) => c.level_id === g9Level?.id);

  const [selectedClassId, setSelectedClassId] = useState<string>(g9Classes[0]?.id || classes[0]?.id || '');
  const students = dbService.getStudents(schoolId, { classId: selectedClassId });
  const allProjectScores = dbService.getProjectScores(schoolId);

  // Subject codes required by KNEC CBA for Grade 9 projects:
  // 911 Creative Arts, 912 Pre-Technical, 906 Agriculture
  const PROJECT_SUBJECTS = [
    { code: '911', name: 'Creative Arts & Sports Project', short: 'Creative Arts' },
    { code: '912', name: 'Pre-Technical & Pre-Career Project', short: 'Pre-Technical' },
    { code: '906', name: 'Agriculture & Nutrition Fieldwork', short: 'Agriculture' },
  ];

  // Grid score state: studentId -> { [subjectCode]: score }
  const [scoresState, setScoresState] = useState<Record<string, Record<string, number>>>(() => {
    const init: Record<string, Record<string, number>> = {};
    students.forEach((s) => {
      init[s.id] = {};
      PROJECT_SUBJECTS.forEach((sub) => {
        const match = allProjectScores.find((ps) => ps.student_id === s.id && ps.subject_code === sub.code);
        init[s.id][sub.code] = match ? match.project_score : 85;
      });
    });
    return init;
  });

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleScoreChange = (studentId: string, code: string, val: number) => {
    const clamped = Math.max(0, Math.min(100, isNaN(val) ? 0 : val));
    setScoresState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [code]: clamped,
      },
    }));
  };

  const handleSaveScores = () => {
    students.forEach((s) => {
      PROJECT_SUBJECTS.forEach((sub) => {
        const val = scoresState[s.id]?.[sub.code] ?? 80;
        dbService.saveProjectScore(schoolId, {
          student_id: s.id,
          subject_code: sub.code,
          project_score: val,
          uploaded_by: currentUser?.full_name || 'TSC/KNEC_LEAD',
        });
      });
    });

    setStatusMsg({
      type: 'success',
      text: 'Grade 9 Project scores saved successfully.',
    });
  };

  // Compute Senior School Placement:
  // placement_score = (kjsea_points / 8 * 60) + (sba_score * 20 / 100) + (kpsea_score * 20 / 100)
  const handleComputePlacement = () => {
    let computedCount = 0;

    students.forEach((s) => {
      // Calculate student's average points across projects
      const scores = PROJECT_SUBJECTS.map((sub) => scoresState[s.id]?.[sub.code] ?? 80);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      // Convert average score to points (out of 8)
      const points = (avgScore / 100) * 8;

      const placementScore = computeKjseaPlacementScore(points, s.sba_score || 80, s.kpsea_score || 80);

      dbService.updateStudent(schoolId, s.id, {
        placement_score: placementScore,
      });

      computedCount++;
    });

    setStatusMsg({
      type: 'success',
      text: `Computed Senior School placement scores for ${computedCount} Grade 9 learners. (Audited: Never rendered as a grade on standard report cards).`,
    });
  };

  const handleUpdatePathway = (studentId: string, pathway: PathwayPreference) => {
    dbService.updateStudent(schoolId, studentId, { pathway_preference: pathway });
  };

  const handleExportKnec = () => {
    const currentScores = dbService.getProjectScores(schoolId);
    ExcelExportService.exportKnecCbaScores(currentScores, students);
  };

  const handlePrintBroadsheet = () => {
    window.print();
  };

  // Pathways distribution
  const pathwayCounts = students.reduce(
    (acc, std) => {
      const p = std.pathway_preference || 'STEM';
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    },
    { STEM: 0, SocialSciences: 0, Arts: 0, Sports: 0 } as Record<string, number>
  );

  const selectedClass = classes.find((c) => c.id === selectedClassId);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Print-specific style */}
      <style>
        {`
          @media print {
            body {
              background: #ffffff !important;
              color: #000000 !important;
              font-size: 10pt !important;
            }
            header, nav, aside, .no-print, button, input[type="file"] {
              display: none !important;
            }
            .print-only {
              display: block !important;
            }
            .print-container {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .page-break {
              page-break-after: always;
            }
          }
        `}
      </style>

      {/* Official Print Header */}
      <div className="hidden print-only mb-6 border-b-2 border-slate-900 pb-4 text-center">
        <h1 className="text-xl font-black uppercase tracking-wider">{currentSchool.name}</h1>
        <p className="text-xs text-slate-600">{currentSchool.address} • Tel: {currentSchool.phone}</p>
        <div className="mt-2 text-sm font-bold text-slate-900 uppercase">
          KNEC CBA GRADE 9 KJSEA PROJECT &amp; SENIOR SECONDARY PLACEMENT DOSSIER
        </div>
        <p className="text-xs text-slate-500">
          Stream: {selectedClass?.name} - {selectedClass?.stream} | Academic Year: {currentSchool.academic_year} | Term: {currentSchool.current_term}
        </p>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Award className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Grade 9 KJSEA &amp; Senior School Pathways
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            KNEC CBA project score upload (911, 912, 906) &amp; placement engine (60% KJSEA + 20% SBA + 20% KPSEA)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePrintBroadsheet}
            className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-xs"
            title="Print Official Placement Broadsheet"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            Print Broadsheet
          </button>
          <button
            onClick={handleExportKnec}
            className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-xs"
            title="Download KNEC CBA Portal Format"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            Export KNEC File
          </button>
          <button
            onClick={handleComputePlacement}
            className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Calculator className="w-4 h-4" />
            Compute Placements
          </button>
          <button
            onClick={handleSaveScores}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Save className="w-4 h-4" />
            Save Scores
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 no-print ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Safety Notice */}
      <div className="p-3 bg-slate-900 text-white rounded-xl text-xs flex items-center gap-2 no-print">
        <Info className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          <strong>Ministry Compliance Notice:</strong> Placement scores are reserved strictly for Senior Secondary School transition algorithms (STEM, Social Sciences, Arts &amp; Sports). In strict compliance with Kenyan CBC, placement scores are never displayed as a ranking or grade on parent report cards.
        </span>
      </div>

      {/* Pathway Breakdown Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">STEM Pathway</span>
            <Compass className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-blue-950 mt-1">{pathwayCounts.STEM || 0}</div>
          <div className="text-[10px] text-blue-600 mt-0.5">Pure &amp; Applied Sciences</div>
        </div>

        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Social Sciences</span>
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-amber-950 mt-1">{pathwayCounts.SocialSciences || 0}</div>
          <div className="text-[10px] text-amber-600 mt-0.5">Humanities &amp; Business</div>
        </div>

        <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl">
          <div className="flex items-center justify-between text-purple-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Arts &amp; Sports</span>
            <Award className="w-4 h-4" />
          </div>
          <div className="text-xl font-black text-purple-950 mt-1">{(pathwayCounts.Arts || 0) + (pathwayCounts.Sports || 0)}</div>
          <div className="text-[10px] text-purple-600 mt-0.5">Creative Music &amp; Athletics</div>
        </div>

        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Enrolled Cohort</span>
            <span className="text-xs font-black">G9</span>
          </div>
          <div className="text-xl font-black text-emerald-950 mt-1">{students.length}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Learners in this stream</div>
        </div>
      </div>

      {/* Stream Selector */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs no-print">
        <div className="flex items-center gap-3">
          <span className="font-bold text-slate-700">Select Grade 9 Stream:</span>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border rounded-lg font-bold text-slate-800"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} - {c.stream}
              </option>
            ))}
          </select>
        </div>
        <div className="text-[11px] text-slate-500">
          Showing <strong>{students.length}</strong> registered Grade 9 learners
        </div>
      </div>

      {/* Responsive Presentation: Desktop Table */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
            <tr>
              <th className="py-3 px-4">Adm No</th>
              <th className="py-3 px-4">Learner Name</th>
              <th className="py-3 px-4 text-center">911 Creative Arts (0–100)</th>
              <th className="py-3 px-4 text-center">912 Pre-Technical (0–100)</th>
              <th className="py-3 px-4 text-center">906 Agriculture (0–100)</th>
              <th className="py-3 px-4 text-center">Placement Score</th>
              <th className="py-3 px-4">Career Pathway Preference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {students.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No Grade 9 learners enrolled in this stream.
                </td>
              </tr>
            ) : (
              students.map((std) => {
                const sScores = scoresState[std.id] || {};
                const rec = recommendPathway(std.placement_score || 75, std.pathway_preference);

                return (
                  <tr key={std.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {std.admission_number}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{std.full_name}</div>
                      <div className="text-[10px] font-mono text-slate-400">UPI: {std.upi || 'N/A'}</div>
                    </td>

                    {/* 911 Creative Arts */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={sScores['911'] ?? ''}
                        onChange={(e) => handleScoreChange(std.id, '911', Number(e.target.value))}
                        className="w-16 px-2 py-1 text-center font-bold bg-slate-50 border rounded text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>

                    {/* 912 Pre-Tech */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={sScores['912'] ?? ''}
                        onChange={(e) => handleScoreChange(std.id, '912', Number(e.target.value))}
                        className="w-16 px-2 py-1 text-center font-bold bg-slate-50 border rounded text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>

                    {/* 906 Agriculture */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={sScores['906'] ?? ''}
                        onChange={(e) => handleScoreChange(std.id, '906', Number(e.target.value))}
                        className="w-16 px-2 py-1 text-center font-bold bg-slate-50 border rounded text-xs focus:bg-white focus:ring-1 focus:ring-emerald-500"
                      />
                    </td>

                    {/* Placement Score */}
                    <td className="py-3 px-4 text-center">
                      <span className="font-black text-xs px-2.5 py-1 rounded bg-indigo-50 text-indigo-900 border border-indigo-200">
                        {std.placement_score ? `${std.placement_score} / 100` : 'Pending'}
                      </span>
                    </td>

                    {/* Pathway Preference */}
                    <td className="py-3 px-4">
                      <select
                        value={std.pathway_preference || 'STEM'}
                        onChange={(e) => handleUpdatePathway(std.id, e.target.value as PathwayPreference)}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-bold text-emerald-800"
                      >
                        <option value="STEM">STEM (Pure &amp; Applied)</option>
                        <option value="SocialSciences">Social Sciences &amp; Humanities</option>
                        <option value="Arts">Arts &amp; Creative Music</option>
                        <option value="Sports">Sports Science &amp; Athletics</option>
                      </select>
                      {rec && (
                        <div className="text-[10px] text-slate-500 mt-1">
                          Fit: <span className="font-semibold text-slate-700">{rec.recommended}</span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Responsive Presentation: Mobile Card-Based View (< 768px) */}
      <div className="md:hidden space-y-4 no-print">
        {students.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
            No Grade 9 learners enrolled in this stream.
          </div>
        ) : (
          students.map((std) => {
            const sScores = scoresState[std.id] || {};
            const rec = recommendPathway(std.placement_score || 75, std.pathway_preference);

            return (
              <div
                key={std.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3.5"
              >
                {/* Learner info row */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">{std.full_name}</h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span className="font-mono font-bold text-slate-700">Adm: {std.admission_number}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-400">UPI: {std.upi || 'N/A'}</span>
                    </div>
                  </div>
                  <span className="shrink-0 font-black text-xs px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-200">
                    {std.placement_score ? `${std.placement_score} / 100` : 'Pending'}
                  </span>
                </div>

                {/* Subject project scores */}
                <div className="space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    KNEC CBA Projects (0–100)
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {PROJECT_SUBJECTS.map((sub) => (
                      <div key={sub.code} className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-center">
                        <div className="text-[10px] font-bold text-slate-600 truncate mb-1" title={sub.name}>
                          {sub.short}
                        </div>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={sScores[sub.code] ?? ''}
                          onChange={(e) => handleScoreChange(std.id, sub.code, Number(e.target.value))}
                          className="w-full h-10 px-2 text-center font-black text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pathway Preference */}
                <div className="pt-1 border-t border-slate-100">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Senior School Pathway Preference:
                  </label>
                  <select
                    value={std.pathway_preference || 'STEM'}
                    onChange={(e) => handleUpdatePathway(std.id, e.target.value as PathwayPreference)}
                    className="w-full min-h-[44px] px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-emerald-900"
                  >
                    <option value="STEM">STEM (Pure &amp; Applied Sciences)</option>
                    <option value="SocialSciences">Social Sciences &amp; Humanities</option>
                    <option value="Arts">Arts &amp; Creative Music</option>
                    <option value="Sports">Sports Science &amp; Athletics</option>
                  </select>
                  {rec && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>Recommended fit: <strong className="text-slate-800">{rec.recommended}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Official Sign-off block for print */}
      <div className="hidden print-only pt-8 grid grid-cols-2 gap-8 text-xs border-t border-slate-400 mt-8">
        <div>
          <div className="font-bold">KNEC CBA School Assessment Coordinator:</div>
          <div className="border-b border-slate-400 w-48 my-3"></div>
          <div className="text-slate-500">Signature &amp; TSC No.</div>
        </div>
        <div className="text-right">
          <div className="font-bold">Head of Institution / Principal:</div>
          <div className="border-b border-slate-400 w-48 ml-auto my-3"></div>
          <div className="text-slate-500">Official Signature &amp; School Stamp</div>
        </div>
      </div>
    </div>
  );
};
