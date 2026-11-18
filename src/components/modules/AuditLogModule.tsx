import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getMemoryIdToken } from '../../services/firebase';
import { dbService } from '../../services/storage';
import { downloadCsv, downloadPdf } from '../../lib/export';
import { AuditLog } from '../../types';

export type AuditCategory = 'all' | 'grades' | 'fees' | 'students' | 'security';
export type AuditSeverity = 'critical' | 'elevated' | 'standard';
export type DateWindowFilter = 'all' | 'today' | '7d' | '30d';

interface UnifiedAuditEntry {
  id: string;
  schoolId: string;
  userId: string;
  actorName: string;
  actorRole: string;
  action: string;
  actionLabel: string;
  category: Exclude<AuditCategory, 'all'>;
  severity: AuditSeverity;
  entity: string;
  entityId: string;
  targetSummary: string;
  ipAddress: string;
  createdAt: string;
  source: 'PostgreSQL' | 'Tenant Ledger';
}

interface SqlAuditLogRow {
  id: string;
  schoolId?: string;
  school_id?: string;
  userId?: string;
  user_id?: string;
  action: string;
  entity: string;
  entityId?: string;
  entity_id?: string;
  ipAddress?: string;
  ip_address?: string;
  createdAt?: string;
  created_at?: string;
}

export interface AuditLogModuleProps {
  compact?: boolean;
  onViewFull?: () => void;
}

function classifyAction(action: string, entity: string): {
  category: Exclude<AuditCategory, 'all'>;
  severity: AuditSeverity;
  label: string;
} {
  const upperAction = action.toUpperCase();
  const upperEntity = entity.toUpperCase();

  if (
    upperAction.includes('STUDENT_DELETED') ||
    upperAction.includes('OPERATIONAL_DATA_CLEARED')
  ) {
    return {
      category: 'students',
      severity: 'critical',
      label:
        upperAction === 'OPERATIONAL_DATA_CLEARED'
          ? 'Operational Data Cleared'
          : 'Student Data Deleted',
    };
  }

  if (
    upperAction.includes('GRADE_MODIFIED') ||
    upperAction.includes('GRADES_ENTERED') ||
    upperAction.includes('PUBLISH_EXAM_RESULTS') ||
    upperAction.includes('REPORT_CARDS_PUBLISHED') ||
    upperEntity === 'GRADE' ||
    upperEntity === 'EXAM' ||
    upperEntity === 'REPORTCARD'
  ) {
    const isModification =
      upperAction.includes('MODIFIED') || upperAction.includes('PUBLISH');
    let label = 'Assessment Activity';
    if (upperAction === 'GRADE_MODIFIED') label = 'Grade Modified';
    else if (upperAction === 'GRADES_ENTERED') label = 'Grades Entered';
    else if (upperAction === 'PUBLISH_EXAM_RESULTS') label = 'Exam Results Published';
    else if (upperAction === 'REPORT_CARDS_PUBLISHED') label = 'Report Cards Published';

    return {
      category: 'grades',
      severity: isModification ? 'elevated' : 'standard',
      label,
    };
  }

  if (
    upperAction.includes('FEE_') ||
    upperEntity === 'INVOICE' ||
    upperEntity === 'PAYMENT' ||
    upperEntity === 'FEESTRUCTURE'
  ) {
    let label = 'Financial Transaction';
    let severity: AuditSeverity = 'standard';
    if (upperAction === 'FEE_ADJUSTED') {
      label = 'Fee Adjustment Applied';
      severity = 'critical';
    } else if (upperAction === 'FEE_PAYMENT_RECORDED') {
      label = 'Fee Payment Recorded';
      severity = 'standard';
    } else if (upperAction === 'FEE_INVOICES_GENERATED') {
      label = 'Fee Invoices Generated';
      severity = 'elevated';
    } else if (upperAction === 'FEE_STRUCTURE_CREATED') {
      label = 'Fee Structure Created';
      severity = 'elevated';
    }

    return {
      category: 'fees',
      severity,
      label,
    };
  }

  if (
    upperAction.includes('STUDENT') ||
    upperEntity === 'STUDENT'
  ) {
    let label = 'Student Record Activity';
    if (upperAction === 'STUDENT_ENROLLED') label = 'Student Enrolled';
    else if (upperAction === 'STUDENT_RECORD_UPDATED')
      label = 'Student Bio Modified';
    return {
      category: 'students',
      severity:
        upperAction === 'STUDENT_RECORD_UPDATED' ? 'elevated' : 'standard',
      label,
    };
  }

  let label = action
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  let severity: AuditSeverity = 'standard';

  if (upperAction === 'PASSWORD_RESET_COMPLETED') {
    label = 'Password Reset Completed';
    severity = 'critical';
  } else if (upperAction === 'PASSWORD_RESET_REQUESTED') {
    label = 'Password Reset Requested';
    severity = 'elevated';
  } else if (upperAction === 'WORKSPACE_SYNCED') {
    label = 'Workspace Synced to PostgreSQL';
  } else if (upperAction === 'USER_REGISTERED') {
    label = 'User Account Registered';
    severity = 'elevated';
  } else if (upperAction === 'STUDENTS_VIEWED') {
    label = 'Student Registry Queried';
  }

  return {
    category: 'security',
    severity,
    label,
  };
}

function formatRoleLabel(role: string): string {
  switch (role) {
    case 'SCHOOL_ADMIN':
      return 'School Admin';
    case 'PLATFORM_OWNER':
      return 'Platform Director';
    case 'TEACHER':
      return 'Teacher';
    case 'PARENT':
      return 'Parent';
    case 'STUDENT':
      return 'Learner';
    default:
      return role || 'Authorized User';
  }
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function resolveTargetSummary(
  schoolId: string,
  entity: string,
  entityId: string
): string {
  if (!entityId) return entity;

  const cleanId = entityId.trim();
  const students = dbService.getStudents(schoolId);
  const exams = dbService.getExams(schoolId);
  const invoices = dbService.getInvoices(schoolId);

  if (entity.toLowerCase() === 'student') {
    const matched = students.find(
      (s) => s.id === cleanId || s.admission_number === cleanId
    );
    if (matched) {
      return `${matched.full_name} (${matched.admission_number})`;
    }
    return cleanId.replace(/:/g, ' · ');
  }

  if (entity.toLowerCase() === 'exam') {
    const matched = exams.find((ex) => ex.id === cleanId);
    if (matched) {
      return `${matched.name} (${matched.term} ${matched.year})`;
    }
  }

  if (entity.toLowerCase() === 'invoice') {
    const matched = invoices.find(
      (inv) => inv.id === cleanId || inv.invoice_number === cleanId
    );
    if (matched) {
      return `${matched.invoice_number} (KES ${matched.amount_due.toLocaleString()})`;
    }
  }

  return cleanId.replace(/:/g, ' · ');
}

export const AuditLogModule: React.FC<AuditLogModuleProps> = ({
  compact = false,
  onViewFull,
}) => {
  const { currentSchool } = useAuth();
  const schoolId = currentSchool?.id || '';

  const [localVersion, setLocalVersion] = useState(0);
  const [sqlLogs, setSqlLogs] = useState<AuditLog[]>([]);
  const [loadingSql, setLoadingSql] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<AuditCategory>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | AuditSeverity>('all');
  const [dateWindow, setDateWindow] = useState<DateWindowFilter>('all');
  const [selectedEntry, setSelectedEntry] = useState<UnifiedAuditEntry | null>(
    null
  );

  // React instantly to live mutations in dbService
  useEffect(() => {
    const unsubscribe = dbService.subscribeSave(() => {
      setLocalVersion((v) => v + 1);
    });
    return () => unsubscribe();
  }, []);

  const fetchSqlAuditLogs = useCallback(async () => {
    if (!schoolId) return;
    setLoadingSql(true);
    try {
      const token = await getMemoryIdToken();
      if (!token) {
        setSqlLogs([]);
        return;
      }

      const res = await fetch('/api/sql/audit-logs?limit=200', {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-school-id': schoolId,
        },
        cache: 'no-store',
      });

      if (!res.ok) {
        return;
      }

      const payload = (await res.json()) as { auditLogs?: SqlAuditLogRow[] };
      const mapped: AuditLog[] = (payload.auditLogs || []).map((row) => ({
        id: row.id,
        school_id: row.schoolId || row.school_id || schoolId,
        user_id: row.userId || row.user_id || 'system',
        action: row.action,
        entity: row.entity,
        entity_id: row.entityId || row.entity_id || '',
        ip_address: row.ipAddress || row.ip_address || '0.0.0.0',
        created_at: row.createdAt || row.created_at || new Date().toISOString(),
      }));
      setSqlLogs(mapped);
    } catch {
      // Fall back quietly to local tenant audit logs if offline
    } finally {
      setLoadingSql(false);
    }
  }, [schoolId]);

  useEffect(() => {
    void fetchSqlAuditLogs();
  }, [fetchSqlAuditLogs]);

  const allEntries = useMemo<UnifiedAuditEntry[]>(() => {
    if (!schoolId) return [];
    const users = dbService.getUsers(schoolId);
    const localLogs = dbService.getAuditLogs(schoolId);

    const normalize = (
      raw: AuditLog,
      source: 'PostgreSQL' | 'Tenant Ledger'
    ): UnifiedAuditEntry => {
      const matchedUser = users.find(
        (u) =>
          u.id === raw.user_id ||
          u.email.toLowerCase() === raw.user_id.toLowerCase()
      );
      const classification = classifyAction(raw.action, raw.entity);
      return {
        id: raw.id,
        schoolId: raw.school_id,
        userId: raw.user_id,
        actorName:
          matchedUser?.full_name ||
          (raw.user_id.includes('@') ? raw.user_id : 'Institutional Operator'),
        actorRole: matchedUser
          ? formatRoleLabel(matchedUser.role)
          : 'System Account',
        action: raw.action,
        actionLabel: classification.label,
        category: classification.category,
        severity: classification.severity,
        entity: raw.entity,
        entityId: raw.entity_id,
        targetSummary: resolveTargetSummary(schoolId, raw.entity, raw.entity_id),
        ipAddress: raw.ip_address,
        createdAt: raw.created_at,
        source,
      };
    };

    const mergedMap = new Map<string, UnifiedAuditEntry>();

    // Prefer PostgreSQL rows when duplicated across both stores
    sqlLogs.forEach((row) => {
      const item = normalize(row, 'PostgreSQL');
      const dedupeKey = `${item.action}|${item.entity}|${item.entityId}|${item.createdAt.slice(0, 16)}`;
      mergedMap.set(dedupeKey, item);
    });

    localLogs.forEach((row) => {
      const item = normalize(row, 'Tenant Ledger');
      const dedupeKey = `${item.action}|${item.entity}|${item.entityId}|${item.createdAt.slice(0, 16)}`;
      if (!mergedMap.has(dedupeKey)) {
        mergedMap.set(dedupeKey, item);
      }
    });

    return Array.from(mergedMap.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [schoolId, sqlLogs, localVersion]);

  const counts = useMemo(() => {
    return {
      total: allEntries.length,
      grades: allEntries.filter((e) => e.category === 'grades').length,
      fees: allEntries.filter((e) => e.category === 'fees').length,
      students: allEntries.filter((e) => e.category === 'students').length,
      critical: allEntries.filter((e) => e.severity === 'critical').length,
    };
  }, [allEntries]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = Date.now();

    return allEntries.filter((entry) => {
      if (categoryFilter !== 'all' && entry.category !== categoryFilter) {
        return false;
      }
      if (severityFilter !== 'all' && entry.severity !== severityFilter) {
        return false;
      }
      if (dateWindow !== 'all') {
        const ts = new Date(entry.createdAt).getTime();
        if (Number.isFinite(ts)) {
          const dayMs = 24 * 60 * 60 * 1000;
          if (dateWindow === 'today') {
            const todayIso = new Date().toISOString().slice(0, 10);
            if (!entry.createdAt.startsWith(todayIso)) return false;
          } else if (dateWindow === '7d' && now - ts > 7 * dayMs) {
            return false;
          } else if (dateWindow === '30d' && now - ts > 30 * dayMs) {
            return false;
          }
        }
      }
      if (q) {
        const haystack = [
          entry.actorName,
          entry.actorRole,
          entry.action,
          entry.actionLabel,
          entry.entity,
          entry.entityId,
          entry.targetSummary,
          entry.ipAddress,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [allEntries, categoryFilter, severityFilter, dateWindow, searchQuery]);

  if (!currentSchool) return null;

  const handleExportCsv = () => {
    downloadCsv({
      filename: `${currentSchool.slug}-audit-log-${new Date().toISOString().slice(0, 10)}`,
      headers: [
        'Timestamp',
        'Action',
        'Category',
        'Severity',
        'Actor',
        'Role',
        'Entity',
        'Target Detail',
        'IP Address',
        'Source',
      ],
      metadataLines: [
        `Institution: ${currentSchool.name}`,
        `Audit Scope: ${categoryFilter.toUpperCase()} (${filteredEntries.length} records)`,
        `Exported At: ${new Date().toISOString()}`,
      ],
      rows: filteredEntries.map((item) => [
        formatTimestamp(item.createdAt),
        item.actionLabel,
        item.category.toUpperCase(),
        item.severity.toUpperCase(),
        item.actorName,
        item.actorRole,
        item.entity,
        item.targetSummary,
        item.ipAddress,
        item.source,
      ]),
    });
  };

  const handleExportPdf = () => {
    downloadPdf({
      filename: `${currentSchool.slug}-audit-log-${new Date().toISOString().slice(0, 10)}`,
      school: currentSchool,
      title: 'Sensitive Activity & Security Audit Report',
      subtitle: `Multi-Tenant Accountability Trail · ${filteredEntries.length} logged events`,
      orientation: 'landscape',
      headers: [
        'Timestamp',
        'Action',
        'Severity',
        'Actor',
        'Entity',
        'Target Details',
        'IP Address',
      ],
      rows: filteredEntries.slice(0, 150).map((item) => [
        formatTimestamp(item.createdAt),
        item.actionLabel,
        item.severity.toUpperCase(),
        `${item.actorName} (${item.actorRole})`,
        item.entity,
        item.targetSummary,
        item.ipAddress,
      ]),
      summaryHighlights: [
        { label: `Total Events: ${filteredEntries.length}` },
        { label: `Grade Edits: ${counts.grades}`, color: [180, 83, 9] },
        { label: `Fee Adjustments: ${counts.fees}`, color: [4, 120, 87] },
        { label: `Student Deletions: ${counts.students}`, color: [190, 18, 60] },
      ],
    });
  };

  const renderSeverityLabel = (severity: AuditSeverity) => {
    if (severity === 'critical') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 whitespace-nowrap">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>Critical</span>
        </span>
      );
    }
    if (severity === 'elevated') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 whitespace-nowrap">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Elevated</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>Standard</span>
      </span>
    );
  };

  const renderCategoryIcon = (category: Exclude<AuditCategory, 'all'>) => {
    switch (category) {
      case 'grades':
        return <GraduationCap className="w-4 h-4 text-amber-700 shrink-0" />;
      case 'fees':
        return <CreditCard className="w-4 h-4 text-emerald-700 shrink-0" />;
      case 'students':
        return <Trash2 className="w-4 h-4 text-rose-700 shrink-0" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-slate-600 shrink-0" />;
    }
  };

  // Compact Embedded View for AdminDashboard
  if (compact) {
    const previewRows = filteredEntries.slice(0, 6);
    return (
      <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Sensitive Activity &amp; Audit Trail
              </h3>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Grade modifications, fee adjustments &amp; student deletions</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {counts.grades} grade edits
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {counts.fees} fee events
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {counts.students} student actions
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'grades', label: 'Grades' },
                  { id: 'fees', label: 'Fees' },
                  { id: 'students', label: 'Students' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-md transition whitespace-nowrap shrink-0 cursor-pointer ${
                    categoryFilter === tab.id
                      ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {onViewFull && (
              <button
                type="button"
                onClick={onViewFull}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span>Open Full Audit Log</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          {previewRows.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No sensitive audit events match this filter yet.
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Sensitive Action</th>
                  <th className="py-2.5 px-4">Target Record</th>
                  <th className="py-2.5 px-4">Performed By</th>
                  <th className="py-2.5 px-4">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {previewRows.map((entry) => (
                  <tr
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className="hover:bg-slate-50 transition cursor-pointer"
                  >
                    <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                      {formatTimestamp(entry.createdAt)}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-2 font-semibold text-slate-900 whitespace-nowrap">
                        {renderCategoryIcon(entry.category)}
                        <span>{entry.actionLabel}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-700 max-w-xs truncate">
                      {entry.targetSummary}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700 whitespace-nowrap">
                      <span>{entry.actorName}</span>
                      <span className="text-slate-400"> · {entry.actorRole}</span>
                    </td>
                    <td className="py-2.5 px-4">
                      {renderSeverityLabel(entry.severity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selectedEntry && (
          <AuditEntryDetailModal
            entry={selectedEntry}
            onClose={() => setSelectedEntry(null)}
          />
        )}
      </section>
    );
  }

  // Full Module Page View
  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header & Primary Export/Sync Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Audit Log &amp; Sensitive Activity Trail
            </h1>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{currentSchool.name}</span>
            <span aria-hidden="true">·</span>
            <span>Tenant ID {currentSchool.id}</span>
            <span aria-hidden="true">·</span>
            <span>Kenya DPA 2019 Compliance Ledger</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void fetchSqlAuditLogs()}
            disabled={loadingSql}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-60 text-slate-800 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loadingSql ? 'animate-spin' : ''}`}
            />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredEntries.length === 0}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 text-slate-800 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={filteredEntries.length === 0}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PDF Report</span>
          </button>
        </div>
      </div>

      {/* 4-Column Summary Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Total Tracked Events</span>
            <Database className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tabular-nums">
            {counts.total}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
            {counts.critical} critical priority
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Grade Modifications</span>
            <GraduationCap className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tabular-nums">
            {counts.grades}
          </div>
          <div className="text-xs text-amber-700 font-medium mt-1">
            Mark updates &amp; exam publishing
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Fee &amp; Invoice Adjustments</span>
            <CreditCard className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tabular-nums">
            {counts.fees}
          </div>
          <div className="text-xs text-emerald-700 font-medium mt-1">
            Billing edits &amp; M-Pesa receipts
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>Student Deletions &amp; Bio</span>
            <UserCheck className="w-4 h-4 text-rose-700" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2 font-mono tabular-nums">
            {counts.students}
          </div>
          <div className="text-xs text-rose-700 font-medium mt-1">
            Deactivations &amp; profile updates
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Category Segmented Tabs */}
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
            {(
              [
                { id: 'all', label: 'All Events' },
                { id: 'grades', label: 'Grade Changes' },
                { id: 'fees', label: 'Fee Adjustments' },
                { id: 'students', label: 'Student Deletions' },
                { id: 'security', label: 'Auth & Security' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-3 py-1.5 rounded-md transition whitespace-nowrap shrink-0 cursor-pointer ${
                  categoryFilter === tab.id
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search, Severity, Date Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search actor, student, invoice, IP..."
                aria-label="Search audit log records"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={severityFilter}
                onChange={(e) =>
                  setSeverityFilter(e.target.value as 'all' | AuditSeverity)
                }
                aria-label="Filter by severity"
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical Only</option>
                <option value="elevated">Elevated</option>
                <option value="standard">Standard</option>
              </select>
            </div>

            <select
              value={dateWindow}
              onChange={(e) =>
                setDateWindow(e.target.value as DateWindowFilter)
              }
              aria-label="Filter by timeframe"
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* High-Density Audit Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loadingSql && allEntries.length === 0 ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className="h-10 bg-slate-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              No matching audit records
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Sensitive operations such as grade updates, fee adjustments, and student deletions appear here automatically once triggered or synced.
            </p>
            {(searchQuery ||
              categoryFilter !== 'all' ||
              severityFilter !== 'all' ||
              dateWindow !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                  setSeverityFilter('all');
                  setDateWindow('all');
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 px-4 whitespace-nowrap">Timestamp</th>
                  <th className="py-3 px-4 whitespace-nowrap">Action</th>
                  <th className="py-3 px-4 whitespace-nowrap">Severity</th>
                  <th className="py-3 px-4 whitespace-nowrap">Actor</th>
                  <th className="py-3 px-4 whitespace-nowrap">Target Record</th>
                  <th className="py-3 px-4 whitespace-nowrap">Source</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">
                    Client IP
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map((entry) => (
                  <tr
                    key={entry.id}
                    onClick={() => setSelectedEntry(entry)}
                    className="hover:bg-slate-50 transition cursor-pointer"
                  >
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                      {formatTimestamp(entry.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 font-semibold text-slate-900 whitespace-nowrap">
                        {renderCategoryIcon(entry.category)}
                        <span>{entry.actionLabel}</span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                        {entry.action}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {renderSeverityLabel(entry.severity)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">
                        {entry.actorName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {entry.actorRole}
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-medium text-slate-800 truncate">
                        {entry.targetSummary}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {entry.entity}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {entry.source}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500 whitespace-nowrap">
                      {entry.ipAddress}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedEntry && (
        <AuditEntryDetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
};

interface AuditEntryDetailModalProps {
  entry: UnifiedAuditEntry;
  onClose: () => void;
}

const AuditEntryDetailModal: React.FC<AuditEntryDetailModalProps> = ({
  entry,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="text-xs font-medium text-slate-500">
              Audit Event Details
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-0.5">
              {entry.actionLabel}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close audit detail dialog"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <dt className="text-slate-500 font-medium">Event Code</dt>
            <dd className="mt-1 font-mono font-semibold text-slate-900">
              {entry.action}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 font-medium">Severity Level</dt>
            <dd className="mt-1 font-semibold text-slate-900 capitalize">
              {entry.severity}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 font-medium">Performed By</dt>
            <dd className="mt-1 font-semibold text-slate-900">
              {entry.actorName}
            </dd>
            <dd className="text-slate-500">{entry.actorRole}</dd>
          </div>
          <div>
            <dt className="text-slate-500 font-medium">Timestamp</dt>
            <dd className="mt-1 font-mono tabular-nums text-slate-900">
              {formatTimestamp(entry.createdAt)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500 font-medium">Target Record</dt>
            <dd className="mt-1 font-semibold text-slate-900">
              {entry.entity} · {entry.targetSummary}
            </dd>
            <dd className="mt-0.5 font-mono text-[11px] text-slate-500 break-all">
              Reference ID: {entry.entityId || 'N/A'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 font-medium">Client IP Address</dt>
            <dd className="mt-1 font-mono tabular-nums text-slate-900">
              {entry.ipAddress}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 font-medium">Storage Source</dt>
            <dd className="mt-1 font-medium text-slate-900">
              {entry.source} · Tenant {entry.schoolId}
            </dd>
          </div>
        </dl>

        <div className="pt-2 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
