import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import {
  BookMarked,
  Search,
  CheckCircle,
  Plus,
  BookOpen,
  User,
  ArrowRightLeft,
} from 'lucide-react';

export const BookRecordsModule: React.FC = () => {
  const { currentSchool } = useAuth();
  if (!currentSchool) return null;

  const schoolId = currentSchool.id;
  const classes = dbService.getClasses(schoolId);
  const students = dbService.getStudents(schoolId);

  const [records, setRecords] = useState([
    {
      id: 'br-1',
      title: 'Moran Junior Secondary Integrated Science Learner Book 9',
      kicdCode: 'KICD/JS/09/ISCI/2025',
      grade: 'Grade 9',
      issuedTo: students[0]?.full_name || 'Brian Otieno',
      admNo: students[0]?.admission_number || 'MS/2026/001',
      dateIssued: '2026-01-08',
      condition: 'New',
      status: 'Issued',
    },
    {
      id: 'br-2',
      title: 'Spotlight CBC Mathematics Grade 4',
      kicdCode: 'KICD/PRI/04/MATH/2024',
      grade: 'Grade 4',
      issuedTo: students[2]?.full_name || 'Stacy Wanjiku',
      admNo: students[2]?.admission_number || 'MS/2026/003',
      dateIssued: '2026-01-09',
      condition: 'Good',
      status: 'Issued',
    },
    {
      id: 'br-3',
      title: 'Longhorn Kiswahili Dadisi Gredi ya 7',
      kicdCode: 'KICD/JS/07/KISW/2024',
      grade: 'Grade 7',
      issuedTo: students[1]?.full_name || 'Faith Chepkemoi',
      admNo: students[1]?.admission_number || 'MS/2026/002',
      dateIssued: '2026-01-08',
      condition: 'Good',
      status: 'Returned',
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');

  const filtered = records.filter(
    (r) =>
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.issuedTo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.admNo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">
            <BookMarked className="w-4 h-4" />
            Registry &bull; Textbook &amp; Stationery Records
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Book Records &amp; Courseware Distribution
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track government-subsidized KICD CBC textbooks issued to learners and inventory returns.
          </p>
        </div>

        <button
          onClick={() => alert('New textbook issue recorded!')}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow"
        >
          <Plus className="w-4 h-4" />
          Issue Book to Learner
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <input
            type="text"
            placeholder="Search book title or learner..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs w-72"
          />
          <span className="text-xs text-slate-500 font-semibold">{filtered.length} Book Records</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                <th className="p-3 font-bold">Book Title / KICD Code</th>
                <th className="p-3 font-bold">Grade</th>
                <th className="p-3 font-bold">Learner Name &amp; Adm No</th>
                <th className="p-3 font-bold">Date Issued</th>
                <th className="p-3 font-bold">Condition</th>
                <th className="p-3 font-bold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition">
                  <td className="p-3 font-bold text-slate-900">
                    <div>{r.title}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{r.kicdCode}</div>
                  </td>
                  <td className="p-3 text-slate-600">{r.grade}</td>
                  <td className="p-3 text-slate-800">
                    <div className="font-semibold">{r.issuedTo}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{r.admNo}</div>
                  </td>
                  <td className="p-3 text-slate-500">{r.dateIssued}</td>
                  <td className="p-3 text-slate-600">{r.condition}</td>
                  <td className="p-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        r.status === 'Issued'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
