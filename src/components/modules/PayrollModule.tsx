import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import { PdfGeneratorService } from '../../services/pdfGenerator';
import {
  Briefcase,
  Plus,
  DollarSign,
  Printer,
  CheckCircle2,
  XCircle,
  CalendarCheck,
  Clock,
} from 'lucide-react';
import { PayrollRecord, LeaveRequest } from '../../types';

export const PayrollModule: React.FC = () => {
  const { currentSchool, currentUser } = useAuth();
  if (!currentSchool) return null;
  const schoolId = currentSchool.id;

  const teachers = dbService.getTeachers(schoolId);
  const [activeTab, setActiveTab] = useState<'payroll' | 'leave' | 'attendance'>('payroll');

  const [month, setMonth] = useState(2); // February
  const [year, setYear] = useState(2026);

  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>(() =>
    dbService.getPayrollRecords(schoolId)
  );

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(() =>
    dbService.getLeaveRequests(schoolId)
  );

  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleGeneratePayroll = () => {
    const records = dbService.generateMonthlyPayroll(schoolId, month, year);
    setPayrollRecords(dbService.getPayrollRecords(schoolId));
    setStatusMsg({
      type: 'success',
      text: `Generated monthly payroll for ${records.length} teaching staff with Kenyan statutory deductions (PAYE, SHIF, NSSF & Housing Levy).`,
    });
  };

  const handleMarkPaid = (recordId: string) => {
    dbService.markPayrollPaid(schoolId, recordId);
    setPayrollRecords(dbService.getPayrollRecords(schoolId));
    setStatusMsg({ type: 'success', text: 'Marked salary as successfully paid.' });
  };

  const handleDownloadPayslip = (p: PayrollRecord) => {
    const tch = teachers.find((t) => t.id === p.teacher_id);
    if (!tch) return;

    const doc = PdfGeneratorService.generatePayslipPdf(currentSchool, tch, tch.user, p);
    doc.save(`Payslip_${tch.user.full_name.replace(/\s+/g, '_')}_M${p.month}_${p.year}.pdf`);
  };

  const handleApproveLeave = (reqId: string) => {
    dbService.updateLeaveStatus(schoolId, reqId, 'approved', currentUser?.full_name || 'Principal');
    setLeaveRequests(dbService.getLeaveRequests(schoolId));
    setStatusMsg({ type: 'success', text: 'Leave request approved.' });
  };

  const handleRejectLeave = (reqId: string) => {
    dbService.updateLeaveStatus(schoolId, reqId, 'rejected', currentUser?.full_name || 'Principal');
    setLeaveRequests(dbService.getLeaveRequests(schoolId));
    setStatusMsg({ type: 'success', text: 'Leave request rejected.' });
  };

  const totalPayrollGross = payrollRecords.reduce((sum, p) => sum + p.basic_salary + p.allowances, 0);
  const totalPayrollNet = payrollRecords.reduce((sum, p) => sum + p.net_pay, 0);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Briefcase className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Teaching Staff Payroll & Leave
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Monthly payroll processing with PAYE, SHIF (2.75%), NSSF & Housing Levy statutory deductions and printable payslips
          </p>
        </div>

        <button
          onClick={handleGeneratePayroll}
          className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
        >
          <DollarSign className="w-4 h-4" />
          Generate Monthly Payroll
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
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold w-fit">
        <button
          onClick={() => setActiveTab('payroll')}
          className={`px-3 py-1.5 rounded-lg transition ${
            activeTab === 'payroll' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Payroll & Payslips ({payrollRecords.length})
        </button>
        <button
          onClick={() => setActiveTab('leave')}
          className={`px-3 py-1.5 rounded-lg transition ${
            activeTab === 'leave' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Staff Leave Approvals ({leaveRequests.length})
        </button>
      </div>

      {/* Payroll Tab */}
      {activeTab === 'payroll' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-500">Gross Staff Earnings</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                KES {totalPayrollGross.toLocaleString()}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-500">Total Net Remitted</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                KES {totalPayrollNet.toLocaleString()}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-slate-500">Statutory Deductions (Tax & Levies)</span>
              <div className="text-2xl font-black text-slate-700 mt-1">
                KES {(totalPayrollGross - totalPayrollNet).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            {/* Desktop Table View (>= 768px) */}
            <div className="hidden md:block">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="py-3 px-4">Employee / TSC No</th>
                    <th className="py-3 px-4">Month/Year</th>
                    <th className="py-3 px-4">Basic Pay</th>
                    <th className="py-3 px-4">Allowances</th>
                    <th className="py-3 px-4">Deductions</th>
                    <th className="py-3 px-4">Net Salary</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Payslip PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {payrollRecords.map((p) => {
                    const tch = teachers.find((t) => t.id === p.teacher_id);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{tch?.user.full_name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{tch?.employee_number}</div>
                        </td>
                        <td className="py-3 px-4 font-semibold">
                          Month {p.month}/{p.year}
                        </td>
                        <td className="py-3 px-4">KES {p.basic_salary.toLocaleString()}</td>
                        <td className="py-3 px-4 text-emerald-700">KES {p.allowances.toLocaleString()}</td>
                        <td className="py-3 px-4 text-rose-700">KES {p.deductions.toLocaleString()}</td>
                        <td className="py-3 px-4 font-black text-slate-900">KES {p.net_pay.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              p.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {p.status !== 'paid' && (
                              <button
                                onClick={() => handleMarkPaid(p.id)}
                                className="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold rounded text-[11px]"
                              >
                                Mark Paid
                              </button>
                            )}
                            <button
                              onClick={() => handleDownloadPayslip(p)}
                              className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 rounded text-slate-800 font-bold inline-flex items-center gap-1 shadow-xs"
                            >
                              <Printer className="w-3.5 h-3.5 text-emerald-700" />
                              Payslip PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card-Based View (< 768px) */}
            <div className="md:hidden divide-y divide-slate-100">
              {payrollRecords.map((p) => {
                const tch = teachers.find((t) => t.id === p.teacher_id);
                return (
                  <div key={p.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-sm text-slate-900">{tch?.user.full_name}</div>
                        <div className="text-[11px] font-mono text-slate-400">TSC/Emp: {tch?.employee_number}</div>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          p.status === 'paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Period:</span>
                        <span className="font-semibold text-slate-800">Month {p.month}/{p.year}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Basic Pay:</span>
                        <span className="font-mono text-slate-800">KES {p.basic_salary.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Allowances:</span>
                        <span className="font-mono text-emerald-700 font-semibold">+ KES {p.allowances.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Deductions (PAYE/SHIF/NSSF/Levy):</span>
                        <span className="font-mono text-rose-700 font-semibold">- KES {p.deductions.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200">
                        <span className="font-bold text-slate-900">Net Take-Home:</span>
                        <span className="font-mono font-black text-emerald-800 text-sm">KES {p.net_pay.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      {p.status !== 'paid' && (
                        <button
                          onClick={() => handleMarkPaid(p.id)}
                          className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold rounded-xl text-xs min-h-[44px]"
                        >
                          Mark as Paid
                        </button>
                      )}
                      <button
                        onClick={() => handleDownloadPayslip(p)}
                        className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl text-slate-800 font-bold inline-flex items-center gap-1.5 shadow-xs text-xs min-h-[44px]"
                      >
                        <Printer className="w-4 h-4 text-emerald-700" />
                        Download Payslip PDF
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Leave Tab */}
      {activeTab === 'leave' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Dates</th>
                  <th className="py-3 px-4">Reason / Workshop</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Approval Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {leaveRequests.map((l) => {
                  const tch = teachers.find((t) => t.id === l.teacher_id);
                  return (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-bold text-slate-900">{tch?.user.full_name}</td>
                      <td className="py-3 px-4">{l.start_date} to {l.end_date}</td>
                      <td className="py-3 px-4 text-slate-600">{l.reason}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            l.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : l.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {l.status === 'pending' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApproveLeave(l.id)}
                              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectLeave(l.id)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded font-bold"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card-Based View (< 768px) */}
          <div className="md:hidden divide-y divide-slate-100">
            {leaveRequests.map((l) => {
              const tch = teachers.find((t) => t.id === l.teacher_id);
              return (
                <div key={l.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-sm text-slate-900">{tch?.user.full_name}</div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        l.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : l.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {l.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">Duration:</span> {l.start_date} to {l.end_date}
                  </div>
                  <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl">
                    <span className="font-semibold text-slate-800">Reason:</span> {l.reason}
                  </div>

                  {l.status === 'pending' && (
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleRejectLeave(l.id)}
                        className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs min-h-[44px]"
                      >
                        Reject Request
                      </button>
                      <button
                        onClick={() => handleApproveLeave(l.id)}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs min-h-[44px]"
                      >
                        Approve Leave
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
