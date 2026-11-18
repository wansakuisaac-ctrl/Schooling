import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingDown, TrendingUp, Minus, BarChart3, Users } from 'lucide-react';
import { dbService } from '../../services/storage';
import { markToRubric, pointsToRubric } from '../../services/cbcRubric';
import { Exam, Grade, SchoolClass, Student } from '../../types';

interface ReportCardTrendsPanelProps {
  schoolId: string;
  selectedClass: SchoolClass | undefined;
  selectedExamId: string;
  exams: Exam[];
  students: Student[];
  selectedStudentId: string;
  onSelectStudentId: (studentId: string) => void;
}

type MetricMode = 'marks' | 'points';
type TimelineGranularity = 'term' | 'exam';

const TERM_ORDER: Record<string, number> = {
  'Term 1': 1,
  'Term 2': 2,
  'Term 3': 3,
};

const EXAM_TYPE_ORDER: Record<string, number> = {
  CAT: 1,
  Midterm: 2,
  Endterm: 3,
};

function sortExamsChronologically(exams: Exam[]): Exam[] {
  return [...exams].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    const tA = TERM_ORDER[a.term] ?? 99;
    const tB = TERM_ORDER[b.term] ?? 99;
    if (tA !== tB) return tA - tB;
    if (a.start_date && b.start_date && a.start_date !== b.start_date) {
      return a.start_date.localeCompare(b.start_date);
    }
    return (EXAM_TYPE_ORDER[a.exam_type] ?? 9) - (EXAM_TYPE_ORDER[b.exam_type] ?? 9);
  });
}

function computeMetricAverage(grades: Grade[], mode: MetricMode): number | null {
  if (grades.length === 0) return null;
  if (mode === 'marks') {
    const valid = grades.filter(
      (g) => typeof g.marks === 'number' && !Number.isNaN(g.marks)
    );
    if (valid.length === 0) return null;
    const sum = valid.reduce((acc, g) => acc + Number(g.marks), 0);
    return Number((sum / valid.length).toFixed(1));
  }
  const valid = grades.filter((g) => typeof g.points === 'number' && g.points > 0);
  if (valid.length === 0) return null;
  const sum = valid.reduce((acc, g) => acc + g.points, 0);
  return Number((sum / valid.length).toFixed(2));
}

export const ReportCardTrendsPanel: React.FC<ReportCardTrendsPanelProps> = ({
  schoolId,
  selectedClass,
  selectedExamId,
  exams,
  students,
  selectedStudentId,
  onSelectStudentId,
}) => {
  const [granularity, setGranularity] = useState<TimelineGranularity>('term');
  const [metricMode, setMetricMode] = useState<MetricMode>('marks');

  const orderedExams = useMemo(() => sortExamsChronologically(exams), [exams]);

  // All grades across all exams belonging to students currently in the selected class
  const classStudentIds = useMemo(
    () => new Set(students.map((s) => s.id)),
    [students]
  );

  const gradesByExamForClass = useMemo(() => {
    const map = new Map<string, Grade[]>();
    orderedExams.forEach((ex) => {
      const allExamGrades = dbService.getGrades(schoolId, ex.id);
      const classGrades = allExamGrades.filter((g) =>
        classStudentIds.has(g.student_id)
      );
      map.set(ex.id, classGrades);
    });
    return map;
  }, [orderedExams, schoolId, classStudentIds]);

  // Auto-switch metric mode to points if marks are completely absent (e.g. PP1–Grade 3)
  useEffect(() => {
    const allClassGrades = Array.from(gradesByExamForClass.values()).flat();
    if (allClassGrades.length === 0) return;
    const hasNumericMarks = allClassGrades.some(
      (g) => typeof g.marks === 'number' && !Number.isNaN(g.marks)
    );
    if (!hasNumericMarks) {
      setMetricMode('points');
    }
  }, [gradesByExamForClass]);

  const focusedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) || null,
    [students, selectedStudentId]
  );

  // Build multi-term or per-exam trend dataset
  const trendData = useMemo(() => {
    if (granularity === 'term') {
      const buckets = new Map<
        string,
        { label: string; year: number; term: string; exams: Exam[] }
      >();

      orderedExams.forEach((ex) => {
        const key = `${ex.year}-${ex.term}`;
        const existing = buckets.get(key);
        if (existing) {
          existing.exams.push(ex);
        } else {
          buckets.set(key, {
            label: `${ex.term} ${ex.year}`,
            year: ex.year,
            term: ex.term,
            exams: [ex],
          });
        }
      });

      return Array.from(buckets.values()).map((bucket) => {
        const termClassGrades = bucket.exams.flatMap(
          (ex) => gradesByExamForClass.get(ex.id) || []
        );
        const termLearnerGrades = focusedStudent
          ? termClassGrades.filter((g) => g.student_id === focusedStudent.id)
          : [];

        const classAvg = computeMetricAverage(termClassGrades, metricMode);
        const learnerAvg = focusedStudent
          ? computeMetricAverage(termLearnerGrades, metricMode)
          : null;

        return {
          label: bucket.label,
          examNames: bucket.exams.map((e) => e.name).join(', '),
          classAverage: classAvg,
          learnerScore: learnerAvg,
          classEntries: termClassGrades.length,
          learnerEntries: termLearnerGrades.length,
        };
      });
    }

    return orderedExams.map((ex) => {
      const examClassGrades = gradesByExamForClass.get(ex.id) || [];
      const examLearnerGrades = focusedStudent
        ? examClassGrades.filter((g) => g.student_id === focusedStudent.id)
        : [];

      return {
        label: `${ex.name.replace(/Assessment|Evaluation|Examination/gi, '').trim()} (${ex.term})`,
        examNames: `${ex.name} · ${ex.term} ${ex.year}`,
        classAverage: computeMetricAverage(examClassGrades, metricMode),
        learnerScore: focusedStudent
          ? computeMetricAverage(examLearnerGrades, metricMode)
          : null,
        classEntries: examClassGrades.length,
        learnerEntries: examLearnerGrades.length,
      };
    });
  }, [granularity, orderedExams, gradesByExamForClass, focusedStudent, metricMode]);

  // Subject comparison for the currently selected exam
  const subjectBreakdownData = useMemo(() => {
    if (!selectedExamId) return [];
    const examClassGrades = gradesByExamForClass.get(selectedExamId) || [];
    const levelId = focusedStudent?.level_id || selectedClass?.level_id;
    const subjects = dbService.getSubjects(schoolId, levelId);

    return subjects
      .map((sub) => {
        const subClassGrades = examClassGrades.filter(
          (g) => g.subject_id === sub.id
        );
        const subLearnerGrades = focusedStudent
          ? subClassGrades.filter((g) => g.student_id === focusedStudent.id)
          : [];

        const classAvg = computeMetricAverage(subClassGrades, metricMode);
        const learnerScore = focusedStudent
          ? computeMetricAverage(subLearnerGrades, metricMode)
          : null;

        return {
          code: sub.code || sub.name.slice(0, 5).toUpperCase(),
          subjectName: sub.name,
          classAverage: classAvg,
          learnerScore,
        };
      })
      .filter((row) => row.classAverage !== null || row.learnerScore !== null);
  }, [
    selectedExamId,
    gradesByExamForClass,
    focusedStudent,
    selectedClass?.level_id,
    schoolId,
    metricMode,
  ]);

  // Summary KPIs
  const assessedPoints = useMemo(() => {
    const withClass = trendData.filter((d) => d.classAverage !== null);
    const withLearner = trendData.filter((d) => d.learnerScore !== null);

    const overallClassMean =
      withClass.length > 0
        ? Number(
            (
              withClass.reduce((sum, d) => sum + (d.classAverage || 0), 0) /
              withClass.length
            ).toFixed(metricMode === 'marks' ? 1 : 2)
          )
        : null;

    const overallLearnerMean =
      withLearner.length > 0
        ? Number(
            (
              withLearner.reduce((sum, d) => sum + (d.learnerScore || 0), 0) /
              withLearner.length
            ).toFixed(metricMode === 'marks' ? 1 : 2)
          )
        : null;

    const deltaSeries = focusedStudent ? withLearner : withClass;
    const firstVal =
      deltaSeries.length >= 2
        ? focusedStudent
          ? deltaSeries[0].learnerScore
          : deltaSeries[0].classAverage
        : null;
    const lastVal =
      deltaSeries.length >= 2
        ? focusedStudent
          ? deltaSeries[deltaSeries.length - 1].learnerScore
          : deltaSeries[deltaSeries.length - 1].classAverage
        : null;

    const delta =
      firstVal !== null && lastVal !== null
        ? Number((lastVal - firstVal).toFixed(metricMode === 'marks' ? 1 : 2))
        : null;

    return {
      assessedPeriods: withClass.length,
      totalPeriods: trendData.length,
      overallClassMean,
      overallLearnerMean,
      delta,
      hasAnyGrades: withClass.length > 0,
    };
  }, [trendData, focusedStudent, metricMode]);

  const unitSuffix = metricMode === 'marks' ? '%' : ' pts';
  const yDomain: [number, number] = metricMode === 'marks' ? [0, 100] : [0, 8];

  const getRubricBadgeText = (value: number | null): string => {
    if (value === null) return 'No scores recorded';
    const def = metricMode === 'marks' ? markToRubric(value) : pointsToRubric(value);
    return `${def.level} · ${def.description}`;
  };

  return (
    <section
      aria-label="Academic Performance Trends"
      className="no-print bg-white rounded-2xl border border-slate-200 overflow-hidden"
    >
      {/* Panel Header & Interactive Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-700 shrink-0" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              Multi-Term Performance Trends
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Track individual learner progression against {selectedClass ? `${selectedClass.name} ${selectedClass.stream}` : 'class'} stream averages across terms and assessments
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Learner Selector */}
          <div className="flex items-center gap-1.5 min-w-[200px]">
            <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              aria-label="Select learner for trend comparison"
              value={selectedStudentId}
              onChange={(e) => onSelectStudentId(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 min-h-[36px]"
            >
              <option value="">Class Average Overview Only</option>
              {students.map((std) => (
                <option key={std.id} value={std.id}>
                  {std.full_name} ({std.admission_number})
                </option>
              ))}
            </select>
          </div>

          {/* Granularity Segmented Control */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setGranularity('term')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                granularity === 'term'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Across Terms
            </button>
            <button
              type="button"
              onClick={() => setGranularity('exam')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                granularity === 'exam'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              By Assessment
            </button>
          </div>

          {/* Metric Segmented Control */}
          <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setMetricMode('marks')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                metricMode === 'marks'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Score (%)
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('points')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                metricMode === 'points'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              CBC Points
            </button>
          </div>
        </div>
      </div>

      {/* KPI Strip with hairline dividers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 border-b border-slate-200 bg-slate-50/50">
        <div className="p-4">
          <div className="text-xs text-slate-500 font-medium">
            {focusedStudent ? focusedStudent.full_name : 'Learner Focus'}
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {focusedStudent
              ? assessedPoints.overallLearnerMean !== null
                ? `${assessedPoints.overallLearnerMean}${unitSuffix}`
                : '—'
              : 'Class View'}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-0.5 truncate">
            {focusedStudent
              ? getRubricBadgeText(assessedPoints.overallLearnerMean)
              : 'Pick a learner to compare'}
          </div>
        </div>

        <div className="p-4">
          <div className="text-xs text-slate-500 font-medium">
            Class Stream Average
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {assessedPoints.overallClassMean !== null
              ? `${assessedPoints.overallClassMean}${unitSuffix}`
              : '—'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
            {getRubricBadgeText(assessedPoints.overallClassMean)}
          </div>
        </div>

        <div className="p-4">
          <div className="text-xs text-slate-500 font-medium">
            Multi-Term Change
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={`text-xl font-bold font-mono tabular-nums ${
                assessedPoints.delta === null
                  ? 'text-slate-400'
                  : assessedPoints.delta > 0
                  ? 'text-emerald-700'
                  : assessedPoints.delta < 0
                  ? 'text-rose-700'
                  : 'text-slate-700'
              }`}
            >
              {assessedPoints.delta === null
                ? '—'
                : `${assessedPoints.delta > 0 ? '+' : ''}${assessedPoints.delta}${unitSuffix}`}
            </span>
            {assessedPoints.delta !== null &&
              (assessedPoints.delta > 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-700 shrink-0" />
              ) : assessedPoints.delta < 0 ? (
                <TrendingDown className="w-4 h-4 text-rose-700 shrink-0" />
              ) : (
                <Minus className="w-4 h-4 text-slate-500 shrink-0" />
              ))}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {assessedPoints.delta === null
              ? 'Requires 2+ assessed periods'
              : assessedPoints.delta > 0
              ? 'Improving trajectory'
              : assessedPoints.delta < 0
              ? 'Declining · review support'
              : 'Steady across periods'}
          </div>
        </div>

        <div className="p-4">
          <div className="text-xs text-slate-500 font-medium">
            Periods Visualized
          </div>
          <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {assessedPoints.assessedPeriods} / {assessedPoints.totalPeriods}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {granularity === 'term' ? 'Academic terms with grades' : 'Exams with grades'}
          </div>
        </div>
      </div>

      {/* Charts or Empty State */}
      {!assessedPoints.hasAnyGrades ? (
        <div className="p-8 text-center space-y-2">
          <BarChart3 className="w-8 h-8 text-slate-300 mx-auto" />
          <div className="text-sm font-semibold text-slate-800">
            No Graded Assessments Across Terms Yet
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            Once marks or CBC rubrics are entered for learners in {selectedClass ? `${selectedClass.name} ${selectedClass.stream}` : 'this class'} across Term 1, Term 2, or Term 3, multi-term learner and class progress charts will render here automatically.
          </p>
        </div>
      ) : (
        <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Multi-Term Line Chart */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-800">
                  {granularity === 'term'
                    ? 'Term-by-Term Progress Trajectory'
                    : 'Exam-by-Exam Progress Trajectory'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {focusedStudent
                    ? `${focusedStudent.full_name} compared against ${selectedClass?.name || ''} ${selectedClass?.stream || ''} average`
                    : `Mean ${metricMode === 'marks' ? 'percentage score' : 'CBC rubric points'} across assessments`}
                </p>
              </div>
              {assessedPoints.assessedPeriods === 1 && (
                <span className="text-[11px] text-slate-500 font-medium">
                  1 period recorded so far
                </span>
              )}
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trendData}
                  margin={{ top: 8, right: 16, left: -12, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={yDomain}
                    tick={{ fontSize: 11, fill: '#475569' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `${val}${metricMode === 'marks' ? '%' : ''}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                    formatter={(value, name) => [
                      value !== null && value !== undefined
                        ? `${value}${unitSuffix}`
                        : 'No data',
                      String(name ?? ''),
                    ]}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="classAverage"
                    name="Class Average"
                    stroke="#475569"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={{ r: 4, fill: '#475569', strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                  {focusedStudent && (
                    <Line
                      type="monotone"
                      dataKey="learnerScore"
                      name={focusedStudent.full_name}
                      stroke="#047857"
                      strokeWidth={2.75}
                      dot={{ r: 5, fill: '#047857', stroke: '#ffffff', strokeWidth: 2 }}
                      activeDot={{ r: 7 }}
                      connectNulls
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Learning Area / Subject Breakdown Bar Chart */}
          <div className="lg:col-span-5 lg:border-l lg:border-slate-200 lg:pl-6 space-y-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800">
                Learning Area Comparison (Selected Exam)
              </h3>
              <p className="text-[11px] text-slate-500">
                {exams.find((e) => e.id === selectedExamId)?.name || 'Active Exam'} subject performance
              </p>
            </div>

            {subjectBreakdownData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-center px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <p className="text-xs text-slate-500">
                  No subject scores entered yet for the currently selected exam. Switch assessments above to inspect subject breakdowns.
                </p>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={subjectBreakdownData}
                    margin={{ top: 8, right: 8, left: -12, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis
                      dataKey="code"
                      tick={{ fontSize: 10, fill: '#475569' }}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={yDomain}
                      tick={{ fontSize: 11, fill: '#475569' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                      labelFormatter={(label, payload) => {
                        const first = payload?.[0]?.payload as
                          | { subjectName?: string }
                          | undefined;
                        return first?.subjectName || String(label);
                      }}
                      formatter={(value, name) => [
                        value !== null && value !== undefined
                          ? `${value}${unitSuffix}`
                          : 'No data',
                        String(name ?? ''),
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                    />
                    <Bar
                      dataKey="classAverage"
                      name="Class Avg"
                      fill="#94a3b8"
                      radius={[4, 4, 0, 0]}
                    />
                    {focusedStudent && (
                      <Bar
                        dataKey="learnerScore"
                        name="Learner"
                        fill="#047857"
                        radius={[4, 4, 0, 0]}
                      />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
