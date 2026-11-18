import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import { NotificationService } from '../../services/notificationService';
import {
  Bell,
  Send,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Mail,
  ShieldAlert,
  MessageCircle,
  Users,
  CreditCard,
  Calendar,
  Search,
  Filter,
  CheckSquare,
  Square,
  Sparkles,
  FileText,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { NotificationLog } from '../../types';

interface NotificationModuleProps {
  initialExamId?: string;
}

type BroadcastCategory = 'reports' | 'fees' | 'attendance' | 'general';

export const NotificationModule: React.FC<NotificationModuleProps> = ({ initialExamId }) => {
  const { currentSchool } = useAuth();
  if (!currentSchool) return null;
  const schoolId = currentSchool.id;

  const exams = dbService.getExams(schoolId);
  const classes = dbService.getClasses(schoolId);
  const levels = dbService.getLevels(schoolId);
  const students = dbService.getStudents(schoolId);
  const parents = dbService.getParents(schoolId);
  const invoices = dbService.getInvoices(schoolId);
  const attendanceList = dbService.getAttendance(schoolId);
  const notificationsLog = dbService.getNotificationsLog(schoolId);

  // Broadcast settings
  const [category, setCategory] = useState<BroadcastCategory>('fees');
  const [channel, setChannel] = useState<'sms' | 'email'>('sms');
  const [selectedExamId, setSelectedExamId] = useState(initialExamId || exams[0]?.id || '');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Record<string, boolean>>({});

  // Preset templates
  const TEMPLATES: Record<BroadcastCategory, string> = {
    fees: 'Dear {parent_name}, this is a reminder from {school_name} that {student_name} (Adm: {adm_no}) has an outstanding fee balance of KES {balance}. Kindly clear via M-Pesa Paybill {paybill} by {due_date}. Inquiries: {phone}.',
    reports: 'Dear {parent_name}, the official Kenya CBC {exam_name} Report Card for {student_name} is now available on the {school_name} portal: {portal_url}. Thank you for your partnership.',
    attendance: 'Dear {parent_name}, learner {student_name} (Adm: {adm_no}) was marked absent today ({date}) at {school_name}. Please contact the school administration if this was unexpected.',
    general: 'Dear {parent_name}, please be advised that {school_name} will close for Term {term} midterm break on Friday at 12:30 PM. Classes resume next Tuesday at 7:30 AM. - Administration',
  };

  const [template, setTemplate] = useState<string>(TEMPLATES.fees);

  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState<{ current: number; total: number } | null>(null);
  const [resultSummary, setResultSummary] = useState<{ sent: number; failed: number } | null>(null);

  const selectedExam = exams.find((e) => e.id === selectedExamId);
  const reportCards = dbService.getReportCards(schoolId, selectedExamId);

  // Switch category and preset template
  const handleCategoryChange = (cat: BroadcastCategory) => {
    setCategory(cat);
    setTemplate(TEMPLATES[cat]);
    setSelectedRecipientIds({});
  };

  // Build candidate recipient list according to category
  const rawCandidates = useMemo(() => {
    const list: {
      key: string;
      parentUser: any;
      student: any;
      phone: string;
      email: string;
      phoneOrEmail: string;
      badgeText: string;
      isEligible: boolean;
      extraVars: Record<string, string | number>;
    }[] = [];

    const todayDate = new Date().toISOString().split('T')[0];

    parents.forEach((p) => {
      p.students.forEach((std) => {
        const studentClass = classes.find((c) => c.id === std.class_id);
        const parentPhone = p.user?.phone || '0722000000';
        const parentEmail = p.user?.email || 'parent@example.com';
        const key = `${p.id}_${std.id}`;

        if (category === 'fees') {
          // Look up active invoice with balance
          const stdInvoices = invoices.filter((inv) => inv.student_id === std.id && inv.status !== 'paid');
          const totalBalance = stdInvoices.reduce((sum, inv) => sum + inv.balance, 0);
          const earliestDue = stdInvoices[0]?.due_date || 'end of term';

          if (totalBalance > 0) {
            list.push({
              key,
              parentUser: p.user,
              student: std,
              phone: parentPhone,
              email: parentEmail,
              phoneOrEmail: channel === 'sms' ? parentPhone : parentEmail,
              badgeText: `KES ${totalBalance.toLocaleString()} Balance`,
              isEligible: true,
              extraVars: {
                balance: totalBalance.toLocaleString(),
                paybill: '522522',
                due_date: earliestDue,
                adm_no: std.admission_number,
              },
            });
          }
        } else if (category === 'reports') {
          const rc = reportCards.find((r) => r.student_id === std.id);
          const isPublished = Boolean(rc?.published);
          list.push({
            key,
            parentUser: p.user,
            student: std,
            phone: parentPhone,
            email: parentEmail,
            phoneOrEmail: channel === 'sms' ? parentPhone : parentEmail,
            badgeText: isPublished ? 'Report Published' : 'Draft / Excluded',
            isEligible: isPublished,
            extraVars: {
              adm_no: std.admission_number,
              exam_name: selectedExam?.name || 'Assessment',
            },
          });
        } else if (category === 'attendance') {
          // Check today's attendance record
          const att = attendanceList.find((a) => a.student_id === std.id && a.date === todayDate);
          const isAbsent = att?.status === 'absent' || !att; // either marked absent or unrecorded
          list.push({
            key,
            parentUser: p.user,
            student: std,
            phone: parentPhone,
            email: parentEmail,
            phoneOrEmail: channel === 'sms' ? parentPhone : parentEmail,
            badgeText: att ? `Marked ${att.status}` : 'No check-in today',
            isEligible: isAbsent,
            extraVars: {
              adm_no: std.admission_number,
              date: todayDate,
            },
          });
        } else {
          // General broadcast to all
          list.push({
            key,
            parentUser: p.user,
            student: std,
            phone: parentPhone,
            email: parentEmail,
            phoneOrEmail: channel === 'sms' ? parentPhone : parentEmail,
            badgeText: studentClass ? `${studentClass.name} - ${studentClass.stream}` : 'Active Learner',
            isEligible: true,
            extraVars: {
              adm_no: std.admission_number,
            },
          });
        }
      });
    });

    return list;
  }, [category, parents, invoices, reportCards, attendanceList, selectedExam, classes, channel]);

  // Apply filters: class stream and search query
  const filteredCandidates = useMemo(() => {
    return rawCandidates.filter((item) => {
      if (classFilter !== 'all' && item.student.class_id !== classFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.student.full_name.toLowerCase().includes(q);
        const matchesAdm = item.student.admission_number.toLowerCase().includes(q);
        const matchesParent = item.parentUser.full_name.toLowerCase().includes(q);
        const matchesPhone = item.phone.includes(q);
        if (!matchesName && !matchesAdm && !matchesParent && !matchesPhone) {
          return false;
        }
      }
      return true;
    });
  }, [rawCandidates, classFilter, searchQuery]);

  // Eligible queued items
  const eligibleItems = filteredCandidates.filter((c) => c.isEligible);
  const selectedCount = Object.values(selectedRecipientIds).filter(Boolean).length;
  const isAllSelected = eligibleItems.length > 0 && eligibleItems.every((c) => selectedRecipientIds[c.key] !== false);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      const next: Record<string, boolean> = {};
      eligibleItems.forEach((c) => {
        next[c.key] = false;
      });
      setSelectedRecipientIds(next);
    } else {
      const next: Record<string, boolean> = {};
      eligibleItems.forEach((c) => {
        next[c.key] = true;
      });
      setSelectedRecipientIds(next);
    }
  };

  const toggleSelectOne = (key: string) => {
    setSelectedRecipientIds((prev) => {
      const currentVal = prev[key] !== false; // defaults to true
      return { ...prev, [key]: !currentVal };
    });
  };

  // Final dispatch list
  const activeDispatchList = eligibleItems.filter((item) => selectedRecipientIds[item.key] !== false);

  // SMS character telemetry (GSM-7 standard)
  const previewSample = activeDispatchList[0] || eligibleItems[0] || rawCandidates[0];
  const renderedSample = previewSample
    ? NotificationService.renderTemplate(template, {
        parent_name: previewSample.parentUser.full_name,
        student_name: previewSample.student.full_name,
        exam_name: selectedExam?.name || 'Assessment',
        term: currentSchool.current_term,
        year: currentSchool.academic_year,
        portal_url: `${window.location.origin}/portal/parent`,
        school_name: currentSchool.name,
        phone: currentSchool.phone,
        ...(previewSample.extraVars || {}),
      })
    : template;

  const charCount = renderedSample.length;
  const smsSegments = Math.ceil(charCount / 160) || 1;
  const estimatedCostKes = (activeDispatchList.length * smsSegments * 0.8).toFixed(2);

  // Dispatch Batch
  const handleSendBatch = async () => {
    if (activeDispatchList.length === 0) {
      alert('Please select at least one recipient.');
      return;
    }

    setIsSending(true);
    setResultSummary(null);

    const res = await NotificationService.dispatchBatch(
      {
        schoolId,
        examId: category === 'reports' ? selectedExamId : undefined,
        channel,
        template,
        recipients: activeDispatchList.map((item) => ({
          parentUser: item.parentUser,
          student: item.student,
          phoneOrEmail: item.phoneOrEmail,
          extraVars: item.extraVars,
        })),
        school: currentSchool,
        examName: selectedExam?.name,
      },
      (curr, total) => {
        setSendProgress({ current: curr, total });
      }
    );

    setIsSending(false);
    setResultSummary({ sent: res.sentCount, failed: res.failedCount });
  };

  // WhatsApp helper
  const getWhatsAppUrl = (phone: string, item: any) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const intlPhone = cleanPhone.startsWith('0') ? '254' + cleanPhone.slice(1) : cleanPhone;
    const body = NotificationService.renderTemplate(template, {
      parent_name: item.parentUser.full_name,
      student_name: item.student.full_name,
      exam_name: selectedExam?.name || 'Assessment',
      term: currentSchool.current_term,
      year: currentSchool.academic_year,
      portal_url: `${window.location.origin}/portal/parent`,
      school_name: currentSchool.name,
      phone: currentSchool.phone,
      ...(item.extraVars || {}),
    });
    return `https://wa.me/${intlPhone}?text=${encodeURIComponent(body)}`;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <Bell className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Bulk SMS &amp; Parent Broadcast Center
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kenya Telco Safaricom / Africa's Talking gateway with live WhatsApp quick-share &amp; audit logging
          </p>
        </div>

        <button
          onClick={handleSendBatch}
          disabled={isSending || activeDispatchList.length === 0}
          className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs min-h-[44px]"
        >
          <Send className="w-4 h-4" />
          {isSending
            ? `Broadcasting (${sendProgress?.current}/${sendProgress?.total})...`
            : `Dispatch ${activeDispatchList.length} Messages (${channel.toUpperCase()})`}
        </button>
      </div>

      {resultSummary && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              Broadcast Completed: <strong>{resultSummary.sent} messages sent</strong> successfully ({resultSummary.failed} failed/invalid).
            </span>
          </div>
          <span className="font-mono text-[11px] text-emerald-700">Logged to official notifications audit ledger</span>
        </div>
      )}

      {/* Campaign Category Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button
          onClick={() => handleCategoryChange('fees')}
          className={`p-3 rounded-2xl border text-left transition ${
            category === 'fees'
              ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <CreditCard className="w-4 h-4" />
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${category === 'fees' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
              Financial
            </span>
          </div>
          <div className="font-bold text-xs mt-2">Fee Balance Alert</div>
          <div className={`text-[11px] mt-0.5 truncate ${category === 'fees' ? 'text-emerald-100' : 'text-slate-500'}`}>
            Auto-target defaulters
          </div>
        </button>

        <button
          onClick={() => handleCategoryChange('reports')}
          className={`p-3 rounded-2xl border text-left transition ${
            category === 'reports'
              ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <FileText className="w-4 h-4" />
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${category === 'reports' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
              Academic
            </span>
          </div>
          <div className="font-bold text-xs mt-2">Report Cards Ready</div>
          <div className={`text-[11px] mt-0.5 truncate ${category === 'reports' ? 'text-emerald-100' : 'text-slate-500'}`}>
            Term summative reports
          </div>
        </button>

        <button
          onClick={() => handleCategoryChange('attendance')}
          className={`p-3 rounded-2xl border text-left transition ${
            category === 'attendance'
              ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <Calendar className="w-4 h-4" />
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${category === 'attendance' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
              Attendance
            </span>
          </div>
          <div className="font-bold text-xs mt-2">Absenteeism Notice</div>
          <div className={`text-[11px] mt-0.5 truncate ${category === 'attendance' ? 'text-emerald-100' : 'text-slate-500'}`}>
            Learners absent today
          </div>
        </button>

        <button
          onClick={() => handleCategoryChange('general')}
          className={`p-3 rounded-2xl border text-left transition ${
            category === 'general'
              ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <Users className="w-4 h-4" />
            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${category === 'general' ? 'bg-emerald-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
              Circular
            </span>
          </div>
          <div className="font-bold text-xs mt-2">General Broadcast</div>
          <div className={`text-[11px] mt-0.5 truncate ${category === 'general' ? 'text-emerald-100' : 'text-slate-500'}`}>
            AGM / School closing
          </div>
        </button>
      </div>

      {/* Broadcast Settings & Template Composer */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Dispatch Gateway Provider</label>
            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer min-h-[36px]">
                <input
                  type="radio"
                  name="channel"
                  checked={channel === 'sms'}
                  onChange={() => setChannel('sms')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <Smartphone className="w-4 h-4 text-emerald-700" />
                <span className="font-semibold text-slate-800">Safaricom / Africa's Talking SMS</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer min-h-[36px]">
                <input
                  type="radio"
                  name="channel"
                  checked={channel === 'email'}
                  onChange={() => setChannel('email')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <Mail className="w-4 h-4 text-blue-700" />
                <span className="font-semibold text-slate-800">Email Broadcast</span>
              </label>
            </div>
          </div>

          {category === 'reports' && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Target Exam Assessment</label>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium min-h-[44px]"
              >
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} ({ex.term} {ex.year})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Filter by Class Stream</label>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium min-h-[44px]"
            >
              <option value="all">All School Streams ({classes.length} streams)</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} - {c.stream}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Template textarea with live metrics */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
            <label className="font-bold text-slate-700">
              Message Template &amp; Merge Tags
            </label>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
              <span>{charCount} chars</span>
              <span>•</span>
              <span className="font-bold text-emerald-800">{smsSegments} SMS {smsSegments > 1 ? 'segments' : 'segment'}</span>
              <span>•</span>
              <span>Est: ~KES {estimatedCostKes}</span>
            </div>
          </div>

          <textarea
            rows={3}
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 font-mono text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />

          <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px]">
            <span className="font-bold text-slate-500">Insert Tag:</span>
            {[
              '{parent_name}',
              '{student_name}',
              '{adm_no}',
              '{balance}',
              '{paybill}',
              '{due_date}',
              '{school_name}',
              '{term}',
            ].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setTemplate((prev) => prev + ' ' + tag)}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-mono transition"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
            <span>Simulated Recipient Message Preview</span>
            <span className="font-mono text-emerald-700">Sender ID: ELIMU-SCH</span>
          </div>
          <p className="text-xs text-slate-800 font-sans leading-relaxed italic bg-white p-2.5 rounded-lg border border-slate-200">
            "{renderedSample}"
          </p>
        </div>
      </div>

      {/* Recipient Queue Section */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-emerald-700"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-emerald-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              Select All ({activeDispatchList.length} of {eligibleItems.length})
            </button>
            <span className="text-slate-300">|</span>
            <span className="text-xs text-slate-500">
              Target Cohort: <strong className="text-slate-800">{category.toUpperCase()}</strong>
            </span>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter recipient or learner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Desktop Table View (>= 768px) */}
        <div className="hidden md:block">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-2.5 px-4 w-10"></th>
                <th className="py-2.5 px-4">Parent / Guardian</th>
                <th className="py-2.5 px-4">Phone / MSISDN</th>
                <th className="py-2.5 px-4">Enrolled Learner</th>
                <th className="py-2.5 px-4">Category Status</th>
                <th className="py-2.5 px-4 text-right">Direct 1-Tap</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No recipients match the active criteria.
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((r) => {
                  const isChecked = selectedRecipientIds[r.key] !== false;
                  return (
                    <tr
                      key={r.key}
                      className={`hover:bg-slate-50 transition ${
                        !r.isEligible ? 'opacity-50 bg-slate-50/50' : isChecked ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4">
                        {r.isEligible ? (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectOne(r.key)}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                        ) : (
                          <span className="text-slate-300">•</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{r.parentUser.full_name}</td>
                      <td className="py-2.5 px-4 font-mono font-medium">{r.phone}</td>
                      <td className="py-2.5 px-4">
                        <span className="font-semibold text-slate-800">{r.student.full_name}</span>{' '}
                        <span className="text-slate-400 font-mono">({r.student.admission_number})</span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.isEligible ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {r.badgeText}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <a
                          href={getWhatsAppUrl(r.phone, r)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-lg text-[11px] transition border border-emerald-200"
                          title="Open WhatsApp with personalized text"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          WhatsApp
                        </a>
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
          {filteredCandidates.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No recipients match the active criteria.
            </div>
          ) : (
            filteredCandidates.map((r) => {
              const isChecked = selectedRecipientIds[r.key] !== false;
              return (
                <div
                  key={r.key}
                  className={`p-4 space-y-3 transition ${
                    !r.isEligible ? 'opacity-50 bg-slate-50/50' : isChecked ? 'bg-emerald-50/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      {r.isEligible && (
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(r.key)}
                          className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                      )}
                      <div>
                        <div className="font-bold text-xs text-slate-900">{r.parentUser.full_name}</div>
                        <div className="font-mono text-[11px] text-slate-500">{r.phone}</div>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                        r.isEligible ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {r.badgeText}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-600 pl-6">
                    Learner: <strong className="text-slate-800">{r.student.full_name}</strong>{' '}
                    <span className="font-mono text-slate-400">({r.student.admission_number})</span>
                  </div>

                  <div className="pl-6 pt-1 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Direct Gateway:</span>
                    <a
                      href={getWhatsAppUrl(r.phone, r)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs transition border border-emerald-200 min-h-[44px]"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Send via WhatsApp
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Historical Audit Delivery Log */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Telco SMS &amp; Email Delivery Audit Log
            </h3>
          </div>
          <span className="text-xs text-slate-500">{notificationsLog.length} recorded dispatches</span>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="py-2 px-4">Timestamp</th>
                <th className="py-2 px-4">Channel</th>
                <th className="py-2 px-4">Destination</th>
                <th className="py-2 px-4">Message Snippet</th>
                <th className="py-2 px-4">Carrier Ack</th>
                <th className="py-2 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {notificationsLog.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    No historical notification logs recorded yet.
                  </td>
                </tr>
              ) : (
                notificationsLog.slice(0, 10).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(log.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5 px-4 uppercase font-bold text-emerald-800 text-[10px]">
                      {log.channel}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-medium">{log.phone_or_email}</td>
                    <td className="py-2.5 px-4 truncate max-w-xs">{log.message}</td>
                    <td className="py-2.5 px-4 text-[11px] font-mono text-slate-500 truncate max-w-[180px]">
                      {log.provider_response || 'ACK_OK'}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-slate-100">
          {notificationsLog.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">
              No historical notification logs recorded yet.
            </div>
          ) : (
            notificationsLog.slice(0, 6).map((log) => (
              <div key={log.id} className="p-3.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-slate-400 text-[11px]">
                    {new Date(log.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                    {log.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-800">{log.phone_or_email}</span>
                  <span className="uppercase font-bold text-[10px] text-emerald-700">{log.channel}</span>
                </div>
                <p className="text-[11px] text-slate-600 line-clamp-2 italic">
                  "{log.message}"
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
