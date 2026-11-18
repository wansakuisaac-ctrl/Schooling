import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import { Users, Plus, Search, Eye, X, GraduationCap, CheckCircle2 } from 'lucide-react';

export const ParentManagement: React.FC = () => {
  const { currentSchool, switchRole } = useAuth();
  if (!currentSchool) return null;
  const schoolId = currentSchool.id;

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const students = dbService.getStudents(schoolId);
  const parents = dbService.getParents(schoolId).filter((p) =>
    p.user.full_name.toLowerCase().includes(search.toLowerCase()) ||
    p.user.email.toLowerCase().includes(search.toLowerCase()) ||
    p.user.phone.includes(search)
  );

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '+254 ',
    relationship: 'father' as 'father' | 'mother' | 'guardian' | 'other',
    occupation: '',
    linkedStudentIds: [] as string[],
  });

  const handleOpenCreate = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '+254 ',
      relationship: 'father',
      occupation: '',
      linkedStudentIds: [students[0]?.id || ''],
    });
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.email || !formData.phone) {
      alert('Please fill in all mandatory fields.');
      return;
    }

    dbService.createParent(schoolId, formData);
    setIsModalOpen(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Parent & Guardian Accounts</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Guardian communication, linked learners, automated SMS broadcast registry, and DPA privacy consents
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Link New Parent
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by parent name, phone number, email address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs text-slate-800 bg-transparent focus:outline-none"
        />
      </div>

      {/* Parents Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {parents.map((par) => (
          <div
            key={par.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{par.user.full_name}</h3>
                  <div className="text-[11px] text-slate-500 capitalize">
                    {par.relationship} • {par.occupation || 'Parent'}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                  Verified
                </span>
              </div>

              <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400 font-medium">Contact:</span>{' '}
                  <span className="font-semibold text-slate-800">{par.user.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Email:</span> {par.user.email}
                </div>

                <div className="pt-2">
                  <span className="text-slate-400 font-medium text-[11px]">Enrolled Children:</span>
                  <div className="space-y-1 mt-1">
                    {par.students.map((std) => (
                      <div
                        key={std.id}
                        className="p-1.5 bg-emerald-50 border border-emerald-100 rounded text-[11px] flex items-center justify-between"
                      >
                        <span className="font-bold text-emerald-950">{std.full_name}</span>
                        <span className="font-mono text-emerald-700">{std.admission_number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => switchRole('PARENT', par.user)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5"
                title="Preview what this parent sees"
              >
                <Eye className="w-3.5 h-3.5" />
                Preview Parent Portal
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Register Guardian & Link Learners</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Mr. Peter Njoroge"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number (SMS)</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Relationship</label>
                  <select
                    value={formData.relationship}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                  >
                    <option value="father">Father</option>
                    <option value="mother">Mother</option>
                    <option value="guardian">Legal Guardian</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Occupation</label>
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    placeholder="e.g. Accountant"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Link Enrolled Learner</label>
                <select
                  multiple
                  value={formData.linkedStudentIds}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                    setFormData({ ...formData, linkedStudentIds: selected });
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg h-24"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.admission_number})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400">Hold Cmd/Ctrl to select multiple children</span>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold"
                >
                  Save Parent Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
