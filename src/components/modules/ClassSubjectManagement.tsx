import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import { Layers, Plus, BookOpen, Trash2, Edit2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { SchoolClass, Subject } from '../../types';

export const ClassSubjectManagement: React.FC = () => {
  const { currentSchool } = useAuth();
  if (!currentSchool) return null;
  const schoolId = currentSchool.id;

  const [activeTab, setActiveTab] = useState<'classes' | 'subjects'>('classes');
  const [selectedLevelId, setSelectedLevelId] = useState<string>('');

  const levels = dbService.getLevels(schoolId);
  const classes = dbService.getClasses(schoolId);
  const teachers = dbService.getTeachers(schoolId);
  const subjects = dbService.getSubjects(schoolId, selectedLevelId || undefined);

  // Class Modal State
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [classForm, setClassForm] = useState({
    name: 'Grade 5',
    stream: 'East',
    level_id: levels[0]?.id || '',
    class_teacher_id: teachers[0]?.id || '',
  });

  // Subject Modal State
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    level_id: levels[0]?.id || '',
    is_optional: false,
  });

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);
    try {
      dbService.createClass(schoolId, classForm);
      setIsClassModalOpen(false);
      setFeedbackMsg({ type: 'success', text: `Class ${classForm.name} ${classForm.stream} created successfully.` });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    }
  };

  const handleDeleteClass = (classId: string) => {
    setFeedbackMsg(null);
    try {
      dbService.deleteClass(schoolId, classId);
      setFeedbackMsg({ type: 'success', text: 'Class deleted successfully.' });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    }
  };

  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);
    try {
      dbService.addSubject(schoolId, subjectForm);
      setIsSubjectModalOpen(false);
      setFeedbackMsg({ type: 'success', text: `Subject ${subjectForm.name} added.` });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    }
  };

  const handleDeleteSubject = (subjectId: string) => {
    setFeedbackMsg(null);
    try {
      dbService.deleteSubject(schoolId, subjectId);
      setFeedbackMsg({ type: 'success', text: 'Subject deleted successfully.' });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-800">
              <Layers className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Classes & CBC Subjects</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Curriculum learning areas, streams, and level structure from PP1 through Grade 9
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('classes')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'classes' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Classes & Streams ({classes.length})
          </button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'subjects' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            CBC Subjects & Codes
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">Academic Streams per Level</h3>
            <button
              onClick={() => setIsClassModalOpen(true)}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Stream / Class
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {classes.map((cls) => {
              const lvl = levels.find((l) => l.id === cls.level_id);
              const teacher = teachers.find((t) => t.id === cls.class_teacher_id);
              const studentCount = dbService.getStudents(schoolId).filter((s) => s.class_id === cls.id).length;

              return (
                <div key={cls.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {lvl?.name || 'Level'}
                      </span>
                      <button
                        onClick={() => handleDeleteClass(cls.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded"
                        title="Delete Stream"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className="font-bold text-base text-slate-900 mt-2">
                      {cls.name} <span className="text-slate-500 font-normal">({cls.stream})</span>
                    </h4>

                    <div className="mt-3 space-y-1 text-xs text-slate-600">
                      <div>
                        <strong>Learners Enrolled:</strong>{' '}
                        <span className="font-bold text-slate-900">{studentCount}</span>
                      </div>
                      <div>
                        <strong>Class Teacher:</strong>{' '}
                        <span>{teacher ? teacher.user.full_name : 'Unassigned'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Filter Level:</span>
              <select
                value={selectedLevelId}
                onChange={(e) => setSelectedLevelId(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-semibold text-slate-800"
              >
                <option value="">All 11 CBC Levels</option>
                {levels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>
                    {lvl.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setIsSubjectModalOpen(true)}
              className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Custom Subject
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="p-3">Level</th>
                  <th className="p-3">Subject Name</th>
                  <th className="p-3">KICD / CBA Code</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {subjects.map((sub) => {
                  const lvl = levels.find((l) => l.id === sub.level_id);
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-900">{lvl?.name}</td>
                      <td className="p-3 font-medium">{sub.name}</td>
                      <td className="p-3 font-mono text-emerald-800 font-bold">{sub.code}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sub.is_optional ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                          {sub.is_optional ? 'Optional' : 'Core Strand'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteSubject(sub.id)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded"
                          title="Delete Subject"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Class Modal */}
      {isClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Add New Stream</h3>
            <form onSubmit={handleCreateClass} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Class Level</label>
                <select
                  value={classForm.level_id}
                  onChange={(e) => setClassForm({ ...classForm, level_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                >
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Stream Name</label>
                <input
                  type="text"
                  required
                  value={classForm.stream}
                  onChange={(e) => setClassForm({ ...classForm, stream: e.target.value })}
                  placeholder="e.g. West, Alpha, Lion"
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Class Teacher</label>
                <select
                  value={classForm.class_teacher_id}
                  onChange={(e) => setClassForm({ ...classForm, class_teacher_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                >
                  <option value="">None / Unassigned</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.user.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsClassModalOpen(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 text-white rounded-lg font-bold"
                >
                  Save Stream
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Subject Modal */}
      {isSubjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Add Learning Area (Subject)</h3>
            <form onSubmit={handleCreateSubject} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">School Level</label>
                <select
                  value={subjectForm.level_id}
                  onChange={(e) => setSubjectForm({ ...subjectForm, level_id: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                >
                  {levels.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                  placeholder="e.g. Arabic / Aviation"
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Code</label>
                <input
                  type="text"
                  required
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. ARA"
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="optCheck"
                  checked={subjectForm.is_optional}
                  onChange={(e) => setSubjectForm({ ...subjectForm, is_optional: e.target.checked })}
                />
                <label htmlFor="optCheck" className="font-semibold text-slate-700">Optional Elective</label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 text-white rounded-lg font-bold"
                >
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
