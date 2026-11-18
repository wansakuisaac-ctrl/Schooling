import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import { FileCheck2, Plus, AlertCircle, CheckCircle2, Search } from 'lucide-react';
import { DisciplineLog } from '../../types';

export const DisciplineModule: React.FC = () => {
  const { currentSchool, currentUser } = useAuth();
  if (!currentSchool) return null;
  const schoolId = currentSchool.id;

  const [logs, setLogs] = useState<DisciplineLog[]>(() => dbService.getDisciplineLogs(schoolId));
  const students = dbService.getStudents(schoolId);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [studentId, setStudentId] = useState(students[0]?.id || '');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<'minor' | 'major'>('minor');
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !description || !actionTaken) return;

    dbService.createDisciplineLog(schoolId, {
      student_id: studentId,
      incident_date: incidentDate,
      category,
      description,
      action_taken: actionTaken,
      recorded_by: currentUser?.full_name || 'Admin',
    });

    setLogs(dbService.getDisciplineLogs(schoolId));
    setIsModalOpen(false);
    setDescription('');
    setActionTaken('');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-100 text-rose-800">
              <FileCheck2 className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Learner Discipline Incident Registry</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Restorative guidance logs, minor/major infractions, corrective interventions & administrative audit trail
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Log Incident
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
            <tr>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Learner</th>
              <th className="py-3 px-4">Severity Category</th>
              <th className="py-3 px-4">Incident Description</th>
              <th className="py-3 px-4">Corrective Action Taken</th>
              <th className="py-3 px-4">Recorded By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {logs.map((log) => {
              const std = students.find((s) => s.id === log.student_id);
              return (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono">{log.incident_date}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {std?.full_name} ({std?.admission_number})
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.category === 'major'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {log.category}
                    </span>
                  </td>
                  <td className="py-3 px-4">{log.description}</td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{log.action_taken}</td>
                  <td className="py-3 px-4 text-slate-500">{log.recorded_by}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Record Discipline Entry</h3>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Learner</label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.admission_number})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Incident Date</label>
                  <input
                    type="date"
                    required
                    value={incidentDate}
                    onChange={(e) => setIncidentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border rounded-lg font-bold"
                  >
                    <option value="minor">Minor Infraction</option>
                    <option value="major">Major Breach</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Incident Description</label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail the circumstances..."
                  className="w-full p-2 bg-slate-50 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Corrective / Restorative Action</label>
                <input
                  type="text"
                  required
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  placeholder="e.g. Guidance session & parent briefing"
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-700 text-white rounded-lg font-bold"
                >
                  Record Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
