import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { School, Student, Exam, Grade, Subject, SchoolClass, Payment, Invoice, Teacher, PayrollRecord } from '../types';
import { CBC_RUBRIC_DEFINITIONS } from './cbcRubric';

export class PdfGeneratorService {
  /**
   * Generates a Kenyan CBC Learner Summative Report Card
   * STRICT CBC RULES: No Total, No Mean, No Ranking!
   */
  public static generateReportCardPdf(
    school: School,
    student: Student,
    studentClass: SchoolClass,
    exam: Exam,
    grades: Grade[],
    subjects: Subject[],
    classTeacherRemark?: string,
    principalRemark?: string
  ): jsPDF {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor: [number, number, number] = [20, 83, 45]; // Emerald deep green
    const secondaryColor: [number, number, number] = [30, 41, 59]; // Slate 800

    // Top Crest Bar
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 8, 'F');

    // Header School Info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(school.name.toUpperCase(), 105, 20, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`${school.address} | Tel: ${school.phone} | Email: ${school.email}`, 105, 26, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(`KENYA CBC LEARNER SUMMATIVE REPORT CARD`, 105, 34, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${exam.name.toUpperCase()} (${exam.term} ${exam.year})`, 105, 40, { align: 'center' });

    // Decorative line
    doc.setDrawColor(203, 213, 225);
    doc.line(14, 43, 196, 43);

    // Student Information Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 46, 182, 24, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 46, 182, 24, 2, 2, 'D');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Learner Name:', 18, 52);
    doc.text('Admission No:', 18, 59);
    doc.text('Class & Stream:', 18, 66);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(student.full_name, 45, 52);
    doc.text(student.admission_number, 45, 59);
    doc.text(`${studentClass.name} - ${studentClass.stream}`, 45, 66);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Student Type:', 110, 52);
    doc.text('Gender:', 110, 59);
    doc.text('Assessment Period:', 110, 66);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(student.student_type.toUpperCase(), 145, 52);
    doc.text(student.gender.toUpperCase(), 145, 59);
    doc.text(`${exam.start_date} to ${exam.end_date}`, 145, 66);

    // Table Data
    const tableBody = subjects.map((sub) => {
      const grade = grades.find((g) => g.subject_id === sub.id);
      const rubric = grade?.rubric_level;
      const def = rubric ? CBC_RUBRIC_DEFINITIONS[rubric] : null;

      const markStr = grade?.marks !== null && grade?.marks !== undefined ? `${grade.marks}%` : 'N/A (Rubric Only)';
      const rubricStr = def ? `${def.code} - ${def.description}` : 'Not Assessed';
      const pointsStr = grade ? `${grade.points} / 8` : '-';
      const commentStr = grade?.teacher_comment || 'Satisfactory achievement of learning strand competencies.';

      return [sub.name, markStr, rubricStr, pointsStr, commentStr];
    });

    autoTable(doc, {
      startY: 74,
      head: [['Learning Area / Subject', 'Score (%)', 'Competency Level (Rubric)', 'Points', 'Teacher Assessment Commentary']],
      body: tableBody,
      headStyles: {
        fillColor: [20, 83, 45],
        textColor: 255,
        fontSize: 8.5,
        fontStyle: 'bold',
        halign: 'left',
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.1,
      },
      columnStyles: {
        0: { cellWidth: 44, fontStyle: 'bold' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 42 },
        3: { cellWidth: 16, halign: 'center' },
        4: { cellWidth: 60 },
      },
      theme: 'grid',
    });

    // Final Y position after table
    const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 6 : 180;

    // CBC Rubric Legend Reference Key
    doc.setFillColor(241, 245, 249);
    doc.rect(14, finalY, 182, 14, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('KENYA 8-LEVEL CBC RUBRIC KEY:', 18, finalY + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(
      'EE1 (90-100%, 8pts) | EE2 (75-89%, 7pts) : Exceeding | ME1 (58-74%, 6pts) | ME2 (41-57%, 5pts) : Meeting | AE1 (31-40%, 4pts) | AE2 (21-30%, 3pts) : Approaching | BE1 (11-20%, 2pts) | BE2 (1-10%, 1pt) : Below',
      18,
      finalY + 10
    );

    // Remarks Box
    const remarkY = finalY + 18;
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(14, remarkY, 182, 24, 2, 2, 'D');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 83, 45);
    doc.text('Class Teacher Remarks:', 18, remarkY + 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(
      classTeacherRemark || 'The learner has shown dedicated commitment and cooperative participation in all strands.',
      18,
      remarkY + 11,
      { maxWidth: 174 }
    );

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 83, 45);
    doc.text('Head of School / Principal Remarks:', 18, remarkY + 18);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(
      principalRemark || 'A commendable term. Keep upholding values of integrity, diligence, and academic curiosity.',
      18,
      remarkY + 22,
      { maxWidth: 174 }
    );

    // Signatures and Official Stamp
    const sigY = remarkY + 30;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);

    doc.text('Class Teacher Signature: ___________________', 18, sigY);
    doc.text('Headteacher Signature & Stamp: ___________________', 105, sigY);
    doc.text(`Issue Date: ${new Date().toISOString().split('T')[0]}`, 18, sigY + 8);
    doc.text(`Term 2 Opening Date: 05/05/2026`, 105, sigY + 8);

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Notice: In strict compliance with the Kenya Basic Education Curriculum Framework (KICD), no class ranks or aggregations are computed.',
      105,
      290,
      { align: 'center' }
    );

    return doc;
  }

  /**
   * Generates Official School Fee Receipt PDF
   */
  public static generateReceiptPdf(
    school: School,
    payment: Payment,
    invoice: Invoice,
    student: Student,
    studentClass: SchoolClass
  ): jsPDF {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });

    // Header
    doc.setFillColor(20, 83, 45);
    doc.rect(0, 0, 148, 6, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(20, 83, 45);
    doc.text(school.name.toUpperCase(), 74, 16, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`${school.address} | Tel: ${school.phone}`, 74, 21, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('OFFICIAL PAYMENT RECEIPT', 74, 28, { align: 'center' });

    // Details box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(10, 32, 128, 48, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(10, 32, 128, 48, 2, 2, 'D');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);

    doc.text('Receipt No:', 14, 38);
    doc.text('Payment Date:', 14, 45);
    doc.text('Payment Method:', 14, 52);
    doc.text('Transaction Ref:', 14, 59);
    doc.text('Recorded By:', 14, 66);
    doc.text('Invoice Number:', 14, 73);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(payment.receipt_number, 46, 38);
    doc.text(payment.payment_date, 46, 45);
    doc.text(payment.method.toUpperCase(), 46, 52);
    doc.text(payment.reference, 46, 59);
    doc.text(payment.recorded_by, 46, 66);
    doc.text(invoice.invoice_number, 46, 73);

    // Student details
    doc.setFont('helvetica', 'bold');
    doc.text('Learner:', 78, 38);
    doc.text('Adm No:', 78, 45);
    doc.text('Class:', 78, 52);

    doc.setFont('helvetica', 'normal');
    doc.text(student.full_name, 98, 38);
    doc.text(student.admission_number, 98, 45);
    doc.text(`${studentClass.name} - ${studentClass.stream}`, 98, 52);

    // Financial Breakdown
    autoTable(doc, {
      startY: 84,
      head: [['Description', 'Amount (KES)']],
      body: [
        ['Total Invoice Billed', invoice.amount_due.toLocaleString()],
        ['Amount Paid in this Transaction', payment.amount_paid.toLocaleString()],
        ['Total Cumulative Paid to Date', invoice.amount_paid.toLocaleString()],
        ['Outstanding Term Balance', invoice.balance.toLocaleString()],
      ],
      headStyles: { fillColor: [20, 83, 45], textColor: 255, fontSize: 8.5 },
      bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 80, fontStyle: 'bold' },
        1: { cellWidth: 48, halign: 'right' },
      },
      theme: 'grid',
    });

    const finalY = (doc as any).lastAutoTable.finalY + 12;

    // Official Stamp simulated box
    doc.setDrawColor(20, 83, 45);
    doc.setLineWidth(0.5);
    doc.roundedRect(88, finalY - 4, 50, 22, 2, 2, 'D');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(20, 83, 45);
    doc.text('ELIMUCORE VERIFIED', 113, finalY + 3, { align: 'center' });
    doc.setFontSize(7);
    doc.text('OFFICIAL FINANCE STAMP', 113, finalY + 8, { align: 'center' });
    doc.text(new Date().toISOString().split('T')[0], 113, finalY + 13, { align: 'center' });

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('Thank you for partnering in quality CBC learner empowerment.', 74, 202, { align: 'center' });

    return doc;
  }

  /**
   * Generates Teacher Monthly Payslip PDF
   */
  public static generatePayslipPdf(
    school: School,
    teacher: Teacher,
    user: { full_name: string; email: string },
    payroll: PayrollRecord
  ): jsPDF {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });

    doc.setFillColor(30, 41, 59);
    doc.rect(0, 0, 148, 5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(30, 41, 59);
    doc.text(school.name.toUpperCase(), 74, 15, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('MONTHLY TEACHING STAFF PAYSLIP', 74, 20, { align: 'center' });

    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(20, 83, 45);
    doc.text(`${monthNames[payroll.month - 1]} ${payroll.year}`, 74, 27, { align: 'center' });

    // Details box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(10, 31, 128, 24, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(10, 31, 128, 24, 2, 2, 'D');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Employee Name:', 14, 38);
    doc.text('TSC / Emp No:', 14, 44);
    doc.text('Specialization:', 14, 50);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(user.full_name, 45, 38);
    doc.text(teacher.employee_number, 45, 44);
    doc.text(teacher.subject_specialty, 45, 50, { maxWidth: 88 });

    autoTable(doc, {
      startY: 59,
      head: [['Earnings & Statutory Deductions', 'Amount (KES)']],
      body: [
        ['Basic Salary', payroll.basic_salary.toLocaleString()],
        ['House & Commuter Allowances', payroll.allowances.toLocaleString()],
        ['Gross Earnings', (payroll.basic_salary + payroll.allowances).toLocaleString()],
        ['Less: PAYE Income Tax (~8%)', Math.round((payroll.basic_salary + payroll.allowances) * 0.08).toLocaleString()],
        ['Less: SHIF Health Contribution (2.75%)', Math.round((payroll.basic_salary + payroll.allowances) * 0.0275).toLocaleString()],
        ['Less: NSSF Tier 1 & 2', '2,160'],
        ['Less: Affordable Housing Levy (1.5%)', Math.round((payroll.basic_salary + payroll.allowances) * 0.015).toLocaleString()],
        ['Total Statutory Deductions', payroll.deductions.toLocaleString()],
        ['NET PAY TRANSFERRED', payroll.net_pay.toLocaleString()],
      ],
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      columnStyles: {
        0: { cellWidth: 84 },
        1: { cellWidth: 44, halign: 'right', fontStyle: 'bold' },
      },
      theme: 'grid',
    });

    const finalY = (doc as any).lastAutoTable.finalY + 8;
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Payment Status: ${payroll.status.toUpperCase()} | Paid at: ${payroll.paid_at || 'Pending verification'}`, 14, finalY);
    doc.text('Authorized by School Board of Management & Bursar', 14, finalY + 6);

    return doc;
  }
}
