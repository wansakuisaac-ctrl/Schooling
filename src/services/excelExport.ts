import * as XLSX from 'xlsx';
import { Attendance, Student, SchoolClass, Invoice, Payment, ProjectScore, Donation } from '../types';

export class ExcelExportService {
  /**
   * Export Attendance Report to Excel
   */
  public static exportAttendance(
    attendanceRecords: Attendance[],
    students: Student[],
    classes: SchoolClass[],
    dateRangeLabel: string
  ): void {
    const data = attendanceRecords.map((att) => {
      const student = students.find((s) => s.id === att.student_id);
      const cls = student ? classes.find((c) => c.id === student.class_id) : null;
      return {
        Date: att.date,
        'Admission No': student?.admission_number || '',
        'Learner Name': student?.full_name || '',
        Class: cls ? `${cls.name} ${cls.stream}` : '',
        'Attendance Status': att.status.toUpperCase(),
        Remarks: att.remarks || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Records');
    XLSX.writeFile(workbook, `Attendance_Report_${dateRangeLabel.replace(/\s+/g, '_')}.xlsx`);
  }

  /**
   * Export Fee Collection Summary to Excel
   */
  public static exportFeeCollection(
    invoices: Invoice[],
    payments: Payment[],
    students: Student[],
    classes: SchoolClass[]
  ): void {
    const invoiceRows = invoices.map((inv) => {
      const student = students.find((s) => s.id === inv.student_id);
      const cls = student ? classes.find((c) => c.id === student.class_id) : null;
      return {
        'Invoice No': inv.invoice_number,
        'Admission No': student?.admission_number || '',
        'Student Name': student?.full_name || '',
        'Student Type': student?.student_type.toUpperCase() || '',
        Class: cls ? `${cls.name} ${cls.stream}` : '',
        'Total Billed (KES)': inv.amount_due,
        'Amount Paid (KES)': inv.amount_paid,
        'Outstanding Balance (KES)': inv.balance,
        'Due Date': inv.due_date,
        Status: inv.status.toUpperCase(),
      };
    });

    const paymentRows = payments.map((p) => {
      const inv = invoices.find((i) => i.id === p.invoice_id);
      const student = inv ? students.find((s) => s.id === inv.student_id) : null;
      return {
        'Receipt No': p.receipt_number,
        'Payment Date': p.payment_date,
        'Student Name': student?.full_name || '',
        'Method': p.method.toUpperCase(),
        'Reference / M-Pesa Code': p.reference,
        'Amount Paid (KES)': p.amount_paid,
        'Recorded By': p.recorded_by,
      };
    });

    const workbook = XLSX.utils.book_new();
    const invSheet = XLSX.utils.json_to_sheet(invoiceRows);
    const paySheet = XLSX.utils.json_to_sheet(paymentRows);

    XLSX.utils.book_append_sheet(workbook, invSheet, 'Invoices Summary');
    XLSX.utils.book_append_sheet(workbook, paySheet, 'Payment Transactions');
    XLSX.writeFile(workbook, `ElimuCore_Fee_Collections_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  /**
   * Export KNEC CBA Portal Upload Format for Grade 9 KJSEA Project Scores
   * Columns: admission_no, subject_code, project_score
   */
  public static exportKnecCbaScores(projectScores: ProjectScore[], students: Student[]): void {
    const rows = projectScores.map((ps) => {
      const student = students.find((s) => s.id === ps.student_id);
      return {
        admission_no: student?.admission_number || '',
        subject_code: ps.subject_code,
        project_score: ps.project_score,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'KNEC_CBA_UPLOAD');
    XLSX.writeFile(workbook, `KNEC_KJSEA_Grade9_Upload_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  /**
   * Export Donations Log to Excel
   */
  public static exportDonations(donations: Donation[]): void {
    const rows = donations.map((d) => ({
      'Receipt No': d.receipt_no,
      'Donation Date': d.donation_date,
      'Donor Name': d.donor_name,
      'Amount (KES)': d.amount,
      Category: d.category,
      Notes: d.notes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Donations Log');
    XLSX.writeFile(workbook, `Donations_Register_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  /**
   * Export Students Roster
   */
  public static exportStudents(students: Student[], classes: SchoolClass[], levels: { id: string; name: string }[]): void {
    const rows = students.map((s) => {
      const cls = classes.find((c) => c.id === s.class_id);
      const lvl = levels.find((l) => l.id === s.level_id);
      return {
        'Admission No': s.admission_number,
        'Full Name': s.full_name,
        Level: lvl?.name || '',
        Class: cls ? `${cls.name} ${cls.stream}` : '',
        Gender: s.gender.toUpperCase(),
        'Student Type': s.student_type.toUpperCase(),
        DOB: s.dob,
        Status: s.status.toUpperCase(),
        'KPSEA Score': s.kpsea_score || '',
        'SBA Score': s.sba_score || '',
        'Placement Score': s.placement_score || '',
        'Pathway Preference': s.pathway_preference || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Learners Roster');
    XLSX.writeFile(workbook, `Learners_Roster_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
}
