import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import { Student } from '../../types';
import {
  UserPlus,
  CheckCircle2,
} from 'lucide-react';

export const AdmissionsModule: React.FC = () => {
  const { currentSchool } = useAuth();
  if (!currentSchool) return null;

  const schoolId = currentSchool.id;
  const classes = dbService.getClasses(schoolId);
  const students = dbService.getStudents(schoolId);

  const [fullName, setFullName] = useState('');
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [dob, setDob] = useState('2014-05-12');
  const [studentType, setStudentType] = useState<'day' | 'boarding'>('day');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('+254 7');
  const [admittedStudent, setAdmittedStudent] = useState<Student | null>(null);

  // Auto-generate admission number based on count: e.g. MSS/2026/045
  const nextAdmNumber = `MSS/2026/${String(students.length + 1).padStart(3, '0')}`;

  const handleAdmission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !selectedClassId) return;

    const targetClass = classes.find((c) => c.id === selectedClassId);
    if (!targetClass) return;

    // Create student in storage
    const newStudent = dbService.createStudent(schoolId, {
      admission_number: nextAdmNumber,
      full_name: fullName.trim(),
      gender,
      dob,
      class_id: targetClass.id,
      level_id: targetClass.level_id,
      student_type: studentType,
      status: 'active',
    });

    setAdmittedStudent(newStudent);
    setFullName('');
    setParentName('');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">
            <UserPlus className="w-4 h-4" />
            Registry &bull; Learner Admissions
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Learner Admission &amp; Enrollment
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enroll new CBC learners into {currentSchool.name}. Generates official admission numbers and links parent contacts.
          </p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-xs">
          <span className="text-slate-500 block">Next Auto Admission Number:</span>
          <span className="font-mono font-bold text-emerald-800 text-sm">{nextAdmNumber}</span>
        </div>
      </div>

      {admittedStudent && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-center justify-between text-xs text-emerald-900 animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <span className="font-bold text-sm">Learner Successfully Admitted!</span>
              <div>
                {admittedStudent.full_name} enrolled with Admission Number{' '}
                <strong className="font-mono">{admittedStudent.admission_number}</strong>.
              </div>
            </div>
          </div>
          <button
            onClick={() => setAdmittedStudent(null)}
            className="px-3 py-1 bg-white border border-emerald-300 rounded-lg font-bold text-emerald-800 hover:bg-emerald-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Form and Recent Admissions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Admission Form */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h2 className="font-bold text-slate-900 text-base border-b border-slate-100 pb-2">
            New Learner Registration Form
          </h2>

          <form onSubmit={handleAdmission} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Learner Full Name (Official) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stacey Wanjiku Kamau"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Class / Stream *</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.stream}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Gender *</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Enrollment Type *</label>
                <select
                  value={studentType}
                  onChange={(e) => setStudentType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="day">Day Scholar</option>
                  <option value="boarding">Boarder</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Parent / Guardian Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. John Kamau"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Parent Phone (for SMS circulars)
                </label>
                <input
                  type="text"
                  placeholder="+254 712 345 678"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow"
              >
                Complete Admission &amp; Generate Student ID
              </button>
            </div>
          </form>
        </div>

        {/* Recent Admissions Sidebar */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
            Recently Admitted Learners
          </h3>

          <div className="divide-y divide-slate-100 text-xs">
            {students.slice(-5).reverse().map((stud) => {
              const c = classes.find((cl) => cl.id === stud.class_id);
              return (
                <div key={stud.id} className="py-2.5">
                  <div className="font-bold text-slate-800">{stud.full_name}</div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-0.5">
                    <span className="font-mono text-emerald-700 font-semibold">
                      {stud.admission_number}
                    </span>
                    <span>{c ? `${c.name} ${c.stream}` : 'Assigned'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
