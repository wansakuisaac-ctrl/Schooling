import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import { Calendar, Plus, Clock, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import { TimetableSlot } from '../../types';

export const TimetableModule: React.FC = () => {
  const { currentSchool } = useAuth();
  if (!currentSchool) return null;
  const schoolId = currentSchool.id;

  const classes = dbService.getClasses(schoolId);
  const teachers = dbService.getTeachers(schoolId);

  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const subjects = dbService.getSubjects(schoolId, selectedClass?.level_id);
  const timetableSlots = dbService.getTimetable(schoolId, selectedClassId);

  // Edit slot modal
  const [editingCell, setEditingCell] = useState<{ day: number; period: number } | null>(null);
  const [slotSubjectId, setSlotSubjectId] = useState<string>('');
  const [slotTeacherId, setSlotTeacherId] = useState<string>('');
  const [slotRoom, setSlotRoom] = useState<string>('Main Room');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const DAYS = [
    { num: 1, name: 'Monday' },
    { num: 2, name: 'Tuesday' },
    { num: 3, name: 'Wednesday' },
    { num: 4, name: 'Thursday' },
    { num: 5, name: 'Friday' },
  ];

  const PERIODS = [
    { num: 1, time: '08:00 - 08:45' },
    { num: 2, time: '08:45 - 09:30' },
    { num: 3, time: '09:45 - 10:30' },
    { num: 4, time: '10:30 - 11:15' },
    { num: 5, time: '11:45 - 12:30' },
    { num: 6, time: '12:30 - 01:15' },
    { num: 7, time: '02:00 - 02:45' },
    { num: 8, time: '02:45 - 03:30' },
  ];

  const handleOpenCell = (day: number, period: number) => {
    const existing = timetableSlots.find((s) => s.day_of_week === day && s.period === period);
    setEditingCell({ day, period });
    setSlotSubjectId(existing?.subject_id || subjects[0]?.id || '');
    setSlotTeacherId(existing?.teacher_id || teachers[0]?.id || '');
    setSlotRoom(existing?.room || 'Main Room');
    setErrorMsg(null);
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCell) return;
    setErrorMsg(null);

    const periodMeta = PERIODS.find((p) => p.num === editingCell.period)!;
    const [start, end] = periodMeta.time.split(' - ');

    try {
      dbService.saveTimetableSlot(schoolId, {
        class_id: selectedClassId,
        subject_id: slotSubjectId,
        teacher_id: slotTeacherId,
        day_of_week: editingCell.day,
        period: editingCell.period,
        start_time: start,
        end_time: end,
        room: slotRoom,
      });
      setEditingCell(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Timetable scheduling conflict.');
    }
  };

  const handleDeleteSlot = (slotId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dbService.deleteTimetableSlot(schoolId, slotId);
    setEditingCell(null);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-800">
              <Calendar className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Weekly Master Timetable</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Weekly 8-period scheduler with teacher double-booking detection and room allocations
          </p>
        </div>

        <div>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 shadow-xs"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} - {c.stream}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timetable Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-xs">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
              <th className="p-3 font-bold border-r border-slate-200 w-28 text-center">Period / Time</th>
              {DAYS.map((d) => (
                <th key={d.num} className="p-3 font-bold border-r border-slate-200 text-center last:border-r-0 min-w-[140px]">
                  {d.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {PERIODS.map((p) => (
              <tr key={p.num} className="hover:bg-slate-50/50">
                <td className="p-2 font-bold text-slate-500 bg-slate-50/70 border-r border-slate-200 text-center">
                  <div>Period {p.num}</div>
                  <div className="text-[10px] text-slate-400 font-normal">{p.time}</div>
                </td>

                {DAYS.map((d) => {
                  const slot = timetableSlots.find((s) => s.day_of_week === d.num && s.period === p.num);
                  const sub = slot ? subjects.find((sb) => sb.id === slot.subject_id) : null;
                  const tch = slot ? teachers.find((t) => t.id === slot.teacher_id) : null;

                  return (
                    <td
                      key={d.num}
                      onClick={() => handleOpenCell(d.num, p.num)}
                      className={`p-2 border-r border-slate-200 last:border-r-0 cursor-pointer transition ${
                        slot ? 'bg-emerald-50/60 hover:bg-emerald-100/50' : 'hover:bg-slate-100/70'
                      }`}
                    >
                      {slot && sub ? (
                        <div className="relative group p-1.5 rounded-lg bg-white border border-emerald-200 shadow-2xs">
                          <div className="font-bold text-slate-900 truncate">{sub.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">{tch?.user.full_name || 'Staff'}</div>
                          <div className="text-[10px] text-emerald-800 font-semibold">{slot.room}</div>
                          <button
                            onClick={(e) => handleDeleteSlot(slot.id, e)}
                            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition"
                            title="Clear Slot"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="h-12 flex items-center justify-center text-slate-300 text-[11px] font-semibold">
                          + Assign
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Slot Modal */}
      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              Schedule: {DAYS.find((d) => d.num === editingCell.day)?.name} • Period {editingCell.period}
            </h3>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveSlot} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Learning Area / Subject</label>
                <select
                  value={slotSubjectId}
                  onChange={(e) => setSlotSubjectId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg font-medium"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Assigned Teacher</label>
                <select
                  value={slotTeacherId}
                  onChange={(e) => setSlotTeacherId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg font-medium"
                >
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.user.full_name} ({t.employee_number})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Room / Laboratory</label>
                <input
                  type="text"
                  required
                  value={slotRoom}
                  onChange={(e) => setSlotRoom(e.target.value)}
                  placeholder="e.g. Science Lab 2, Room 4A"
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCell(null)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 text-white rounded-lg font-bold"
                >
                  Save Schedule Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
