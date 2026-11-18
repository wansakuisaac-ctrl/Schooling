import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useViewMode } from '../../context/ViewModeContext';
import { dbService } from '../../services/storage';
import { SyncService } from '../../services/syncService';
import { ExcelExportService } from '../../services/excelExport';
import { exportAttendanceCsv, exportAttendancePdf } from '../../lib/export';
import { AttendanceStatus } from '../../types';
import {
  CalendarCheck,
  Download,
  Save,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
  Smartphone,
  Monitor,
  User,
  FileSpreadsheet,
  FileText,
  ChevronDown,
} from 'lucide-react';

export const AttendanceModule: React.FC = () => {
  const { currentSchool, currentUser, currentRole } = useAuth();
  const { effectiveIsMobile } = useViewMode();
  if (!currentSchool) return null;
  const schoolId = currentSchool.id;

  const classes = dbService.getClasses(schoolId);
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>('2026-03-02');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<'cards' | 'table' | 'auto'>('auto');

  const showCards = layoutMode === 'cards' || (layoutMode === 'auto' && effectiveIsMobile);

  const students = dbService.getStudents(schoolId, { classId: selectedClassId });
  const existingAttendance = dbService.getAttendance(schoolId, selectedClassId, selectedDate);

  // Map state for live editing
  const [attendanceState, setAttendanceState] = useState<Record<string, { status: AttendanceStatus; remarks: string }>>(() => {
    const initial: Record<string, { status: AttendanceStatus; remarks: string }> = {};
    students.forEach((s) => {
      const match = existingAttendance.find((a) => a.student_id === s.id);
      initial[s.id] = {
        status: match ? match.status : 'present',
        remarks: match?.remarks || '',
      };
    });
    return initial;
  });

  useEffect(() => {
    if (!selectedClassId && classes[0]?.id) {
      setSelectedClassId(classes[0].id);
      return;
    }
    const next: Record<string, { status: AttendanceStatus; remarks: string }> = {};
    students.forEach((s) => {
      const match = existingAttendance.find((a) => a.student_id === s.id);
      next[s.id] = {
        status: match ? match.status : 'present',
        remarks: match?.remarks || '',
      };
    });
    setAttendanceState(next);
  }, [schoolId, selectedClassId, selectedDate, students.length, existingAttendance.length]);

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status,
      },
    }));
  };

  const handleRemarksChange = (studentId: string, remarks: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    const next: Record<string, { status: AttendanceStatus; remarks: string }> = {};
    students.forEach((s) => {
      next[s.id] = {
        status,
        remarks: attendanceState[s.id]?.remarks || '',
      };
    });
    setAttendanceState(next);
  };

  const handleSaveAttendance = () => {
    const records = students.map((s) => ({
      student_id: s.id,
      date: selectedDate,
      status: attendanceState[s.id]?.status || 'present',
      remarks: attendanceState[s.id]?.remarks || '',
    }));

    dbService.recordBulkAttendance(schoolId, records, currentUser?.id || 'admin');
    void SyncService.cacheAttendance(schoolId, dbService.getAttendance(schoolId));
    setSuccessMsg(`Attendance for ${records.length} learners saved successfully for ${selectedDate}.`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const [isExportOpen, setIsExportOpen] = useState(false);
  const selectedClass = classes.find((c) => c.id === selectedClassId);

  // Stats for the active sheet
  const total = students.length;
  const present = Object.values(attendanceState).filter((v) => v.status === 'present').length;
  const late = Object.values(attendanceState).filter((v) => v.status === 'late').length;
  const absent = Object.values(attendanceState).filter((v) => v.status === 'absent').length;
  const presentRate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  const currentRecordsForExport = students.map((s) => ({
    student: s,
    status: attendanceState[s.id]?.status || 'present',
    remarks: attendanceState[s.id]?.remarks || '',
  }));

  const handleExportCsv = () => {
    exportAttendanceCsv(
      currentSchool,
      currentRecordsForExport,
      selectedClass,
      selectedDate,
      { total, present, late, absent, presentRate }
    );
    setIsExportOpen(false);
    setSuccessMsg(`Exported roll-call for ${selectedClass ? selectedClass.name : 'Stream'} (${selectedDate}) to CSV.`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleExportPdf = () => {
    exportAttendancePdf(
      currentSchool,
      currentRecordsForExport,
      selectedClass,
      selectedDate,
      { total, present, late, absent, presentRate }
    );
    setIsExportOpen(false);
    setSuccessMsg(`Generated official printable attendance register PDF.`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleExportExcelAll = () => {
    const allRecords = dbService.getAttendance(schoolId, selectedClassId || undefined);
    const allStudents = dbService.getStudents(schoolId);
    ExcelExportService.exportAttendance(allRecords, allStudents, classes, selectedDate);
    setIsExportOpen(false);
    setSuccessMsg(`Exported workbook to Excel.`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <CalendarCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Learner Daily Attendance</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Roll-call register with Present, Late, and Absent tracking and Excel export
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Card / Table Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setLayoutMode('cards')}
              className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 font-bold transition min-h-[36px] ${
                showCards
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Card View (Mobile roll-call friendly)"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('table')}
              className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 font-bold transition min-h-[36px] ${
                !showCards
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Table View (Desktop sheet)"
            >
              <Monitor className="w-3.5 h-3.5 text-slate-600" />
              <span>Table</span>
            </button>
          </div>

          {/* Bulk Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-xs min-h-[36px]"
              title="Bulk Export filtered attendance view directly to CSV or PDF"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span>Bulk Export</span>
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-mono font-bold">
                {students.length}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExportOpen ? 'rotate-180' : ''}`} />
            </button>

            {isExportOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsExportOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 z-30 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 w-64 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Export Roll-Call ({selectedDate})
                    </div>
                    <div className="text-[11px] font-semibold text-slate-700 truncate mt-0.5">
                      {selectedClass ? `${selectedClass.name} - ${selectedClass.stream}` : 'All Streams'} ({students.length} learners)
                    </div>
                  </div>

                  <button
                    onClick={handleExportCsv}
                    className="w-full text-left px-3 py-2.5 hover:bg-emerald-50 text-slate-800 font-semibold flex items-center gap-2.5 transition min-h-[40px]"
                  >
                    <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                      <FileSpreadsheet className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">Export Roll-Call to CSV</div>
                      <div className="text-[10px] text-slate-500 font-normal">Excel &amp; Sheets compatible</div>
                    </div>
                  </button>

                  <button
                    onClick={handleExportPdf}
                    className="w-full text-left px-3 py-2.5 hover:bg-emerald-50 text-slate-800 font-semibold flex items-center gap-2.5 transition min-h-[40px]"
                  >
                    <span className="p-1.5 rounded-lg bg-rose-100 text-rose-800">
                      <FileText className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">Export to PDF Register</div>
                      <div className="text-[10px] text-slate-500 font-normal">Printable sheet with statistics</div>
                    </div>
                  </button>

                  <button
                    onClick={handleExportExcelAll}
                    className="w-full text-left px-3 py-2.5 hover:bg-emerald-50 text-slate-800 font-semibold flex items-center gap-2.5 transition min-h-[40px] border-t border-slate-100"
                  >
                    <span className="p-1.5 rounded-lg bg-blue-100 text-blue-800">
                      <Download className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">Export All to Excel (.xlsx)</div>
                      <div className="text-[10px] text-slate-500 font-normal">Multi-date historical workbook</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            onClick={handleSaveAttendance}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-xs min-h-[36px]"
          >
            <Save className="w-4 h-4" />
            <span>Save Attendance</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Control Strip */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Select Class & Stream</label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium min-h-[38px]"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} - {c.stream}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium min-h-[38px]"
            />
          </div>
        </div>

        {/* Quick Bulk Actions */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold mr-1">Quick Mark:</span>
          <button
            type="button"
            onClick={() => handleMarkAll('present')}
            className="px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg font-bold border border-emerald-200 min-h-[36px]"
          >
            All Present
          </button>
          <button
            type="button"
            onClick={() => handleMarkAll('absent')}
            className="px-3 py-1.5 bg-rose-50 text-rose-800 hover:bg-rose-100 rounded-lg font-bold border border-rose-200 min-h-[36px]"
          >
            All Absent
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-slate-500">Present Rate</div>
            <div className="text-xl font-black text-slate-900 mt-1">{presentRate}%</div>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-slate-500">Present (On-Time)</div>
            <div className="text-xl font-black text-emerald-700 mt-1">{present}</div>
          </div>
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-slate-500">Late (Punctuality)</div>
            <div className="text-xl font-black text-amber-600 mt-1">{late}</div>
          </div>
          <Clock className="w-5 h-5 text-amber-500" />
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-slate-500">Absent</div>
            <div className="text-xl font-black text-rose-600 mt-1">{absent}</div>
          </div>
          <XCircle className="w-5 h-5 text-rose-500" />
        </div>
      </div>

      {/* Presentation: Mobile Cards or Spreadsheet Table */}
      {showCards ? (
        <div className="space-y-3 pb-24 md:pb-6">
          {students.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
              No learners found in this class stream.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {students.map((std, idx) => {
                const state = attendanceState[std.id] || { status: 'present', remarks: '' };

                return (
                  <div
                    key={std.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between gap-3 hover:border-slate-300 transition"
                  >
                    <div>
                      {/* Top learner info */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                            {std.full_name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 text-sm truncate">{std.full_name}</div>
                            <div className="font-mono text-xs font-semibold text-emerald-800">
                              {std.admission_number}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {std.student_type}
                        </span>
                      </div>

                      {/* 3 Large Touch Attendance Action Buttons (min 44px height for thumbs) */}
                      <div className="grid grid-cols-3 gap-1.5 mt-3.5">
                        <button
                          type="button"
                          onClick={() => handleStatusChange(std.id, 'present')}
                          className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 border ${
                            state.status === 'present'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-slate-50 hover:bg-emerald-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>Present</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(std.id, 'late')}
                          className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 border ${
                            state.status === 'late'
                              ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                              : 'bg-slate-50 hover:bg-amber-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          <Clock className="w-4 h-4 shrink-0" />
                          <span>Late</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStatusChange(std.id, 'absent')}
                          className={`min-h-[44px] px-2 py-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 border ${
                            state.status === 'absent'
                              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                              : 'bg-slate-50 hover:bg-rose-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          <XCircle className="w-4 h-4 shrink-0" />
                          <span>Absent</span>
                        </button>
                      </div>

                      {/* Optional Remark input */}
                      <div className="mt-2.5">
                        <input
                          type="text"
                          placeholder="Note: e.g. sick, clinic, bus delay"
                          value={state.remarks}
                          onChange={(e) => handleRemarksChange(std.id, e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Mobile Bottom Sticky Save Bar */}
          <div className="fixed bottom-16 md:bottom-4 left-0 right-0 z-30 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg flex items-center justify-between gap-3 max-w-lg mx-auto sm:rounded-2xl sm:border sm:bottom-4 no-print">
            <div className="text-xs">
              <span className="font-bold text-slate-900">{present} Present</span>
              <span className="text-slate-400 mx-1.5">•</span>
              <span className="font-bold text-rose-600">{absent} Absent</span>
            </div>
            <button
              type="button"
              onClick={handleSaveAttendance}
              className="min-h-[44px] px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-md"
            >
              <Save className="w-4 h-4" />
              <span>Save Roll Call</span>
            </button>
          </div>
        </div>
      ) : (
        /* Attendance Table */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4">Adm No</th>
                  <th className="py-3 px-4">Learner Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Teacher Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No learners found in this class stream.
                    </td>
                  </tr>
                ) : (
                  students.map((std) => {
                    const state = attendanceState[std.id] || { status: 'present', remarks: '' };

                    return (
                      <tr key={std.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {std.admission_number}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">{std.full_name}</td>
                        <td className="py-3 px-4">
                          <span className="capitalize text-slate-500">{std.student_type}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-3">
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name={`att-${std.id}`}
                                checked={state.status === 'present'}
                                onChange={() => handleStatusChange(std.id, 'present')}
                                className="text-emerald-600 focus:ring-emerald-500"
                              />
                              <span className="font-semibold text-emerald-800">Present</span>
                            </label>

                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name={`att-${std.id}`}
                                checked={state.status === 'late'}
                                onChange={() => handleStatusChange(std.id, 'late')}
                                className="text-amber-600 focus:ring-amber-500"
                              />
                              <span className="font-semibold text-amber-800">Late</span>
                            </label>

                            <label className="flex items-center gap-1 cursor-pointer">
                              <input
                                type="radio"
                                name={`att-${std.id}`}
                                checked={state.status === 'absent'}
                                onChange={() => handleStatusChange(std.id, 'absent')}
                                className="text-rose-600 focus:ring-rose-500"
                              />
                              <span className="font-semibold text-rose-800">Absent</span>
                            </label>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            placeholder="e.g. Sickness, Bus delay"
                            value={state.remarks}
                            onChange={(e) => handleRemarksChange(std.id, e.target.value)}
                            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
      )}
    </div>
  );
};
