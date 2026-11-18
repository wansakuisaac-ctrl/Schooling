import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import {
  DoorOpen,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Printer,
  ShieldCheck,
  UserCheck,
  Search,
  Users,
  Car,
  QrCode,
  FileText,
  Phone,
  Check,
  X,
  LogOut,
  LogIn,
} from 'lucide-react';
import { GatePass, VisitorPass } from '../../types';

export const GatePassModule: React.FC = () => {
  const { currentSchool, currentUser } = useAuth();
  if (!currentSchool) return null;
  const schoolId = currentSchool.id;

  const [activeTab, setActiveTab] = useState<'learners' | 'visitors'>('learners');

  // Learner Passes State
  const [passes, setPasses] = useState<GatePass[]>(() => dbService.getGatePasses(schoolId));
  const students = dbService.getStudents(schoolId);
  const parents = dbService.getParents(schoolId);

  // Visitor Passes State
  const [visitorPasses, setVisitorPasses] = useState<VisitorPass[]>(() =>
    dbService.getVisitorPasses(schoolId)
  );

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');

  // Modal: Issue Learner Pass
  const [isLearnerModalOpen, setIsLearnerModalOpen] = useState(false);
  const [studentId, setStudentId] = useState(students[0]?.id || '');
  const [reason, setReason] = useState('Medical clinic appointment with parent');
  const [pickedUpBy, setPickedUpBy] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [outTime, setOutTime] = useState(
    `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  );

  // Modal: Check-in Visitor
  const [isVisitorModalOpen, setIsVisitorModalOpen] = useState(false);
  const [visitorName, setVisitorName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [vehicleReg, setVehicleReg] = useState('Pedestrian');
  const [personToVisit, setPersonToVisit] = useState('Principal / Headteacher');
  const [department, setDepartment] = useState('Administration');
  const [visitorPurpose, setVisitorPurpose] = useState('Official consultation / inquiry');
  const [badgeNumber, setBadgeNumber] = useState(
    `TAG-${Math.floor(10 + Math.random() * 90)}`
  );

  // Print Slip Preview Modal
  const [selectedPassForPrint, setSelectedPassForPrint] = useState<GatePass | null>(null);

  // Metrics
  const activeLearnersOffCampus = passes.filter((p) => p.status === 'active').length;
  const activeVisitorsOnCampus = visitorPasses.filter((v) => v.status === 'on_campus').length;
  const totalMovementsToday = passes.length + visitorPasses.length;

  // Handlers: Learner Pass
  const handleOpenLearnerModal = () => {
    const std = students[0];
    setStudentId(std?.id || '');
    const prt = parents.find((p) => p.user_id === std?.parent_user_id || p.id === std?.parent_user_id);
    setPickedUpBy(prt?.user?.full_name || 'Designated Parent/Guardian');
    setContactPhone(prt?.user?.phone || '0722000000');
    setOutTime(
      `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    );
    setIsLearnerModalOpen(true);
  };

  const handleStudentSelect = (id: string) => {
    setStudentId(id);
    const std = students.find((s) => s.id === id);
    const prt = parents.find((p) => p.user_id === std?.parent_user_id || p.id === std?.parent_user_id);
    if (prt) {
      setPickedUpBy(prt.user?.full_name || 'Parent/Guardian');
      setContactPhone(prt.user?.phone || '0722000000');
    }
  };

  const handleCreateLearnerPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId || !reason) return;

    const newPass = dbService.createGatePass(schoolId, {
      student_id: studentId,
      reason,
      out_time: outTime,
      approved_by: currentUser?.full_name || 'Discipline Master / Headteacher',
      picked_up_by: pickedUpBy,
      contact_phone: contactPhone,
    });

    setPasses(dbService.getGatePasses(schoolId));
    setIsLearnerModalOpen(false);
    setSelectedPassForPrint(newPass);
  };

  const handleReturnLearner = (passId: string) => {
    const inTime = `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    dbService.markGatePassReturned(schoolId, passId, inTime);
    setPasses(dbService.getGatePasses(schoolId));
  };

  // Handlers: Visitor Pass
  const handleCreateVisitorPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName || !nationalId || !visitorPhone) return;

    dbService.createVisitorPass(schoolId, {
      visitor_name: visitorName,
      national_id: nationalId,
      phone: visitorPhone,
      vehicle_reg: vehicleReg || 'Pedestrian',
      person_to_visit: personToVisit,
      department: department,
      purpose: visitorPurpose,
      badge_number: badgeNumber,
      time_in: `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    });

    setVisitorPasses(dbService.getVisitorPasses(schoolId));
    setIsVisitorModalOpen(false);
    setVisitorName('');
    setNationalId('');
    setVisitorPhone('');
    setBadgeNumber(`TAG-${Math.floor(10 + Math.random() * 90)}`);
  };

  const handleCheckOutVisitor = (passId: string) => {
    const timeOut = `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    dbService.checkOutVisitor(schoolId, passId, timeOut);
    setVisitorPasses(dbService.getVisitorPasses(schoolId));
  };

  // Filtered lists
  const filteredLearnerPasses = passes.filter((gp) => {
    const std = students.find((s) => s.id === gp.student_id);
    const matchesQuery =
      std?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      std?.admission_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gp.reason.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesQuery) return false;
    if (statusFilter === 'active') return gp.status === 'active';
    if (statusFilter === 'completed') return gp.status === 'returned';
    return true;
  });

  const filteredVisitorPasses = visitorPasses.filter((vp) => {
    const matchesQuery =
      vp.visitor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vp.national_id.includes(searchQuery) ||
      vp.vehicle_reg?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vp.person_to_visit.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesQuery) return false;
    if (statusFilter === 'active') return vp.status === 'on_campus';
    if (statusFilter === 'completed') return vp.status === 'checked_out';
    return true;
  });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Print CSS */}
      <style>
        {`
          @media print {
            body {
              background: #fff !important;
              color: #000 !important;
            }
            header, nav, aside, .no-print, button {
              display: none !important;
            }
            .print-only {
              display: block !important;
            }
            .gate-pass-slip {
              width: 148mm !important;
              height: 210mm !important;
              padding: 10mm !important;
              border: 2px dashed #333 !important;
              margin: 0 auto !important;
              page-break-after: avoid !important;
            }
          }
        `}
      </style>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Campus Security &amp; Gate Pass Register
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Student exeat slips, parent pickup verification, visitor logbook, and security checkpoint gate tracking
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'learners' ? (
            <button
              onClick={handleOpenLearnerModal}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              Issue Learner Gate Pass
            </button>
          ) : (
            <button
              onClick={() => setIsVisitorModalOpen(true)}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              Register Campus Visitor
            </button>
          )}
        </div>
      </div>

      {/* Live Campus Security Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="flex items-center justify-between text-amber-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Off-Campus Now</span>
            <DoorOpen className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-950 mt-1">{activeLearnersOffCampus}</div>
          <div className="text-[10px] text-amber-700 mt-0.5">Learners on valid exeat</div>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl">
          <div className="flex items-center justify-between text-blue-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Visitors on Campus</span>
            <UserCheck className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-blue-950 mt-1">{activeVisitorsOnCampus}</div>
          <div className="text-[10px] text-blue-700 mt-0.5">Active visitor badges</div>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
          <div className="flex items-center justify-between text-slate-700">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Move Logs</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{totalMovementsToday}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Exits &amp; visitor entries</div>
        </div>

        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
          <div className="flex items-center justify-between text-emerald-800">
            <span className="text-[11px] font-bold uppercase tracking-wider">Checkpoint Gate</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-sm font-black text-emerald-950 mt-2">Station 1 Main Gate</div>
          <div className="text-[10px] text-emerald-700 mt-0.5">KPS Safeguarding Active</div>
        </div>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs no-print">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('learners')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === 'learners'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Learner Gate Passes ({passes.length})
          </button>
          <button
            onClick={() => setActiveTab('visitors')}
            className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
              activeTab === 'visitors'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Visitor Logbook ({visitorPasses.length})
          </button>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'learners' ? 'Search student or reason...' : 'Search visitor or vehicle...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700 min-h-[36px]"
          >
            <option value="all">All Status</option>
            <option value="active">Active Now</option>
            <option value="completed">Returned / Checked-Out</option>
          </select>
        </div>
      </div>

      {/* TAB 1: LEARNER GATE PASSES */}
      {activeTab === 'learners' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs no-print">
          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4">Learner / Adm</th>
                  <th className="py-3 px-4">Departure Time</th>
                  <th className="py-3 px-4">Reason for Exeat</th>
                  <th className="py-3 px-4">Picked Up By</th>
                  <th className="py-3 px-4">Return Time</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Gate Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredLearnerPasses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No learner gate passes found matching active filters.
                    </td>
                  </tr>
                ) : (
                  filteredLearnerPasses.map((gp) => {
                    const std = students.find((s) => s.id === gp.student_id);
                    return (
                      <tr key={gp.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{std?.full_name}</div>
                          <div className="text-[11px] font-mono text-slate-400">Adm: {std?.admission_number}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-medium">{gp.out_time}</td>
                        <td className="py-3 px-4 max-w-xs">{gp.reason}</td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800">{gp.picked_up_by || 'Parent/Guardian'}</div>
                          {gp.contact_phone && (
                            <div className="text-[10px] font-mono text-slate-500">{gp.contact_phone}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-emerald-800">
                          {gp.in_time || (
                            <span className="text-amber-700 font-bold">Still Off-Campus</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              gp.status === 'returned'
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {gp.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedPassForPrint(gp)}
                              className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-[11px] inline-flex items-center gap-1 shadow-xs"
                              title="Print Physical Gate Pass Slip"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-500" />
                              Slip
                            </button>
                            {gp.status === 'active' && (
                              <button
                                onClick={() => handleReturnLearner(gp.id)}
                                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-[11px] transition shadow-xs"
                              >
                                Mark Returned
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card-Based View (< 768px) */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredLearnerPasses.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No learner gate passes found matching active filters.
              </div>
            ) : (
              filteredLearnerPasses.map((gp) => {
                const std = students.find((s) => s.id === gp.student_id);
                return (
                  <div key={gp.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-sm text-slate-900">{std?.full_name}</div>
                        <div className="text-[11px] font-mono text-slate-500">Adm: {std?.admission_number}</div>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          gp.status === 'returned'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {gp.status}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl text-xs space-y-1">
                      <div>
                        <span className="text-slate-500 font-medium">Reason:</span>{' '}
                        <span className="font-semibold text-slate-800">{gp.reason}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Departure:</span>{' '}
                        <span className="font-mono text-slate-800">{gp.out_time}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Escort / Parent:</span>{' '}
                        <span className="font-semibold text-slate-800">{gp.picked_up_by || 'Parent/Guardian'}</span>
                        {gp.contact_phone && <span className="font-mono text-slate-400 text-[10px] ml-1">({gp.contact_phone})</span>}
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">Return Time:</span>{' '}
                        <span className="font-mono text-emerald-800 font-bold">
                          {gp.in_time || 'Pending Return'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => setSelectedPassForPrint(gp)}
                        className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs inline-flex items-center gap-1.5 shadow-xs min-h-[44px]"
                      >
                        <Printer className="w-4 h-4 text-slate-600" />
                        Print Gate Slip
                      </button>
                      {gp.status === 'active' && (
                        <button
                          onClick={() => handleReturnLearner(gp.id)}
                          className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs transition shadow-xs min-h-[44px]"
                        >
                          Check In Learner
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: VISITOR REGISTER */}
      {activeTab === 'visitors' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs no-print">
          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4">Visitor / National ID</th>
                  <th className="py-3 px-4">Vehicle Reg</th>
                  <th className="py-3 px-4">Host / Department</th>
                  <th className="py-3 px-4">Purpose of Visit</th>
                  <th className="py-3 px-4">Tag #</th>
                  <th className="py-3 px-4">Time In</th>
                  <th className="py-3 px-4">Time Out</th>
                  <th className="py-3 px-4 text-right">Checkpoint</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredVisitorPasses.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No visitor records found matching active filters.
                    </td>
                  </tr>
                ) : (
                  filteredVisitorPasses.map((vp) => (
                    <tr key={vp.id} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{vp.visitor_name}</div>
                        <div className="text-[11px] font-mono text-slate-400">
                          ID: {vp.national_id} • {vp.phone}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {vp.vehicle_reg || 'Pedestrian'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{vp.person_to_visit}</div>
                        <div className="text-[10px] text-slate-400">{vp.department}</div>
                      </td>
                      <td className="py-3 px-4 max-w-xs">{vp.purpose}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                          {vp.badge_number}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium">{vp.time_in}</td>
                      <td className="py-3 px-4 font-mono font-medium text-emerald-800">
                        {vp.time_out || (
                          <span className="text-blue-700 font-bold">On Campus</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {vp.status === 'on_campus' ? (
                          <button
                            onClick={() => handleCheckOutVisitor(vp.id)}
                            className="px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-lg text-[11px] transition shadow-xs inline-flex items-center gap-1"
                          >
                            <LogOut className="w-3 h-3" />
                            Check Out
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                            Departed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card-Based View (< 768px) */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredVisitorPasses.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No visitor records found matching active filters.
              </div>
            ) : (
              filteredVisitorPasses.map((vp) => (
                <div key={vp.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-slate-900">{vp.visitor_name}</div>
                      <div className="text-[11px] font-mono text-slate-500">
                        ID: {vp.national_id} • Tel: {vp.phone}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded text-xs shrink-0">
                      {vp.badge_number}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-xl text-xs space-y-1">
                    <div>
                      <span className="text-slate-500 font-medium">Visiting:</span>{' '}
                      <span className="font-semibold text-slate-800">{vp.person_to_visit} ({vp.department})</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Purpose:</span>{' '}
                      <span className="text-slate-700">{vp.purpose}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-slate-500 font-medium">Vehicle:</span>{' '}
                        <span className="font-mono font-bold text-slate-800">{vp.vehicle_reg}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium">In:</span>{' '}
                        <span className="font-mono text-slate-800">{vp.time_in}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        vp.status === 'on_campus'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {vp.status === 'on_campus' ? 'On Campus' : 'Departed'}
                    </span>

                    {vp.status === 'on_campus' && (
                      <button
                        onClick={() => handleCheckOutVisitor(vp.id)}
                        className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold rounded-xl text-xs transition shadow-xs min-h-[44px] flex items-center gap-1.5"
                      >
                        <LogOut className="w-4 h-4" />
                        Check Out Visitor
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: ISSUE LEARNER GATE PASS */}
      {isLearnerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                  <DoorOpen className="w-5 h-5" />
                </span>
                <h3 className="font-bold text-base text-slate-900">Issue Student Exeat Gate Pass</h3>
              </div>
              <button
                onClick={() => setIsLearnerModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLearnerPass} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Learner</label>
                <select
                  value={studentId}
                  onChange={(e) => handleStudentSelect(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold min-h-[44px]"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} ({s.admission_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Exeat / Departure</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium min-h-[44px] mb-2"
                >
                  <option value="Medical clinic appointment / Health center visit">Medical appointment / Clinic visit</option>
                  <option value="Official parent/guardian custody pick-up">Official parent/guardian custody pick-up</option>
                  <option value="Inter-school CBC academic / sports competition">Inter-school academic / sports competition</option>
                  <option value="Family bereavement / compassionate leave">Family compassionate leave</option>
                  <option value="Special national assessment / KNEC verification">KNEC / National assessment verification</option>
                </select>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Or enter custom reason..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Escort / Picked Up By</label>
                  <input
                    type="text"
                    value={pickedUpBy}
                    onChange={(e) => setPickedUpBy(e.target.value)}
                    placeholder="Parent / Guardian Name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Emergency Contact Phone</label>
                  <input
                    type="text"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="e.g. 0722123456"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-medium min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Departure Timestamp</label>
                <input
                  type="text"
                  value={outTime}
                  onChange={(e) => setOutTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-xs min-h-[44px]"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  Issuing this pass registers the learner as officially off-campus and generates a printable security gate pass slip.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsLearnerModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition shadow-xs min-h-[44px]"
                >
                  Authorize &amp; Print Slip
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTER CAMPUS VISITOR */}
      {isVisitorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto no-print">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-blue-100 text-blue-800 rounded-lg">
                  <UserCheck className="w-5 h-5" />
                </span>
                <h3 className="font-bold text-base text-slate-900">Campus Visitor Registration</h3>
              </div>
              <button
                onClick={() => setIsVisitorModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVisitorPass} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Visitor Full Name *</label>
                  <input
                    type="text"
                    required
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    placeholder="e.g. Mary Atieno Onyango"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">National ID / Passport *</label>
                  <input
                    type="text"
                    required
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="e.g. 29481023"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-medium min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mobile Phone *</label>
                  <input
                    type="text"
                    required
                    value={visitorPhone}
                    onChange={(e) => setVisitorPhone(e.target.value)}
                    placeholder="07..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-medium min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vehicle Reg (or Pedestrian)</label>
                  <input
                    type="text"
                    value={vehicleReg}
                    onChange={(e) => setVehicleReg(e.target.value)}
                    placeholder="e.g. KDA 482B or Pedestrian"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono font-medium min-h-[44px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Person / Office to Visit</label>
                  <input
                    type="text"
                    value={personToVisit}
                    onChange={(e) => setPersonToVisit(e.target.value)}
                    placeholder="e.g. Principal / Bursar"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Security Badge / Tag #</label>
                  <input
                    type="text"
                    value={badgeNumber}
                    onChange={(e) => setBadgeNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-indigo-900 font-mono font-bold min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Purpose of Visit</label>
                <textarea
                  rows={2}
                  value={visitorPurpose}
                  onChange={(e) => setVisitorPurpose(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsVisitorModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold transition shadow-xs min-h-[44px]"
                >
                  Check In &amp; Issue Badge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PRINTABLE STUDENT GATE PASS SLIP DIALOG */}
      {selectedPassForPrint && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b pb-3 no-print">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-base text-slate-900">Student Gate Pass Slip</h3>
              </div>
              <button
                onClick={() => setSelectedPassForPrint(null)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Slip Container */}
            <div className="p-5 border-2 border-dashed border-slate-300 rounded-2xl bg-white space-y-4 text-xs text-slate-800 gate-pass-slip">
              {/* Slip Header */}
              <div className="text-center border-b pb-3">
                <div className="font-black text-sm uppercase tracking-wider text-slate-900">
                  {currentSchool.name}
                </div>
                <div className="text-[10px] text-slate-500">
                  {currentSchool.address} • Tel: {currentSchool.phone}
                </div>
                <div className="mt-2 inline-block px-3 py-1 bg-emerald-100 text-emerald-900 font-black rounded-lg text-xs uppercase tracking-wider">
                  Official Learner Exeat Gate Pass
                </div>
              </div>

              {/* Learner Info */}
              {(() => {
                const std = students.find((s) => s.id === selectedPassForPrint.student_id);
                return (
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500 font-bold">Pass Serial No:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {selectedPassForPrint.id.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500 font-bold">Learner Name:</span>
                      <span className="font-bold text-slate-900">{std?.full_name}</span>
                    </div>

                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500 font-bold">Admission No:</span>
                      <span className="font-mono font-bold text-slate-900">{std?.admission_number}</span>
                    </div>

                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500 font-bold">Departure Time:</span>
                      <span className="font-mono text-slate-900">{selectedPassForPrint.out_time}</span>
                    </div>

                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500 font-bold">Authorized Reason:</span>
                      <span className="font-medium text-slate-800">{selectedPassForPrint.reason}</span>
                    </div>

                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500 font-bold">Escort / Parent:</span>
                      <span className="font-semibold text-slate-900">
                        {selectedPassForPrint.picked_up_by || 'Designated Guardian'}
                      </span>
                    </div>

                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500 font-bold">Emergency Phone:</span>
                      <span className="font-mono text-slate-900">
                        {selectedPassForPrint.contact_phone || currentSchool.phone}
                      </span>
                    </div>

                    <div className="flex justify-between border-b pb-1">
                      <span className="text-slate-500 font-bold">Authorized By:</span>
                      <span className="font-medium text-slate-900">{selectedPassForPrint.approved_by}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Security Signatures */}
              <div className="pt-4 grid grid-cols-2 gap-4 text-[10px] border-t border-slate-200">
                <div>
                  <div className="font-bold text-slate-700">Security Gate Officer:</div>
                  <div className="border-b border-slate-400 w-28 my-2"></div>
                  <div className="text-slate-400">Signature &amp; Stamp</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-700">Parent / Escort:</div>
                  <div className="border-b border-slate-400 w-28 ml-auto my-2"></div>
                  <div className="text-slate-400">Custody Signature</div>
                </div>
              </div>

              <div className="text-center text-[9px] text-slate-400 pt-2 italic">
                Valid strictly for date and time indicated. Retain slip at gate upon student return.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t no-print">
              <button
                type="button"
                onClick={() => setSelectedPassForPrint(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 text-xs min-h-[44px]"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition flex items-center gap-1.5 shadow-xs text-xs min-h-[44px]"
              >
                <Printer className="w-4 h-4" />
                Print Physical Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
