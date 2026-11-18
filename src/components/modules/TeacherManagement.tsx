import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useViewMode } from '../../context/ViewModeContext';
import { dbService } from '../../services/storage';
import { Teacher, User } from '../../types';
import { Users, Plus, Search, Edit2, CheckCircle2, X, Briefcase, Calendar, Award, Phone, Mail } from 'lucide-react';

export const TeacherManagement: React.FC = () => {
  const { currentSchool } = useAuth();
  const { effectiveIsMobile } = useViewMode();
  if (!currentSchool) return null;
  const schoolId = currentSchool.id;

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [viewingProfile, setViewingProfile] = useState<(Teacher & { user: User }) | null>(null);

  const levels = dbService.getLevels(schoolId);
  const classes = dbService.getClasses(schoolId);
  const teachers = dbService.getTeachers(schoolId).filter((t) =>
    t.user.full_name.toLowerCase().includes(search.toLowerCase()) ||
    t.employee_number.toLowerCase().includes(search.toLowerCase()) ||
    t.subject_specialty.toLowerCase().includes(search.toLowerCase())
  );

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '+254 ',
    employeeNumber: '',
    specialty: '',
    hireDate: '2023-01-10',
    assignedLevels: [] as string[],
    assignedClasses: [] as string[],
  });

  const handleOpenCreate = () => {
    setEditingTeacher(null);
    setFormData({
      fullName: '',
      email: '',
      phone: '+254 ',
      employeeNumber: `TSC/${Math.floor(10000 + Math.random() * 90000)}`,
      specialty: 'Mathematics & Integrated Science',
      hireDate: new Date().toISOString().split('T')[0],
      assignedLevels: [levels[0]?.id || ''],
      assignedClasses: [classes[0]?.id || ''],
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.employeeNumber) {
      alert('Please fill out all required fields.');
      return;
    }

    if (editingTeacher) {
      dbService.updateTeacher(schoolId, editingTeacher.id, {
        employee_number: formData.employeeNumber,
        subject_specialty: formData.specialty,
        hire_date: formData.hireDate,
        assigned_level_ids: formData.assignedLevels,
        assigned_class_ids: formData.assignedClasses,
      });
    } else {
      dbService.createTeacher(schoolId, formData);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-800">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Teaching Staff Directory</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage TSC registered teachers, curriculum competencies, assigned classes & levels
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Add Teacher Account
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by teacher name, TSC number, or learning area..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs text-slate-800 bg-transparent focus:outline-none"
        />
      </div>

      {/* Teachers List */}
      <div className={`grid gap-4 ${effectiveIsMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
        {teachers.map((tch) => (
          <div
            key={tch.id}
            className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0">
                    {tch.user.full_name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-slate-900 truncate">{tch.user.full_name}</h3>
                    <div className="text-[11px] text-slate-500 font-mono font-semibold">{tch.employee_number}</div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 shrink-0">
                  Active
                </span>
              </div>

              <div className="mt-4 space-y-2 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400 font-medium">Specialty:</span>{' '}
                  <span className="font-semibold text-slate-800">{tch.subject_specialty}</span>
                </div>
                
                {/* Mobile direct contact buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href={`tel:${tch.user.phone}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-200 min-h-[36px]"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{tch.user.phone}</span>
                  </a>
                  <a
                    href={`mailto:${tch.user.email}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-200 min-h-[36px]"
                  >
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                    <span className="truncate max-w-[150px]">{tch.user.email}</span>
                  </a>
                </div>

                <div>
                  <span className="text-slate-400 font-medium">Assigned Classes:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {tch.assigned_class_ids.map((cid) => {
                      const c = classes.find((cl) => cl.id === cid);
                      return (
                        <span key={cid} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold">
                          {c ? `${c.name} ${c.stream}` : 'Class'}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setViewingProfile(tch)}
                className="flex-1 min-h-[44px] px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
              >
                <span>View Profile & Leaves</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingTeacher(tch);
                  setFormData({
                    fullName: tch.user.full_name,
                    email: tch.user.email,
                    phone: tch.user.phone,
                    employeeNumber: tch.employee_number,
                    specialty: tch.subject_specialty,
                    hireDate: tch.hire_date,
                    assignedLevels: tch.assigned_level_ids,
                    assignedClasses: tch.assigned_class_ids,
                  });
                  setIsModalOpen(true);
                }}
                className="min-h-[44px] min-w-[44px] px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 hover:text-blue-600 flex items-center justify-center transition"
                title="Edit Teacher"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingTeacher ? 'Update Teaching Staff Details' : 'Onboard Teaching Staff'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Teacher Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Tr. Beatrice Wangari"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email (Login ID)</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">TSC / Employee No</label>
                  <input
                    type="text"
                    required
                    value={formData.employeeNumber}
                    onChange={(e) => setFormData({ ...formData, employeeNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Learning Area Specialty</label>
                <input
                  type="text"
                  required
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  placeholder="e.g. Science & Technology, Pre-Technical"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold"
                >
                  Save Teacher Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {viewingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900">{viewingProfile.user.full_name}</h3>
              <button onClick={() => setViewingProfile(null)}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <div><strong>TSC Number:</strong> {viewingProfile.employee_number}</div>
                <div><strong>Specialty:</strong> {viewingProfile.subject_specialty}</div>
                <div><strong>Hire Date:</strong> {viewingProfile.hire_date}</div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2">Leave History & Requests:</h4>
                <div className="space-y-1.5">
                  {dbService.getLeaveRequests(schoolId, viewingProfile.id).map((l) => (
                    <div key={l.id} className="p-2 border rounded-lg flex items-center justify-between">
                      <span>{l.reason} ({l.start_date} to {l.end_date})</span>
                      <span className="font-bold uppercase text-emerald-800">{l.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2">Recent Monthly Payslips:</h4>
                <div className="space-y-1.5">
                  {dbService.getPayrollRecords(schoolId, viewingProfile.id).map((p) => (
                    <div key={p.id} className="p-2 border rounded-lg flex items-center justify-between">
                      <span>Month {p.month}/{p.year} - Net: KES {p.net_pay.toLocaleString()}</span>
                      <span className="font-bold uppercase text-blue-700">{p.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setViewingProfile(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
