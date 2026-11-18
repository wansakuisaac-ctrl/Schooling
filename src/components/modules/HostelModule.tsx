import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import { Home, Plus, Users, Bed, CheckCircle2, AlertTriangle, LogOut } from 'lucide-react';
import { Hostel, HostelRoom, HostelAllocation } from '../../types';

export const HostelModule: React.FC = () => {
  const { currentSchool } = useAuth();
  if (!currentSchool) return null;
  const schoolId = currentSchool.id;

  const hostels = dbService.getHostels(schoolId);
  const rooms = dbService.getHostelRooms(schoolId);
  const allocations = dbService.getHostelAllocations(schoolId);
  const students = dbService.getStudents(schoolId);

  const [selectedHostelId, setSelectedHostelId] = useState<string>(hostels[0]?.id || '');
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form
  const [allocateStudentId, setAllocateStudentId] = useState(students[0]?.id || '');
  const [allocateRoomId, setAllocateRoomId] = useState(rooms[0]?.id || '');

  const activeHostel = hostels.find((h) => h.id === selectedHostelId);
  const activeRooms = rooms.filter((r) => r.hostel_id === selectedHostelId);

  // Filter only boarding students
  const boardingStudents = students.filter((s) => s.student_type === 'boarding');

  const handleAllocate = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      dbService.allocateHostelRoom(
        schoolId,
        allocateStudentId,
        allocateRoomId,
        currentSchool.current_term,
        currentSchool.academic_year
      );
      setIsAllocateModalOpen(false);
      setStatusMsg({ type: 'success', text: 'Boarding learner allocated to dormitory room.' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleCheckout = (allocId: string) => {
    dbService.checkoutHostel(schoolId, allocId);
    setStatusMsg({ type: 'success', text: 'Learner checked out from hostel room.' });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-100 text-purple-800">
              <Home className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Hostel & Boarding Management</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dormitory allocations with strict gender isolation, bed capacity management & check-in/out records
          </p>
        </div>

        <button
          onClick={() => {
            if (activeRooms.length > 0) setAllocateRoomId(activeRooms[0].id);
            setIsAllocateModalOpen(true);
          }}
          className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Allocate Boarder
        </button>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Hostel Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {hostels.map((hst) => {
          const hostelAllocCount = allocations.filter((a) => {
            const rm = rooms.find((r) => r.id === a.room_id);
            return rm?.hostel_id === hst.id && !a.check_out_date;
          }).length;

          return (
            <div
              key={hst.id}
              onClick={() => setSelectedHostelId(hst.id)}
              className={`p-4 rounded-2xl border cursor-pointer transition ${
                hst.id === selectedHostelId
                  ? 'bg-purple-50/50 border-purple-500 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900">{hst.name}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-800">
                  {hst.gender} Dormitory
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Total Capacity: {hst.capacity} beds</span>
                <span className="font-bold text-emerald-700">{hostelAllocCount} currently occupied</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rooms & Active Allocations Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-900">
          Dormitory Rooms & Current Occupants ({activeHostel?.name})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeRooms.map((rm) => {
            const roomAllocs = allocations.filter((a) => a.room_id === rm.id && !a.check_out_date);

            return (
              <div key={rm.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-2">
                    <Bed className="w-4 h-4 text-purple-700" />
                    <span className="font-bold text-sm text-slate-900">Room {rm.room_number}</span>
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    {roomAllocs.length} / {rm.capacity} beds
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  {roomAllocs.length === 0 ? (
                    <div className="text-slate-400 py-2 text-center text-[11px]">Room is empty</div>
                  ) : (
                    roomAllocs.map((al) => {
                      const std = students.find((s) => s.id === al.student_id);
                      return (
                        <div key={al.id} className="p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                          <div>
                            <div className="font-bold text-slate-900">{std?.full_name}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{std?.admission_number}</div>
                          </div>
                          <button
                            onClick={() => handleCheckout(al.id)}
                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition"
                            title="Check Out"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Allocate Modal */}
      {isAllocateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Allocate Boarder to Dorm Room</h3>
            <form onSubmit={handleAllocate} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Boarding Learner</label>
                <select
                  value={allocateStudentId}
                  onChange={(e) => setAllocateStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                >
                  {boardingStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.gender} • {s.admission_number})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400">Only learners registered as Boarders appear here</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dorm Room</label>
                <select
                  value={allocateRoomId}
                  onChange={(e) => setAllocateRoomId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                >
                  {activeRooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.room_number} (Capacity: {r.capacity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAllocateModalOpen(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 text-white rounded-lg font-bold"
                >
                  Confirm Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
