import jsPDF from 'jspdf';
import autoTable, { CellHookData, Styles } from 'jspdf-autotable';
import {
  AttendanceStatus,
  School,
  SchoolClass,
  SchoolLevel,
  Student,
} from '../types';

export type ExportFormat = 'csv' | 'pdf';

export interface CsvExportOptions {
  filename: string;
  headers: string[];
  rows: Array<Array<string | number | boolean | null | undefined>>;
  metadataLines?: string[];
}

export interface PdfSummaryHighlight {
  label: string;
  color?: [number, number, number];
}

export interface PdfExportOptions {
  filename: string;
  school: School;
  title: string;
  subtitle?: string;
  orientation?: 'portrait' | 'landscape';
  headers: string[];
  rows: Array<Array<string | number | boolean | null | undefined>>;
  summaryHighlights?: PdfSummaryHighlight[];
  columnStyles?: Record<number, Partial<Styles>>;
  showSignatures?: boolean;
  footerPrefix?: string;
  didParseCell?: (data: CellHookData) => void;
}

export interface AttendanceExportRecord {
  student: Student;
  status: AttendanceStatus;
  remarks?: string;
}

export interface AttendanceExportStats {
  total: number;
  present: number;
  late: number;
  absent: number;
  presentRate: number;
}

/**
 * Triggers a browser file download from an in-memory Blob.
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Escapes an individual cell value according to RFC 4180 CSV rules.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes('\r')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formats headers, optional metadata comments, and rows into a UTF-8 BOM CSV string.
 */
export function formatCsvContent(
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>,
  metadataLines?: string[]
): string {
  const metaHeader =
    metadataLines && metadataLines.length > 0
      ? [...metadataLines.map((line) => `# ${line}`), ''].join('\r\n')
      : '';

  const headerLine = headers.map(escapeCsvCell).join(',');
  const dataLines = rows
    .map((row) => row.map(escapeCsvCell).join(','))
    .join('\r\n');

  return `\uFEFF${metaHeader}${headerLine}\r\n${dataLines}`;
}

/**
 * Formats and downloads tabular data as a CSV file.
 */
export function downloadCsv(options: CsvExportOptions): void {
  const csvContent = formatCsvContent(
    options.headers,
    options.rows,
    options.metadataLines
  );
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = options.filename.endsWith('.csv')
    ? options.filename
    : `${options.filename}.csv`;
  triggerFileDownload(blob, filename);
}

/**
 * Formats and downloads tabular data as a branded A4 PDF document.
 */
export function downloadPdf(options: PdfExportOptions): void {
  const orientation = options.orientation ?? 'landscape';
  const pageWidth = orientation === 'landscape' ? 297 : 210;
  const pageHeight = orientation === 'landscape' ? 210 : 297;
  const centerX = pageWidth / 2;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor: [number, number, number] = [20, 83, 45]; // Forest green

  // Top primary header banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 8, 'F');

  // School heading & contact bar
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(orientation === 'landscape' ? 16 : 15);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(options.school.name.toUpperCase(), centerX, 18, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `${options.school.address} | Tel: ${options.school.phone} | Email: ${options.school.email}`,
    centerX,
    23,
    { align: 'center' }
  );

  // Document title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(options.title, centerX, 30, { align: 'center' });

  // Subtitle
  let tableStartY = 42;
  if (options.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(71, 85, 105);
    doc.text(options.subtitle, centerX, 35, { align: 'center' });
  }

  // Optional highlight strip (e.g., attendance counts)
  if (options.summaryHighlights && options.summaryHighlights.length > 0) {
    const boxWidth = pageWidth - 28;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 39, boxWidth, 14, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 39, boxWidth, 14, 2, 2, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const step = boxWidth / options.summaryHighlights.length;
    options.summaryHighlights.forEach((item, idx) => {
      const color = item.color ?? [30, 41, 59];
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(item.label, 20 + idx * step, 47);
    });
    tableStartY = 57;
  } else {
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(14, 38, pageWidth - 14, 38);
  }

  const normalizedRows = options.rows.map((row) =>
    row.map((cell) => (cell === null || cell === undefined ? '' : String(cell)))
  );

  autoTable(doc, {
    startY: tableStartY,
    head: [options.headers],
    body: normalizedRows,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: orientation === 'landscape' ? 8 : 8.5,
      halign: 'left',
    },
    bodyStyles: {
      fontSize: orientation === 'landscape' ? 7.5 : 8,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: options.columnStyles,
    margin: {
      left: 14,
      right: 14,
      bottom: options.showSignatures ? 26 : 20,
    },
    didParseCell: options.didParseCell,
    didDrawPage: (data) => {
      const pageCount = doc.internal.pages.length - 1;
      const footerY = pageHeight - 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        options.footerPrefix ||
          `ElimuCore Kenya CBC SIS • Generated on ${new Date().toISOString()} • Confidential`,
        14,
        footerY
      );
      doc.text(`Page ${data.pageNumber} of ${pageCount}`, pageWidth - 14, footerY, {
        align: 'right',
      });
    },
  });

  if (options.showSignatures) {
    const lastTableY = (doc as unknown as { lastAutoTable?: { finalY?: number } })
      .lastAutoTable?.finalY;
    const finalY = (lastTableY ?? tableStartY) + 12;
    if (finalY < pageHeight - 25) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text('Class Teacher Signature:', 18, finalY);
      doc.line(18, finalY + 6, 68, finalY + 6);

      doc.text('Head of Institution / Principal Stamp:', pageWidth - 86, finalY);
      doc.line(pageWidth - 86, finalY + 6, pageWidth - 26, finalY + 6);
    }
  }

  const filename = options.filename.endsWith('.pdf')
    ? options.filename
    : `${options.filename}.pdf`;
  doc.save(filename);
}

/**
 * Exports a filtered student roster to CSV.
 */
export function exportStudentsCsv(
  students: Student[],
  classes: SchoolClass[],
  levels: SchoolLevel[],
  filterSummary: string = 'All Learners'
): void {
  const headers = [
    'Admission No',
    'Full Name',
    'NEMIS UPI',
    'Level / Grade',
    'Class Stream',
    'Gender',
    'Student Type',
    'Status',
    'Date of Birth',
    'KPSEA Score',
    'SBA Score',
    'KJSEA Placement',
    'Pathway Preference',
  ];

  const rows = students.map((std) => {
    const cls = classes.find((c) => c.id === std.class_id);
    const lvl = levels.find((l) => l.id === std.level_id);
    return [
      std.admission_number,
      std.full_name,
      std.upi || 'N/A',
      lvl ? lvl.name : cls ? cls.name : '',
      cls ? `${cls.name} ${cls.stream}` : '',
      std.gender.toUpperCase(),
      std.student_type.toUpperCase(),
      std.status.toUpperCase(),
      std.dob || '',
      std.kpsea_score ?? '',
      std.sba_score ?? '',
      std.placement_score ?? '',
      std.pathway_preference || 'STEM',
    ];
  });

  const timestamp = new Date().toISOString().split('T')[0];
  const slug = filterSummary.replace(/[^a-zA-Z0-9_-]/g, '_');
  downloadCsv({
    filename: `Student_Roster_${slug}_${timestamp}.csv`,
    headers,
    rows,
  });
}

/**
 * Exports a filtered student roster to a branded PDF register.
 */
export function exportStudentsPdf(
  school: School,
  students: Student[],
  classes: SchoolClass[],
  levels: SchoolLevel[],
  filterSummary: string = 'All Learners'
): void {
  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const headers = [
    '#',
    'Adm No',
    'Learner Name',
    'NEMIS UPI',
    'Class / Stream',
    'Gender',
    'Type',
    'Status',
    'KPSEA',
    'SBA',
    'Placement',
    'Pathway',
  ];

  const rows = students.map((std, idx) => {
    const cls = classes.find((c) => c.id === std.class_id);
    const lvl = levels.find((l) => l.id === std.level_id);
    return [
      String(idx + 1),
      std.admission_number,
      std.full_name,
      std.upi || 'N/A',
      cls ? `${cls.name} ${cls.stream}` : lvl ? lvl.name : 'Unassigned',
      std.gender.toUpperCase(),
      std.student_type.toUpperCase(),
      std.status.toUpperCase(),
      std.kpsea_score ? `${std.kpsea_score}%` : '-',
      std.sba_score ? `${std.sba_score}%` : '-',
      std.placement_score ? `${std.placement_score}` : 'Pending',
      std.pathway_preference || 'STEM',
    ];
  });

  const timestamp = new Date().toISOString().split('T')[0];
  const slug = filterSummary.replace(/[^a-zA-Z0-9_-]/g, '_');

  downloadPdf({
    filename: `Student_Roster_${slug}_${timestamp}.pdf`,
    school,
    title: 'OFFICIAL ENROLLED LEARNERS REGISTER',
    subtitle: `Date: ${dateStr} | ${school.current_term} ${school.academic_year} | Scope: ${filterSummary} | Total Learners: ${students.length}`,
    orientation: 'landscape',
    headers,
    rows,
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 26, fontStyle: 'bold' },
      2: { cellWidth: 46, fontStyle: 'bold' },
      3: { cellWidth: 26 },
      4: { cellWidth: 32 },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 18, halign: 'center' },
      7: { cellWidth: 18, halign: 'center' },
      8: { cellWidth: 16, halign: 'center' },
      9: { cellWidth: 16, halign: 'center' },
      10: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      11: { cellWidth: 23 },
    },
  });
}

/**
 * Exports a daily roll-call attendance register to CSV.
 */
export function exportAttendanceCsv(
  school: School,
  records: AttendanceExportRecord[],
  studentClass: SchoolClass | undefined,
  date: string,
  stats: AttendanceExportStats
): void {
  const headers = [
    'Date',
    'Class & Stream',
    'Admission No',
    'Learner Name',
    'Gender',
    'Attendance Status',
    'Remarks / Reasons',
  ];

  const className = studentClass
    ? `${studentClass.name} - ${studentClass.stream}`
    : 'All Streams';

  const rows = records.map((r) => [
    date,
    className,
    r.student.admission_number,
    r.student.full_name,
    r.student.gender.toUpperCase(),
    r.status.toUpperCase(),
    r.remarks || '',
  ]);

  const classSlug = className.replace(/[^a-zA-Z0-9_-]/g, '_');
  downloadCsv({
    filename: `Attendance_${classSlug}_${date}.csv`,
    headers,
    rows,
    metadataLines: [
      `School: ${school.name}`,
      `Date: ${date}`,
      `Class: ${className}`,
      `Total: ${stats.total} | Present: ${stats.present} | Late: ${stats.late} | Absent: ${stats.absent} | Rate: ${stats.presentRate}%`,
    ],
  });
}

/**
 * Exports a daily roll-call attendance register to a branded printable PDF.
 */
export function exportAttendancePdf(
  school: School,
  records: AttendanceExportRecord[],
  studentClass: SchoolClass | undefined,
  date: string,
  stats: AttendanceExportStats
): void {
  const className = studentClass
    ? `${studentClass.name} - ${studentClass.stream}`
    : 'All Streams';

  const headers = ['#', 'Adm No', 'Learner Name', 'Gender', 'Status', 'Remarks'];
  const rows = records.map((r, idx) => [
    String(idx + 1),
    r.student.admission_number,
    r.student.full_name,
    r.student.gender.toUpperCase(),
    r.status.toUpperCase(),
    r.remarks || '-',
  ]);

  const classSlug = className.replace(/[^a-zA-Z0-9_-]/g, '_');

  downloadPdf({
    filename: `Attendance_${classSlug}_${date}.pdf`,
    school,
    title: 'DAILY ROLL-CALL ATTENDANCE REGISTER',
    subtitle: `Stream: ${className} | Date: ${date} | Term: ${school.current_term}`,
    orientation: 'portrait',
    headers,
    rows,
    summaryHighlights: [
      { label: `Total: ${stats.total}`, color: [71, 85, 105] },
      { label: `Present: ${stats.present}`, color: [20, 83, 45] },
      { label: `Late: ${stats.late}`, color: [180, 83, 9] },
      { label: `Absent: ${stats.absent}`, color: [190, 24, 93] },
      { label: `Rate: ${stats.presentRate}%`, color: [30, 41, 59] },
    ],
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 28, fontStyle: 'bold' },
      2: { cellWidth: 62, fontStyle: 'bold' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 38 },
    },
    showSignatures: true,
    footerPrefix: `ElimuCore Daily Attendance • Class Teacher Stamp Verified • Generated on ${new Date().toLocaleDateString()}`,
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const val = String(data.cell.raw).toUpperCase();
        if (val === 'PRESENT') {
          data.cell.styles.textColor = [20, 83, 45];
        } else if (val === 'LATE') {
          data.cell.styles.textColor = [180, 83, 9];
        } else if (val === 'ABSENT') {
          data.cell.styles.textColor = [190, 24, 93];
        }
      }
    },
  });
}

export const BulkExportService = {
  exportStudentsCsv,
  exportStudentsPdf,
  exportAttendanceCsv,
  exportAttendancePdf,
};
