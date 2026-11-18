import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import {
  Server,
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';
import { PlanType, School, SchoolStatus } from '../../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { DatabaseHealthDashboard } from './DatabaseHealthDashboard';

export const PlatformOwnerDashboard: React.FC = () => {
  const { impersonateSchool, refreshState } = useAuth();
  const [schools, setSchools] = useState<School[]>(() => dbService.getSchools());
  const [selectedPlanModal, setSelectedPlanModal] = useState<School | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'schools' | 'audits' | 'database'>('overview');

  const auditLogs = dbService.getPlatformAuditLogs();

  // Metrics calculation
  const totalSchools = schools.length;
  const activeSchools = schools.filter((s) => s.status === 'active').length;

  let totalStudents = 0;
  let totalTeachers = 0;
  schools.forEach((s) => {
    totalStudents += dbService.getStudents(s.id).length;
    totalTeachers += dbService.getTeachers(s.id).length;
  });

  // MRR estimation
  // Pro: KES 18,000 / 3 mo = KES 6,000 / mo. Basic: KES 8,500 / 3 = KES 2,833 / mo.
  const mrr = schools.reduce((acc, s) => {
    if (s.status !== 'active') return acc;
    if (s.plan === 'pro') return acc + 6000;
    if (s.plan === 'basic') return acc + 2833;
    return acc;
  }, 0);

  const handleStatusToggle = (school: School) => {
    const newStatus: SchoolStatus = school.status === 'active' ? 'suspended' : 'active';
    dbService.updateSchoolStatus(school.id, newStatus, 'usr-platform-owner');
    setSchools([...dbService.getSchools()]);
    refreshState();
  };

  const handlePlanChange = (schoolId: string, newPlan: PlanType) => {
    dbService.updateSchoolPlan(schoolId, newPlan, 'usr-platform-owner');
    setSchools([...dbService.getSchools()]);
    setSelectedPlanModal(null);
    refreshState();
  };

  const planData = [
    { name: 'Pro (KES 18K)', count: schools.filter((s) => s.plan === 'pro').length, color: '#047857' },
    { name: 'Basic (KES 8.5K)', count: schools.filter((s) => s.plan === 'basic').length, color: '#0284c7' },
    { name: 'Free Tier', count: schools.filter((s) => s.plan === 'free').length, color: '#64748b' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Server className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Platform SaaS Command Center</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Multi-Tenant Platform Owner administration, billing MRR, school isolation & audited impersonation
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'overview' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Metrics & Overview
          </button>
          <button
            onClick={() => setActiveTab('schools')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'schools' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tenant Schools ({schools.length})
          </button>
          <button
            onClick={() => setActiveTab('audits')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === 'audits' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Platform Audits ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              activeTab === 'database' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            PostgreSQL Health
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Schools</span>
            <Building2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalSchools}</div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">100% cloud provisioned</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active Tenants</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{activeSchools}</div>
          <div className="text-[11px] text-slate-500 mt-1">{totalSchools - activeSchools} suspended</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Learners</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalStudents}</div>
          <div className="text-[11px] text-blue-700 font-semibold mt-1">Across PP1 to Grade 9</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Teaching Staff</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">{totalTeachers}</div>
          <div className="text-[11px] text-indigo-700 font-semibold mt-1">TSC certified leads</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Est. Monthly MRR</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">KES {Math.round(mrr).toLocaleString()}</div>
          <div className="text-[11px] text-amber-700 font-semibold mt-1">SaaS Subscription Revenue</div>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Plan Distribution Chart */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Tenant Plan Distribution</h3>
            <p className="text-xs text-slate-500 mb-4">Breakdown of schools across SaaS tiers</p>
            <div className="h-60 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {planData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Platform Security & Isolation overview */}
          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Multi-Tenant Isolation & Impersonation Security</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  Mandatory school_id Filter
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Every query automatically verifies <code>req.schoolId</code>. Cross-tenant leakage is strictly blocked.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  Audited Impersonation
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Platform owner can jump into any school as admin. Timestamps and actor identities are immutably logged.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  Instant CBC Pre-Seeding
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Upon registration, PP1 through Grade 9 along with all KICD subjects are automatically populated.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                  Kenya DPA 2019 Privacy
                </div>
                <p className="text-[11px] text-slate-600 mt-1">
                  Built-in ODPC data subject rights, parent consent ledgers, and 7-day SLA request management.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Recent Platform Events
              </h4>
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {auditLogs.slice(0, 4).map((log) => (
                  <div key={log.id} className="text-xs p-2.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">{log.action}</span>
                      <span className="text-slate-500 ml-2">on {log.entity}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'schools' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Registered School Tenants</h3>
            <span className="text-xs text-slate-500">{schools.length} total institutions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="py-3 px-4 font-bold">School Name & Slug</th>
                  <th className="py-3 px-4 font-bold">Contact / Location</th>
                  <th className="py-3 px-4 font-bold">SaaS Plan</th>
                  <th className="py-3 px-4 font-bold">Learners</th>
                  <th className="py-3 px-4 font-bold">Teachers</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {schools.map((s) => {
                  const sCount = dbService.getStudents(s.id).length;
                  const tCount = dbService.getTeachers(s.id).length;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{s.name}</div>
                        <div className="text-[11px] text-emerald-700 font-mono">slug: {s.slug}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div>{s.address}</div>
                        <div className="text-[11px] text-slate-400">{s.phone} | {s.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => setSelectedPlanModal(s)}
                          className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-slate-100 hover:bg-slate-200 text-slate-800 transition"
                          title="Click to upgrade or downgrade plan"
                        >
                          {s.plan} ▾
                        </button>
                      </td>
                      <td className="py-3 px-4 font-semibold">{sCount}</td>
                      <td className="py-3 px-4 font-semibold">{tCount}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            s.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => impersonateSchool(s.id)}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-[11px] font-bold transition flex items-center gap-1 shadow-xs"
                            title="Impersonate School Administrator (Audited)"
                          >
                            <ShieldAlert className="w-3 h-3" />
                            Impersonate
                          </button>
                          <button
                            onClick={() => handleStatusToggle(s)}
                            className={`px-2 py-1 rounded text-[11px] font-bold transition ${
                              s.status === 'active'
                                ? 'bg-slate-100 hover:bg-rose-100 text-rose-700'
                                : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                            }`}
                          >
                            {s.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'audits' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Platform-Level Audit Trail</h3>
            <span className="text-xs text-slate-500">Tamper-evident logs of tenant & owner actions</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="py-3 px-4 font-bold">Timestamp</th>
                  <th className="py-3 px-4 font-bold">Actor</th>
                  <th className="py-3 px-4 font-bold">Action</th>
                  <th className="py-3 px-4 font-bold">Target School</th>
                  <th className="py-3 px-4 font-bold">Entity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {auditLogs.map((log) => {
                  const targetSchool = schools.find((s) => s.id === log.school_id);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{log.actor_id}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded font-mono font-bold bg-slate-100 text-slate-800 text-[11px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4">{targetSchool?.name || log.school_id}</td>
                      <td className="py-3 px-4 text-slate-500">{log.entity}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'database' && (
        <div className="bg-slate-50/50 rounded-2xl border border-slate-200 overflow-hidden">
          <DatabaseHealthDashboard />
        </div>
      )}

      {/* Plan Change Modal */}
      {selectedPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Update Plan: {selectedPlanModal.name}
            </h3>
            <p className="text-xs text-slate-500">
              Select the SaaS tier to apply to this school tenant:
            </p>

            <div className="space-y-2">
              {(['free', 'basic', 'pro'] as PlanType[]).map((plan) => (
                <button
                  key={plan}
                  onClick={() => handlePlanChange(selectedPlanModal.id, plan)}
                  className={`w-full p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition ${
                    selectedPlanModal.plan === plan
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="capitalize">{plan} Plan</div>
                  <span className="text-[11px] text-slate-500 font-normal">
                    {plan === 'free' ? 'Up to 150 students' : plan === 'basic' ? 'Up to 500 students' : 'Unlimited'}
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedPlanModal(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
