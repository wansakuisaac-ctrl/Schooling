import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import {
  Trophy,
  Award,
  Calendar,
  Users,
  Medal,
  Plus,
  CheckCircle,
  MapPin,
  Sparkles,
} from 'lucide-react';

interface ContestItem {
  id: string;
  name: string;
  category: 'Science & Robotics' | 'Music & Arts' | 'Mathematics' | 'Athletics & Sports' | 'Drama';
  level: 'Zonal' | 'Sub-County' | 'County' | 'Regional' | 'National';
  date: string;
  venue: string;
  teacherInCharge: string;
  participantsCount: number;
  status: 'Upcoming' | 'Ongoing' | 'Completed';
  awardWon?: string;
}

export const ContestsModule: React.FC = () => {
  const { currentSchool } = useAuth();
  if (!currentSchool) return null;

  const schoolId = currentSchool.id;
  const teachers = dbService.getTeachers(schoolId);
  const students = dbService.getStudents(schoolId);

  const [contests, setContests] = useState<ContestItem[]>([
    {
      id: 'c-1',
      name: 'Kenya Science & Engineering Fair (KSEF) 2026',
      category: 'Science & Robotics',
      level: 'County',
      date: '2026-04-18',
      venue: 'Machakos National School',
      teacherInCharge: teachers[0]?.user?.full_name || 'Tr. Daniel Mwangi',
      participantsCount: 8,
      status: 'Upcoming',
      awardWon: 'First Runners Up (Robotics & IoT)',
    },
    {
      id: 'c-2',
      name: 'Kenya Music Festival 64th Edition',
      category: 'Music & Arts',
      level: 'Regional',
      date: '2026-05-12',
      venue: 'Embu University Auditorium',
      teacherInCharge: teachers[1]?.user?.full_name || 'Tr. Mary Wambui',
      participantsCount: 24,
      status: 'Upcoming',
    },
    {
      id: 'c-3',
      name: 'National Junior CBC Mathematics Contest',
      category: 'Mathematics',
      level: 'National',
      date: '2026-03-15',
      venue: 'Strathmore University, Nairobi',
      teacherInCharge: teachers[0]?.user?.full_name || 'Tr. Daniel Mwangi',
      participantsCount: 12,
      status: 'Completed',
      awardWon: 'Gold Trophy & Top Junior School in Eastern Region',
    },
    {
      id: 'c-4',
      name: 'Eastern Region Junior Athletics Championship',
      category: 'Athletics & Sports',
      level: 'County',
      date: '2026-02-28',
      venue: 'Kenyatta Stadium, Machakos',
      teacherInCharge: 'Coach Kelvin Mutiso',
      participantsCount: 16,
      status: 'Completed',
      awardWon: '3 Gold Medals (100m, 400m, Javelin)',
    },
  ]);

  const [filterCat, setFilterCat] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newContestName, setNewContestName] = useState('');
  const [newContestCat, setNewContestCat] = useState<ContestItem['category']>('Science & Robotics');
  const [newVenue, setNewVenue] = useState('');
  const [newDate, setNewDate] = useState('');

  const handleAddContest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContestName.trim()) return;

    const newEntry: ContestItem = {
      id: `c-${Date.now()}`,
      name: newContestName,
      category: newContestCat,
      level: 'County',
      date: newDate || '2026-06-10',
      venue: newVenue || 'School Grounds',
      teacherInCharge: teachers[0]?.user?.full_name || 'Staff Patron',
      participantsCount: 10,
      status: 'Upcoming',
    };

    setContests([newEntry, ...contests]);
    setShowAddModal(false);
    setNewContestName('');
    setNewVenue('');
  };

  const filtered = contests.filter(
    (c) => filterCat === 'all' || c.category === filterCat
  );

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-1">
            <Trophy className="w-4 h-4" />
            Academics &bull; Co-Curricular &amp; Contests
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Academic Contests &amp; Competitions
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tracking inter-school competitions, Science Fairs, Music Festivals, Math Olympiads, and athletic championships for {currentSchool.name}.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow"
        >
          <Plus className="w-4 h-4" />
          Register New Contest
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Contests' },
          { id: 'Science & Robotics', label: 'Science & Robotics' },
          { id: 'Mathematics', label: 'Mathematics Olympiad' },
          { id: 'Music & Arts', label: 'Music & Drama' },
          { id: 'Athletics & Sports', label: 'Sports & Athletics' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterCat(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              filterCat === tab.id
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {item.category}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    item.status === 'Completed'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {item.status} ({item.level} Level)
                </span>
              </div>

              <h3 className="font-bold text-slate-900 text-base mb-1.5">{item.name}</h3>

              <div className="space-y-1 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Date: {item.date}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Venue: {item.venue}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    Patron: <strong>{item.teacherInCharge}</strong> ({item.participantsCount} learners participating)
                  </span>
                </div>
              </div>

              {item.awardWon && (
                <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs font-bold text-amber-900">
                  <Medal className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Achievement: {item.awardWon}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-medium">Muungano Delegations</span>
              <button
                onClick={() => alert(`Viewing delegations for: ${item.name}`)}
                className="font-bold text-emerald-700 hover:text-emerald-800"
              >
                View Participants List &rarr;
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Register Contest</h3>
            <form onSubmit={handleAddContest} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Contest Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kenya Music Festival 2026"
                  value={newContestName}
                  onChange={(e) => setNewContestName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={newContestCat}
                  onChange={(e) => setNewContestCat(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="Science & Robotics">Science & Robotics</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Music & Arts">Music & Arts</option>
                  <option value="Athletics & Sports">Athletics & Sports</option>
                  <option value="Drama">Drama</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Venue</label>
                <input
                  type="text"
                  placeholder="e.g. Kenyatta Stadium, Machakos"
                  value={newVenue}
                  onChange={(e) => setNewVenue(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Date</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg"
                >
                  Save Contest
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
