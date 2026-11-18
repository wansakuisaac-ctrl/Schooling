import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import { PdfGeneratorService } from '../../services/pdfGenerator';
import {
  Folder,
  FileText,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  Search,
} from 'lucide-react';

interface SavedFileItem {
  id: string;
  name: string;
  category: 'Report Card' | 'Fee Receipt' | 'Payslip' | 'Broadsheet' | 'Circular';
  date: string;
  size: string;
  format: 'PDF' | 'XLSX';
  description: string;
  actionType: 'report' | 'receipt' | 'payslip' | 'excel';
}

export const SavedFilesModule: React.FC = () => {
  const { currentSchool } = useAuth();
  if (!currentSchool) return null;

  const schoolId = currentSchool.id;
  const students = dbService.getStudents(schoolId);
  const classes = dbService.getClasses(schoolId);
  const exams = dbService.getExams(schoolId);
  const payments = dbService.getPayments(schoolId);
  const staff = dbService.getTeachers(schoolId);

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Synthesize realistic saved documents list based on school tenants
  const savedFiles: SavedFileItem[] = [
    {
      id: 'f-1',
      name: `Grade_9_Summit_Term_1_2026_CBC_Report_Cards_Master.pdf`,
      category: 'Report Card',
      date: '2026-03-28',
      size: '1.4 MB',
      format: 'PDF',
      description: 'Official CBC Report Cards bundle for Grade 9 Summit with 8-level rubric matrix',
      actionType: 'report',
    },
    {
      id: 'f-2',
      name: `Grade_4_Alpha_End_Term_1_Broadsheet_Full.xlsx`,
      category: 'Broadsheet',
      date: '2026-03-29',
      size: '245 KB',
      format: 'XLSX',
      description: 'Tabular Broadsheet of all Grade 4 Alpha learners across 8 CBC subjects',
      actionType: 'excel',
    },
    {
      id: 'f-3',
      name: `Fee_Receipt_RCP-2026-0042_Otieno_Brian.pdf`,
      category: 'Fee Receipt',
      date: '2026-02-14',
      size: '180 KB',
      format: 'PDF',
      description: 'Official M-Pesa automated receipt for KES 25,000 tuition clearance',
      actionType: 'receipt',
    },
    {
      id: 'f-4',
      name: `Staff_Payroll_Payslips_March_2026_Muungano.pdf`,
      category: 'Payslip',
      date: '2026-03-31',
      size: '890 KB',
      format: 'PDF',
      description: 'Consolidated staff payslips with statutory deductions (PAYE, SHA, NSSF, Housing Levy)',
      actionType: 'payslip',
    },
    {
      id: 'f-5',
      name: `Grade_7_Pioneer_Term_1_CBC_Progress_Reports.pdf`,
      category: 'Report Card',
      date: '2026-03-27',
      size: '1.1 MB',
      format: 'PDF',
      description: 'Junior Secondary CBA & Formative progress sheets for Grade 7',
      actionType: 'report',
    },
    {
      id: 'f-6',
      name: `MoE_CBC_Assessment_Guidelines_Circular_2026.pdf`,
      category: 'Circular',
      date: '2026-01-10',
      size: '520 KB',
      format: 'PDF',
      description: 'Ministry of Education directives on 8-level formative rubrics & KJSEA readiness',
      actionType: 'report',
    },
  ];

  const handleDownload = (file: SavedFileItem) => {
    // Generate actual document on the fly
    if (file.actionType === 'report' && students.length > 0 && exams.length > 0) {
      const student = students[0];
      const exam = exams[0];
      const grades = dbService.getStudentGrades(schoolId, student.id, exam.id);
      const studentClass = classes.find((c) => c.id === student.class_id) || classes[0];
      const subjects = dbService.getSubjects(schoolId);
      const levelSubjects = studentClass ? subjects.filter((s) => s.level_id === studentClass.level_id) : [];

      const doc = PdfGeneratorService.generateReportCardPdf(
        currentSchool,
        student,
        studentClass,
        exam,
        grades,
        levelSubjects
      );
      doc.save(file.name);
    } else if (file.actionType === 'receipt' && payments.length > 0) {
      const payment = payments[0];
      const invoice = dbService.getInvoices(schoolId).find((i) => i.id === payment.invoice_id);
      const student = invoice ? students.find((s) => s.id === invoice.student_id) : students[0];
      const studentClass = student ? classes.find((c) => c.id === student.class_id) : classes[0];

      if (student && studentClass && invoice) {
        const doc = PdfGeneratorService.generateReceiptPdf(
          currentSchool,
          payment,
          invoice,
          student,
          studentClass
        );
        doc.save(file.name);
      }
    } else if (file.actionType === 'payslip') {
      const payroll = dbService.getPayrollRecords(schoolId);
      const rec = payroll[0];
      const teacher = rec ? staff.find((t) => t.id === rec.teacher_id) : staff[0];
      if (teacher && rec) {
        const doc = PdfGeneratorService.generatePayslipPdf(
          currentSchool,
          teacher,
          teacher.user,
          rec
        );
        doc.save(file.name);
      }
    }

    setDownloadSuccess(file.name);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const filteredFiles = savedFiles.filter((f) => {
    const matchesCat = filterCategory === 'all' || f.category === filterCategory;
    const matchesSearch =
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <Folder className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Saved Files &amp; Downloads
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Secure file repository for {currentSchool.name}. Access all generated report cards, broadsheets, fee receipts, and payroll slips.
            </p>
          </div>
        </div>

        {downloadSuccess && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Generated &amp; Downloaded {downloadSuccess}!</span>
          </div>
        )}
      </div>

      {/* Filter and search */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Files' },
            { id: 'Report Card', label: 'Report Cards' },
            { id: 'Broadsheet', label: 'Broadsheets' },
            { id: 'Fee Receipt', label: 'Fee Receipts' },
            { id: 'Payslip', label: 'Staff Payslips' },
            { id: 'Circular', label: 'MoE Circulars' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                filterCategory === cat.id
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search saved files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Files List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
        {filteredFiles.map((f) => (
          <div
            key={f.id}
            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition"
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  f.format === 'PDF'
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                }`}
              >
                {f.format === 'PDF' ? (
                  <FileText className="w-5 h-5" />
                ) : (
                  <FileSpreadsheet className="w-5 h-5" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">{f.name}</h3>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                      f.category === 'Report Card'
                        ? 'bg-blue-100 text-blue-800'
                        : f.category === 'Broadsheet'
                        ? 'bg-emerald-100 text-emerald-800'
                        : f.category === 'Fee Receipt'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {f.category}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{f.description}</p>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                  <span>Date: {f.date}</span>
                  <span>&bull;</span>
                  <span>Size: {f.size}</span>
                  <span>&bull;</span>
                  <span>Format: {f.format}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <button
                onClick={() => handleDownload(f)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
