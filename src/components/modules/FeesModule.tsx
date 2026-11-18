import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useViewMode } from '../../context/ViewModeContext';
import { dbService } from '../../services/storage';
import { PdfGeneratorService } from '../../services/pdfGenerator';
import { ExcelExportService } from '../../services/excelExport';
import {
  DollarSign,
  Plus,
  Download,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  Smartphone,
  Monitor,
  Building,
  TrendingUp,
  Check,
  ArrowRight,
  ShieldCheck,
  PhoneCall,
  RefreshCw,
  Send,
} from 'lucide-react';
import { Invoice, Payment, FeeStructure, PaymentMethod } from '../../types';

export const FeesModule: React.FC = () => {
  const { currentSchool, currentUser } = useAuth();
  const { effectiveIsMobile } = useViewMode();
  if (!currentSchool) return null;
  const schoolId = currentSchool.id;

  const classes = dbService.getClasses(schoolId);
  const feeStructures = dbService.getFeeStructures(schoolId);
  const invoices = dbService.getInvoices(schoolId);
  const payments = dbService.getPayments(schoolId);
  const students = dbService.getStudents(schoolId);
  const parents = dbService.getParents(schoolId);

  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'structures'>('invoices');
  const [layoutMode, setLayoutMode] = useState<'cards' | 'table' | 'auto'>('auto');
  const showCards = layoutMode === 'cards' || (layoutMode === 'auto' && effectiveIsMobile);
  const [selectedInvoiceForPay, setSelectedInvoiceForPay] = useState<Invoice | null>(null);
  const [isInvoiceGenModalOpen, setIsInvoiceGenModalOpen] = useState(false);

  // M-Pesa STK Push Simulation State
  const [mpesaTab, setMpesaTab] = useState<'stk' | 'manual'>('stk');
  const [stkPhone, setStkPhone] = useState<string>('0722123456');
  const [stkStatus, setStkStatus] = useState<'idle' | 'sending' | 'prompt' | 'success'>('idle');
  const [stkPin, setStkPin] = useState<string>('');

  // Invoice Generation State
  const [invoiceGenClassId, setInvoiceGenClassId] = useState(classes[0]?.id || '');
  const [invoiceGenStructureId, setInvoiceGenStructureId] = useState(feeStructures[0]?.id || '');
  const [invoiceGenDueDate, setInvoiceGenDueDate] = useState('2026-04-15');

  // Record Payment State
  const [payAmount, setPayAmount] = useState<number>(10000);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('mpesa');
  const [payRef, setPayRef] = useState<string>('QKD89XLP47');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fee Adjustment Modal State
  const [selectedInvoiceForAdjust, setSelectedInvoiceForAdjust] = useState<Invoice | null>(null);
  const [adjustAmountDue, setAdjustAmountDue] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Bursary / Scholarship Waiver');

  // Financial Stats
  const totalBilled = invoices.reduce((sum, i) => sum + i.amount_due, 0);
  const totalPaid = invoices.reduce((sum, i) => sum + i.amount_paid, 0);
  const totalBalance = invoices.reduce((sum, i) => sum + i.balance, 0);
  const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

  const handleGenerateInvoices = () => {
    try {
      const res = dbService.generateInvoicesForClass(
        schoolId,
        invoiceGenClassId,
        invoiceGenStructureId,
        invoiceGenDueDate
      );
      setIsInvoiceGenModalOpen(false);
      setStatusMsg({
        type: 'success',
        text: `Generated ${res.count} invoices for the selected stream (adjusted for day vs boarding).`,
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForPay) return;

    try {
      const newPayment = dbService.recordPayment(schoolId, {
        invoice_id: selectedInvoiceForPay.id,
        amount_paid: Number(payAmount),
        payment_date: new Date().toISOString().split('T')[0],
        method: payMethod,
        reference: payRef,
        recorded_by: currentUser?.full_name || 'Accounts Bursar',
      });

      setStatusMsg({
        type: 'success',
        text: `Payment of KES ${payAmount.toLocaleString()} recorded. Receipt No: ${newPayment.receipt_number}.`,
      });

      // Automatically offer PDF receipt download
      const std = students.find((s) => s.id === selectedInvoiceForPay.student_id)!;
      const cls = classes.find((c) => c.id === std.class_id)!;
      const pdf = PdfGeneratorService.generateReceiptPdf(currentSchool, newPayment, selectedInvoiceForPay, std, cls);
      pdf.save(`${newPayment.receipt_number}.pdf`);

      setSelectedInvoiceForPay(null);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleOpenPayModal = (inv: Invoice) => {
    setSelectedInvoiceForPay(inv);
    setPayAmount(inv.balance);
    const std = students.find((s) => s.id === inv.student_id);
    const parent = parents.find((p) => p.user_id === std?.parent_user_id || p.id === std?.parent_user_id);
    setStkPhone(parent?.user?.phone || (parent as any)?.phone || '0722123456');
    setPayMethod('mpesa');
    setPayRef('SKD' + Math.floor(100000 + Math.random() * 900000).toString());
    setMpesaTab('stk');
    setStkStatus('idle');
    setStkPin('');
  };

  const handleOpenAdjustModal = (inv: Invoice) => {
    setSelectedInvoiceForAdjust(inv);
    setAdjustAmountDue(inv.amount_due);
    setAdjustReason('Bursary / Scholarship Waiver');
  };

  const handleConfirmFeeAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForAdjust) return;
    try {
      const updated = dbService.adjustInvoiceFee(
        schoolId,
        selectedInvoiceForAdjust.id,
        Number(adjustAmountDue),
        adjustReason
      );
      setStatusMsg({
        type: 'success',
        text: `Adjusted invoice ${updated.invoice_number} to KES ${updated.amount_due.toLocaleString()} (audit logged).`,
      });
      setSelectedInvoiceForAdjust(null);
    } catch (err: unknown) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to adjust invoice fee',
      });
    }
  };

  const handleTriggerStkPush = () => {
    setStkStatus('sending');
    setTimeout(() => {
      setStkStatus('prompt');
    }, 1000);
  };

  const handleConfirmStkPin = () => {
    if (!selectedInvoiceForPay) return;
    const generatedRef = 'SKD' + Math.floor(100000 + Math.random() * 900000).toString();
    setPayRef(generatedRef);
    setStkStatus('success');

    try {
      const newPayment = dbService.recordPayment(schoolId, {
        invoice_id: selectedInvoiceForPay.id,
        amount_paid: Number(payAmount),
        payment_date: new Date().toISOString().split('T')[0],
        method: 'mpesa',
        reference: generatedRef,
        recorded_by: currentUser?.full_name || 'Accounts Bursar (M-Pesa Express)',
      });

      setStatusMsg({
        type: 'success',
        text: `M-Pesa STK payment of KES ${payAmount.toLocaleString()} completed! Receipt: ${newPayment.receipt_number}.`,
      });

      const std = students.find((s) => s.id === selectedInvoiceForPay.student_id)!;
      const cls = classes.find((c) => c.id === std.class_id)!;
      const pdf = PdfGeneratorService.generateReceiptPdf(currentSchool, newPayment, selectedInvoiceForPay, std, cls);
      pdf.save(`${newPayment.receipt_number}.pdf`);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message });
    }
  };

  const handleDownloadReceipt = (payment: Payment) => {
    const inv = invoices.find((i) => i.id === payment.invoice_id);
    if (!inv) return;
    const std = students.find((s) => s.id === inv.student_id);
    if (!std) return;
    const cls = classes.find((c) => c.id === std.class_id) || classes[0];

    const pdf = PdfGeneratorService.generateReceiptPdf(currentSchool, payment, inv, std, cls);
    pdf.save(`${payment.receipt_number}.pdf`);
  };

  const handleExportExcel = () => {
    ExcelExportService.exportFeeCollection(invoices, payments, students, classes);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <DollarSign className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Fees, Invoicing & M-Pesa Receipts</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Day and boarding tiered fee schedules, automated invoice billing, and official financial receipt PDFs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            Export Collection Excel
          </button>
          <button
            onClick={() => setIsInvoiceGenModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Generate Invoices
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
          {statusMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 font-medium">Total Billed this Term</div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            KES {totalBilled.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{invoices.length} active invoices</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 font-medium">Collected Revenue</div>
          <div className="text-2xl font-black text-emerald-700 mt-1">
            KES {totalPaid.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
            {collectionRate}% collection rate
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 font-medium">Outstanding Balances</div>
          <div className="text-2xl font-black text-rose-700 mt-1">
            KES {totalBalance.toLocaleString()}
          </div>
          <div className="text-[11px] text-rose-600 font-semibold mt-1">Due for collection</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-slate-500 font-medium">Recorded Payments</div>
          <div className="text-2xl font-black text-blue-700 mt-1">{payments.length}</div>
          <div className="text-[11px] text-blue-700 font-semibold mt-1">M-Pesa & Bank transactions</div>
        </div>
      </div>

      {/* Tab Switcher & Layout Mode */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'invoices' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Invoices Register ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'payments' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Payment Transactions & Receipts ({payments.length})
          </button>
          <button
            onClick={() => setActiveTab('structures')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'structures' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Fee Structures ({feeStructures.length})
          </button>
        </div>

        {/* Responsive layout toggle for Invoices and Payments */}
        {activeTab !== 'structures' && (
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold self-start sm:self-auto">
            <button
              onClick={() => setLayoutMode('auto')}
              className={`px-2.5 py-1 rounded-lg transition ${
                layoutMode === 'auto' ? 'bg-white text-emerald-800 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Auto responsive"
            >
              Auto
            </button>
            <button
              onClick={() => setLayoutMode('cards')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
                layoutMode === 'cards' ? 'bg-white text-emerald-800 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Force card view"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setLayoutMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition ${
                layoutMode === 'table' ? 'bg-white text-emerald-800 font-bold shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Force table view"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>
        )}
      </div>

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <>
          {showCards ? (
            <div className="space-y-3">
              {invoices.map((inv) => {
                const std = students.find((s) => s.id === inv.student_id);
                return (
                  <div key={inv.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{std?.full_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Invoice: {inv.invoice_number} &bull; <span className="capitalize">{std?.student_type}</span>
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                          inv.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-center border border-slate-100">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Billed</div>
                        <div className="font-bold text-slate-800 text-xs">KES {inv.amount_due.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Paid</div>
                        <div className="font-bold text-emerald-700 text-xs">KES {inv.amount_paid.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Balance</div>
                        <div className="font-bold text-rose-700 text-xs">KES {inv.balance.toLocaleString()}</div>
                      </div>
                    </div>

                    <div className="pt-1 flex flex-col gap-2">
                      {inv.balance > 0 ? (
                        <button
                          onClick={() => handleOpenPayModal(inv)}
                          className="w-full min-h-[44px] px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>Record Payment (Balance: KES {inv.balance.toLocaleString()})</span>
                        </button>
                      ) : (
                        <div className="w-full min-h-[38px] bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Cleared &amp; Fully Paid</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenAdjustModal(inv)}
                        className="w-full min-h-[36px] px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition"
                      >
                        Adjust Fee Amount
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="py-3 px-4">Invoice No</th>
                    <th className="py-3 px-4">Learner Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Billed (KES)</th>
                    <th className="py-3 px-4">Paid (KES)</th>
                    <th className="py-3 px-4">Balance (KES)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {invoices.map((inv) => {
                    const std = students.find((s) => s.id === inv.student_id);
                    return (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{std?.full_name}</td>
                        <td className="py-3 px-4 capitalize">{std?.student_type}</td>
                        <td className="py-3 px-4">{inv.amount_due.toLocaleString()}</td>
                        <td className="py-3 px-4 text-emerald-700 font-semibold">{inv.amount_paid.toLocaleString()}</td>
                        <td className="py-3 px-4 font-bold text-rose-700">{inv.balance.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              inv.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : inv.status === 'partial'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {inv.balance > 0 ? (
                              <button
                                onClick={() => handleOpenPayModal(inv)}
                                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold transition shadow-xs"
                              >
                                Record Pay
                              </button>
                            ) : (
                              <span className="text-emerald-700 font-bold mr-1">Paid Full</span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenAdjustModal(inv)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded font-semibold transition"
                            >
                              Adjust
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Payments Tab */}
      {activeTab === 'payments' && (
        <>
          {showCards ? (
            <div className="space-y-3">
              {payments.map((p) => {
                const inv = invoices.find((i) => i.id === p.invoice_id);
                const std = students.find((s) => s.id === inv?.student_id);

                return (
                  <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{std?.full_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Receipt: {p.receipt_number} &bull; {p.payment_date}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                        {p.method}
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Reference / M-Pesa</div>
                        <div className="font-mono text-xs font-bold text-slate-800">{p.reference}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Amount Paid</div>
                        <div className="font-black text-sm text-emerald-700">KES {p.amount_paid.toLocaleString()}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDownloadReceipt(p)}
                      className="w-full min-h-[44px] px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Printer className="w-4 h-4 text-emerald-700" />
                      <span>Print PDF Official Receipt</span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="py-3 px-4">Receipt No</th>
                    <th className="py-3 px-4">Payment Date</th>
                    <th className="py-3 px-4">Learner</th>
                    <th className="py-3 px-4">Method</th>
                    <th className="py-3 px-4">Reference / M-Pesa</th>
                    <th className="py-3 px-4">Amount Paid</th>
                    <th className="py-3 px-4 text-right">Receipt PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {payments.map((p) => {
                    const inv = invoices.find((i) => i.id === p.invoice_id);
                    const std = students.find((s) => s.id === inv?.student_id);

                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.receipt_number}</td>
                        <td className="py-3 px-4">{p.payment_date}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{std?.full_name}</td>
                        <td className="py-3 px-4 uppercase font-semibold text-emerald-800">{p.method}</td>
                        <td className="py-3 px-4 font-mono">{p.reference}</td>
                        <td className="py-3 px-4 font-black text-slate-900">KES {p.amount_paid.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDownloadReceipt(p)}
                            className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded font-bold transition inline-flex items-center gap-1 shadow-xs"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-700" />
                            Print PDF
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Fee Structures Tab */}
      {activeTab === 'structures' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {feeStructures.map((fs) => {
            const cls = classes.find((c) => c.id === fs.class_id);
            return (
              <div key={fs.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs text-xs space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{cls ? `${cls.name} ${cls.stream}` : 'All Classes'}</h4>
                    <span className="text-slate-500">{fs.term} {fs.year}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-700">Day: KES {fs.total_day_amount.toLocaleString()}</div>
                    <div className="font-bold text-purple-700">Boarding: KES {fs.total_boarding_amount.toLocaleString()}</div>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-slate-700 text-[11px] uppercase">Line Items Breakdown:</span>
                  {fs.line_items.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-1 border-b border-slate-50">
                      <span className="text-slate-600">{item.name} ({item.applies_to})</span>
                      <span className="font-semibold text-slate-900">KES {item.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Record Payment Modal with M-Pesa STK Push Simulation */}
      {selectedInvoiceForPay && (() => {
        const modalStudent = students.find((s) => s.id === selectedInvoiceForPay.student_id);
        const modalClass = classes.find((c) => c.id === modalStudent?.class_id);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 p-6 space-y-4 my-8">
              {/* Modal Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-0.5">
                    <CreditCard className="w-4 h-4" />
                    <span>Fee Payment Settlement</span>
                  </div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {modalStudent?.full_name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Adm: {modalStudent?.admission_number} &bull; {modalClass?.name} {modalClass?.stream}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForPay(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
                >
                  ✕
                </button>
              </div>

              {/* Amount to Pay */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-600">Invoice: {selectedInvoiceForPay.invoice_number}</span>
                  <span className="font-bold text-rose-600">Balance: KES {selectedInvoiceForPay.balance.toLocaleString()}</span>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Amount to Settle (KES)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={selectedInvoiceForPay.balance}
                    value={payAmount}
                    onChange={(e) => setPayAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-base font-black text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 text-xs">Payment Channel</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPayMethod('mpesa');
                      setMpesaTab('stk');
                    }}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                      payMethod === 'mpesa'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>M-Pesa (Safaricom)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod('bank')}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                      payMethod === 'bank'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Building className="w-4 h-4" />
                    <span>Bank / Cash</span>
                  </button>
                </div>
              </div>

              {/* M-PESA CHANNEL DETAILS */}
              {payMethod === 'mpesa' && (
                <div className="space-y-3 pt-1">
                  {/* Sub-tabs: STK Push vs Manual */}
                  <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setMpesaTab('stk')}
                      className={`flex-1 py-1.5 rounded-md transition ${
                        mpesaTab === 'stk'
                          ? 'bg-white text-emerald-800 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      M-Pesa Express (STK Push)
                    </button>
                    <button
                      type="button"
                      onClick={() => setMpesaTab('manual')}
                      className={`flex-1 py-1.5 rounded-md transition ${
                        mpesaTab === 'manual'
                          ? 'bg-white text-slate-800 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Manual Paybill Ref
                    </button>
                  </div>

                  {mpesaTab === 'stk' && (
                    <div className="space-y-3">
                      {stkStatus === 'idle' && (
                        <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-3">
                          <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            <span>Instant M-Pesa STK Prompt to Parent Phone</span>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Safaricom Phone Number (Format: 07XX or 01XX)
                            </label>
                            <input
                              type="tel"
                              value={stkPhone}
                              onChange={(e) => setStkPhone(e.target.value)}
                              placeholder="0722123456"
                              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleTriggerStkPush}
                            className="w-full min-h-[44px] px-4 py-2 bg-[#00A859] hover:bg-[#008f4c] text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-sm"
                          >
                            <Send className="w-4 h-4" />
                            <span>Trigger M-Pesa STK Push (KES {payAmount.toLocaleString()})</span>
                          </button>
                        </div>
                      )}

                      {stkStatus === 'sending' && (
                        <div className="p-6 bg-slate-900 text-white rounded-2xl text-center space-y-3 border border-slate-700 animate-pulse">
                          <RefreshCw className="w-8 h-8 text-emerald-400 mx-auto animate-spin" />
                          <div className="font-bold text-sm text-emerald-400">Connecting to Safaricom Daraja API...</div>
                          <p className="text-xs text-slate-300">
                            Sending push prompt for KES {payAmount.toLocaleString()} to <strong>{stkPhone}</strong>.
                          </p>
                        </div>
                      )}

                      {stkStatus === 'prompt' && (
                        /* Simulated Safaricom SIM Toolkit on-screen popup */
                        <div className="bg-gradient-to-b from-slate-900 to-slate-950 text-white rounded-2xl p-4 border-2 border-emerald-500 shadow-2xl space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-emerald-400 font-bold">
                            <span className="flex items-center gap-1.5">
                              <Smartphone className="w-3.5 h-3.5" />
                              <span>SIM Toolkit • M-PESA</span>
                            </span>
                            <span>Paybill 247247</span>
                          </div>

                          <div className="text-xs text-slate-200 leading-relaxed bg-slate-800/80 p-3 rounded-xl border border-slate-700">
                            Do you want to pay <strong>KES {payAmount.toLocaleString()}</strong> to{' '}
                            <span className="text-emerald-300 font-bold">{currentSchool.name}</span> for Account{' '}
                            <span className="text-amber-300 font-mono font-bold">{modalStudent?.admission_number}</span>?
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[11px] font-bold text-slate-400">Enter 4-Digit M-Pesa PIN:</label>
                            <input
                              type="password"
                              maxLength={4}
                              value={stkPin}
                              onChange={(e) => setStkPin(e.target.value)}
                              placeholder="••••"
                              className="w-full text-center text-xl tracking-widest font-mono font-bold py-2 bg-slate-800 border border-slate-600 rounded-xl text-emerald-400 focus:outline-hidden focus:border-emerald-400"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setStkStatus('idle')}
                              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleConfirmStkPin}
                              className="py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-md"
                            >
                              Authorize (PIN 1234)
                            </button>
                          </div>
                        </div>
                      )}

                      {stkStatus === 'success' && (
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-300 text-center space-y-2">
                          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <div className="font-black text-sm text-emerald-900">M-PESA Payment Successful!</div>
                          <div className="text-xs text-slate-700 font-mono bg-white p-2 rounded-lg border border-emerald-200">
                            <strong>{payRef}</strong> Confirmed. KES {payAmount.toLocaleString()} received from {stkPhone}.
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedInvoiceForPay(null)}
                            className="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold mt-2"
                          >
                            Done & Close
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {mpesaTab === 'manual' && (
                    <form onSubmit={handleRecordPaymentSubmit} className="space-y-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">M-Pesa Confirmation Code</label>
                        <input
                          type="text"
                          required
                          value={payRef}
                          onChange={(e) => setPayRef(e.target.value.toUpperCase())}
                          placeholder="e.g. QKD89XLP47"
                          className="w-full px-3 py-2 bg-slate-50 border rounded-lg font-mono text-xs font-bold"
                        />
                      </div>
                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoiceForPay(null)}
                          className="px-4 py-2 border rounded-lg text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-emerald-700 text-white rounded-lg font-bold text-xs"
                        >
                          Confirm & Print Receipt PDF
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* NON-MPESA (Bank / Cash) FORM */}
              {payMethod !== 'mpesa' && (
                <form onSubmit={handleRecordPaymentSubmit} className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-xs">Payment Method</label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                      className="w-full px-3 py-2 bg-slate-50 border rounded-lg text-xs"
                    >
                      <option value="bank">Direct Bank Transfer / Wire Slip</option>
                      <option value="cash">Direct Cash at School Bursar</option>
                      <option value="cheque">Banker&apos;s Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-xs">Bank Slip / Voucher Ref</label>
                    <input
                      type="text"
                      required
                      value={payRef}
                      onChange={(e) => setPayRef(e.target.value)}
                      placeholder="e.g. KCB-DEPOSIT-9482"
                      className="w-full px-3 py-2 bg-slate-50 border rounded-lg font-mono text-xs"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedInvoiceForPay(null)}
                      className="px-4 py-2 border rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-700 text-white rounded-lg font-bold"
                    >
                      Record Payment & Print Receipt PDF
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        );
      })()}

      {/* Invoice Generation Modal */}
      {isInvoiceGenModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Generate Batch Term Invoices</h3>
            <p className="text-xs text-slate-500">
              Automatically creates invoices for all active learners in the selected stream.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Class Stream</label>
                <select
                  value={invoiceGenClassId}
                  onChange={(e) => setInvoiceGenClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} - {c.stream}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Fee Structure Template</label>
                <select
                  value={invoiceGenStructureId}
                  onChange={(e) => setInvoiceGenStructureId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                >
                  {feeStructures.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.term} {f.year} (Day: KES {f.total_day_amount.toLocaleString()} / Boarding: KES {f.total_boarding_amount.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Invoice Due Date</label>
                <input
                  type="date"
                  value={invoiceGenDueDate}
                  onChange={(e) => setInvoiceGenDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border rounded-lg"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInvoiceGenModalOpen(false)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateInvoices}
                  className="px-4 py-2 bg-emerald-700 text-white rounded-lg font-bold"
                >
                  Generate Invoices
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Invoice Fee Modal (Audit Logged) */}
      {selectedInvoiceForAdjust && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              Adjust Invoice Fee Amount
            </h3>
            <p className="text-xs text-slate-500">
              Adjusting invoice <span className="font-mono font-semibold text-slate-800">{selectedInvoiceForAdjust.invoice_number}</span> will automatically record a sensitive audit entry.
            </p>
            <form onSubmit={handleConfirmFeeAdjust} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Updated Amount Due (KES)
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={adjustAmountDue}
                  onChange={(e) => setAdjustAmountDue(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Adjustment Reason
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Bursary credit, sibling discount, billing correction"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForAdjust(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold"
                >
                  Apply &amp; Audit Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
