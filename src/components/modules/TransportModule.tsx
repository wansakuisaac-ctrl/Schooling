import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import { Bus, Plus, MapPin, Clock, Users, CheckCircle2, AlertCircle, Printer } from 'lucide-react';
import { TransportRoute, RouteStop, StudentTransport } from '../../types';

export const TransportModule: React.FC = () => {
  const { currentSchool } = useAuth();
  if (!currentSchool) return null;
  const schoolId = currentSchool.id;

  const routes = dbService.getTransportRoutes(schoolId);
  const routeStops = dbService.getRouteStops(schoolId);
  const studentTransports = dbService.getStudentTransports(schoolId);
  const students = dbService.getStudents(schoolId);

  const [selectedRouteId, setSelectedRouteId] = useState<string>(routes[0]?.id || '');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignStudentId, setAssignStudentId] = useState(students[0]?.id || '');
  const [assignStopId, setAssignStopId] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activeRoute = routes.find((r) => r.id === selectedRouteId);
  const activeStops = routeStops.filter((s) => s.route_id === selectedRouteId);

  const assignedLearners = studentTransports
    .filter((st) => st.route_id === selectedRouteId)
    .map((st) => {
      const student = students.find((s) => s.id === st.student_id);
      const stop = routeStops.find((stp) => stp.id === st.stop_id);
      return {
        ...st,
        student,
        stop,
      };
    });

  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignStudentId || !assignStopId) return;

    try {
      dbService.assignStudentTransport(schoolId, {
        student_id: assignStudentId,
        route_id: selectedRouteId,
        stop_id: assignStopId,
        term: currentSchool.current_term,
        year: currentSchool.academic_year,
      });

      setIsAssignModalOpen(false);
      setStatusMsg({ type: 'success', text: 'Learner assigned to school transport route.' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
              <Bus className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">School Bus Transport Routes</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pick-up and drop-off logistics, schedule stops, bus rosters, and term transport invoicing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Printer className="w-4 h-4 text-emerald-700" />
            Print Route Roster
          </button>
          <button
            onClick={() => {
              if (activeStops.length > 0) setAssignStopId(activeStops[0].id);
              setIsAssignModalOpen(true);
            }}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Assign Learner to Bus
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Routes Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {routes.map((rt) => (
          <div
            key={rt.id}
            onClick={() => setSelectedRouteId(rt.id)}
            className={`p-4 rounded-2xl border cursor-pointer transition ${
              rt.id === selectedRouteId
                ? 'bg-amber-50/50 border-amber-500 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">{rt.name}</h3>
              <span className="font-bold text-xs text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                KES {rt.fee_per_term.toLocaleString()} / term
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{rt.description}</p>
          </div>
        ))}
      </div>

      {/* Stops & Assigned Learners */}
      {activeRoute && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Stops List */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-700" />
              Scheduled Route Stops & Timings
            </h3>

            <div className="space-y-3">
              {activeStops.map((st) => (
                <div key={st.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>Stop #{st.order_index}: {st.stop_name}</span>
                  </div>
                  <div className="text-slate-500 flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" /> Pick-up: {st.pickup_time}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" /> Drop-off: {st.dropoff_time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Assigned Learners Table */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">
                Learners on {activeRoute.name} ({assignedLearners.length})
              </h3>
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-2.5 px-4">Adm No</th>
                  <th className="py-2.5 px-4">Learner Name</th>
                  <th className="py-2.5 px-4">Designated Stop</th>
                  <th className="py-2.5 px-4">Term</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {assignedLearners.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No learners currently assigned to this bus route.
                    </td>
                  </tr>
                ) : (
                  assignedLearners.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                        {item.student?.admission_number}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">
                        {item.student?.full_name}
                      </td>
                      <td className="py-2.5 px-4">{item.stop?.stop_name}</td>
                      <td className="py-2.5 px-4 font-semibold text-emerald-800">
                        {item.term} {item.year}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Assign Learner to Bus Route</h3>
            <form onSubmit={handleAssignSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Learner</label>
                <select
                  value={assignStudentId}
                  onChange={(e) => setAssignStudentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.admission_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Designated Stop</label>
                <select
                  value={assignStopId}
                  onChange={(e) => setAssignStopId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                >
                  {activeStops.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.stop_name} (Pick-up: {st.pickup_time})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 text-white rounded-lg font-bold"
                >
                  Save Bus Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
