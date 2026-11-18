import { and, eq, inArray } from 'drizzle-orm';
import { db } from './index.ts';
import {
  attendance,
  exams,
  grades,
  invoices,
  payments,
  schools,
  schoolSnapshots,
  students,
} from './schema.ts';
import { clearSchoolData } from '../lib/seeder.ts';

export interface WorkspaceSyncPayload {
  school: {
    id: string;
    slug: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    plan: string;
    status: string;
    current_term: string;
    academic_year: number;
  };
  students: Array<{
    id: string;
    admission_number: string;
    full_name: string;
    level_id: string;
    class_id: string;
    upi?: string;
    dob: string;
    gender: string;
    student_type: string;
    kpsea_score?: number;
    sba_score?: number;
    placement_score?: number;
    pathway_preference?: string;
    status: string;
  }>;
  exams: Array<{
    id: string;
    name: string;
    term: string;
    year: number;
    exam_type: string;
    start_date: string;
    end_date: string;
    is_published: boolean;
  }>;
  grades: Array<{
    id: string;
    exam_id: string;
    student_id: string;
    subject_id: string;
    marks?: number | null;
    rubric_level: string;
    points: number;
    teacher_comment: string;
    entered_by_teacher_id: string;
  }>;
  attendance: Array<{
    id: string;
    student_id: string;
    date: string;
    status: string;
    marked_by_teacher_id: string;
    remarks?: string;
  }>;
  invoices: Array<{
    id: string;
    student_id: string;
    fee_structure_id: string;
    invoice_number: string;
    amount_due: number;
    amount_paid: number;
    balance: number;
    due_date: string;
    status: string;
  }>;
  payments: Array<{
    id: string;
    invoice_id: string;
    amount_paid: number;
    payment_date: string;
    method: string;
    reference: string;
    receipt_number: string;
    recorded_by: string;
  }>;
  snapshot: Record<string, unknown>;
}

const scopeId = (ownerUid: string, rawId: string) =>
  rawId.startsWith(`${ownerUid}:`) ? rawId : `${ownerUid}:${rawId}`;

const unscopeId = (ownerUid: string, scopedId: string) =>
  scopedId.startsWith(`${ownerUid}:`)
    ? scopedId.slice(ownerUid.length + 1)
    : scopedId;

export async function syncSchoolWorkspaceToSql(
  ownerUid: string,
  payload: WorkspaceSyncPayload
) {
  const scopedSchoolId = scopeId(ownerUid, payload.school.id);
  const scopedSlug = scopeId(ownerUid, payload.school.slug);

  try {
    await db.transaction(async (tx) => {
      // 1. Upsert school
      await tx
        .insert(schools)
        .values({
          id: scopedSchoolId,
          ownerUid,
          slug: scopedSlug,
          name: payload.school.name,
          address: payload.school.address,
          phone: payload.school.phone,
          email: payload.school.email,
          plan: payload.school.plan,
          status: payload.school.status,
          currentTerm: payload.school.current_term,
          academicYear: payload.school.academic_year,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: schools.id,
          set: {
            slug: scopedSlug,
            name: payload.school.name,
            address: payload.school.address,
            phone: payload.school.phone,
            email: payload.school.email,
            plan: payload.school.plan,
            status: payload.school.status,
            currentTerm: payload.school.current_term,
            academicYear: payload.school.academic_year,
            updatedAt: new Date(),
          },
        });

      // 2. Sync Exams
      const examIds = payload.exams.map((e) => scopeId(ownerUid, e.id));
      for (const exam of payload.exams) {
        const scopedExamId = scopeId(ownerUid, exam.id);
        await tx
          .insert(exams)
          .values({
            id: scopedExamId,
            schoolId: scopedSchoolId,
            name: exam.name,
            term: exam.term,
            year: exam.year,
            examType: exam.exam_type,
            startDate: exam.start_date,
            endDate: exam.end_date,
            isPublished: exam.is_published,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: exams.id,
            set: {
              name: exam.name,
              term: exam.term,
              year: exam.year,
              examType: exam.exam_type,
              startDate: exam.start_date,
              endDate: exam.end_date,
              isPublished: exam.is_published,
              updatedAt: new Date(),
            },
          });
      }

      // 3. Sync Students (remove deleted students for this school first if cleared)
      const currentStudentIds = payload.students.map((s) =>
        scopeId(ownerUid, s.id)
      );
      if (currentStudentIds.length === 0) {
        await tx.delete(payments).where(eq(payments.schoolId, scopedSchoolId));
        await tx.delete(invoices).where(eq(invoices.schoolId, scopedSchoolId));
        await tx
          .delete(attendance)
          .where(eq(attendance.schoolId, scopedSchoolId));
        await tx.delete(grades).where(eq(grades.schoolId, scopedSchoolId));
        await tx.delete(students).where(eq(students.schoolId, scopedSchoolId));
      } else {
        const existingStudents = await tx
          .select({ id: students.id })
          .from(students)
          .where(eq(students.schoolId, scopedSchoolId));
        const removedStudentIds = existingStudents
          .map((r) => r.id)
          .filter((id) => !currentStudentIds.includes(id));
        if (removedStudentIds.length > 0) {
          await tx
            .delete(students)
            .where(inArray(students.id, removedStudentIds));
        }

        for (const student of payload.students) {
          const scopedStudentId = scopeId(ownerUid, student.id);
          await tx
            .insert(students)
            .values({
              id: scopedStudentId,
              schoolId: scopedSchoolId,
              admissionNumber: student.admission_number,
              fullName: student.full_name,
              levelId: student.level_id,
              classId: student.class_id,
              upi: student.upi ?? null,
              dob: student.dob,
              gender: student.gender,
              studentType: student.student_type,
              kpseaScore: student.kpsea_score ?? null,
              sbaScore: student.sba_score ?? null,
              placementScore: student.placement_score ?? null,
              pathwayPreference: student.pathway_preference ?? null,
              status: student.status,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: students.id,
              set: {
                admissionNumber: student.admission_number,
                fullName: student.full_name,
                levelId: student.level_id,
                classId: student.class_id,
                upi: student.upi ?? null,
                dob: student.dob,
                gender: student.gender,
                studentType: student.student_type,
                kpseaScore: student.kpsea_score ?? null,
                sbaScore: student.sba_score ?? null,
                placementScore: student.placement_score ?? null,
                pathwayPreference: student.pathway_preference ?? null,
                status: student.status,
                updatedAt: new Date(),
              },
            });
        }
      }

      // 4. Sync Grades (only those referencing valid exams and students)
      const validStudentSet = new Set(currentStudentIds);
      const validExamSet = new Set(examIds);

      for (const g of payload.grades) {
        const scopedGradeId = scopeId(ownerUid, g.id);
        const scopedExamId = scopeId(ownerUid, g.exam_id);
        const scopedStudentId = scopeId(ownerUid, g.student_id);
        if (!validStudentSet.has(scopedStudentId) || !validExamSet.has(scopedExamId)) {
          continue;
        }
        await tx
          .insert(grades)
          .values({
            id: scopedGradeId,
            schoolId: scopedSchoolId,
            examId: scopedExamId,
            studentId: scopedStudentId,
            subjectId: g.subject_id,
            marks: g.marks ?? null,
            rubricLevel: g.rubric_level,
            points: g.points,
            teacherComment: g.teacher_comment || '',
            enteredByTeacherId: g.entered_by_teacher_id,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: grades.id,
            set: {
              marks: g.marks ?? null,
              rubricLevel: g.rubric_level,
              points: g.points,
              teacherComment: g.teacher_comment || '',
              enteredByTeacherId: g.entered_by_teacher_id,
              updatedAt: new Date(),
            },
          });
      }

      // 5. Sync Attendance
      for (const att of payload.attendance) {
        const scopedAttId = scopeId(ownerUid, att.id);
        const scopedStudentId = scopeId(ownerUid, att.student_id);
        if (!validStudentSet.has(scopedStudentId)) continue;
        await tx
          .insert(attendance)
          .values({
            id: scopedAttId,
            schoolId: scopedSchoolId,
            studentId: scopedStudentId,
            date: att.date,
            status: att.status,
            markedByTeacherId: att.marked_by_teacher_id,
            remarks: att.remarks ?? null,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: attendance.id,
            set: {
              status: att.status,
              markedByTeacherId: att.marked_by_teacher_id,
              remarks: att.remarks ?? null,
              updatedAt: new Date(),
            },
          });
      }

      // 6. Sync Invoices
      const invoiceIds: string[] = [];
      for (const inv of payload.invoices) {
        const scopedInvId = scopeId(ownerUid, inv.id);
        const scopedStudentId = scopeId(ownerUid, inv.student_id);
        if (!validStudentSet.has(scopedStudentId)) continue;
        invoiceIds.push(scopedInvId);
        await tx
          .insert(invoices)
          .values({
            id: scopedInvId,
            schoolId: scopedSchoolId,
            studentId: scopedStudentId,
            feeStructureId: inv.fee_structure_id,
            invoiceNumber: inv.invoice_number,
            amountDue: Math.round(inv.amount_due),
            amountPaid: Math.round(inv.amount_paid),
            balance: Math.round(inv.balance),
            dueDate: inv.due_date,
            status: inv.status,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: invoices.id,
            set: {
              amountDue: Math.round(inv.amount_due),
              amountPaid: Math.round(inv.amount_paid),
              balance: Math.round(inv.balance),
              dueDate: inv.due_date,
              status: inv.status,
              updatedAt: new Date(),
            },
          });
      }

      // 7. Sync Payments
      const validInvoiceSet = new Set(invoiceIds);
      for (const pay of payload.payments) {
        const scopedPayId = scopeId(ownerUid, pay.id);
        const scopedInvId = scopeId(ownerUid, pay.invoice_id);
        if (!validInvoiceSet.has(scopedInvId)) continue;
        await tx
          .insert(payments)
          .values({
            id: scopedPayId,
            schoolId: scopedSchoolId,
            invoiceId: scopedInvId,
            amountPaid: Math.round(pay.amount_paid),
            paymentDate: pay.payment_date,
            method: pay.method,
            reference: pay.reference,
            receiptNumber: pay.receipt_number,
            recordedBy: pay.recorded_by,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: payments.id,
            set: {
              amountPaid: Math.round(pay.amount_paid),
              paymentDate: pay.payment_date,
              method: pay.method,
              reference: pay.reference,
              receiptNumber: pay.receipt_number,
              recordedBy: pay.recorded_by,
              updatedAt: new Date(),
            },
          });
      }

      // 8. Upsert full school snapshot
      await tx
        .insert(schoolSnapshots)
        .values({
          schoolId: scopedSchoolId,
          ownerUid,
          payload: payload.snapshot,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: schoolSnapshots.schoolId,
          set: {
            payload: payload.snapshot,
            updatedAt: new Date(),
          },
        });
    });

    return {
      ok: true,
      schoolId: payload.school.id,
      syncedStudents: payload.students.length,
      syncedGrades: payload.grades.length,
      syncedInvoices: payload.invoices.length,
    };
  } catch (error) {
    console.error('Database error in syncSchoolWorkspaceToSql:', error);
    throw new Error('Failed to save workspace data to SQL storage.', {
      cause: error,
    });
  }
}

export async function loadUserWorkspacesFromSql(ownerUid: string) {
  try {
    const userSchools = await db
      .select()
      .from(schools)
      .where(eq(schools.ownerUid, ownerUid));

    if (userSchools.length === 0) {
      return [];
    }

    const schoolIds = userSchools.map((s) => s.id);

    const [
      userStudents,
      userExams,
      userGrades,
      userAttendance,
      userInvoices,
      userPayments,
      userSnapshots,
    ] = await Promise.all([
      db.select().from(students).where(inArray(students.schoolId, schoolIds)),
      db.select().from(exams).where(inArray(exams.schoolId, schoolIds)),
      db.select().from(grades).where(inArray(grades.schoolId, schoolIds)),
      db.select().from(attendance).where(inArray(attendance.schoolId, schoolIds)),
      db.select().from(invoices).where(inArray(invoices.schoolId, schoolIds)),
      db.select().from(payments).where(inArray(payments.schoolId, schoolIds)),
      db
        .select()
        .from(schoolSnapshots)
        .where(inArray(schoolSnapshots.schoolId, schoolIds)),
    ]);

    return userSchools.map((s) => {
      const rawSchoolId = unscopeId(ownerUid, s.id);
      const snapRow = userSnapshots.find((sn) => sn.schoolId === s.id);

      return {
        school: {
          id: rawSchoolId,
          slug: unscopeId(ownerUid, s.slug),
          name: s.name,
          address: s.address,
          phone: s.phone,
          email: s.email,
          plan: s.plan,
          status: s.status,
          current_term: s.currentTerm,
          academic_year: s.academicYear,
          created_at: s.createdAt.toISOString(),
          ...(typeof (snapRow?.payload as Record<string, unknown> | undefined)
            ?.profileSetupCompleted === 'boolean'
            ? {
                profile_setup_completed: (
                  snapRow?.payload as { profileSetupCompleted?: boolean }
                ).profileSetupCompleted,
              }
            : {}),
        },
        students: userStudents
          .filter((st) => st.schoolId === s.id)
          .map((st) => ({
            id: unscopeId(ownerUid, st.id),
            school_id: rawSchoolId,
            admission_number: st.admissionNumber,
            full_name: st.fullName,
            level_id: st.levelId,
            class_id: st.classId,
            upi: st.upi ?? undefined,
            dob: st.dob,
            gender: st.gender,
            student_type: st.studentType,
            kpsea_score: st.kpseaScore ?? undefined,
            sba_score: st.sbaScore ?? undefined,
            placement_score: st.placementScore ?? undefined,
            pathway_preference: st.pathwayPreference ?? undefined,
            status: st.status,
            created_at: st.createdAt.toISOString(),
          })),
        exams: userExams
          .filter((ex) => ex.schoolId === s.id)
          .map((ex) => ({
            id: unscopeId(ownerUid, ex.id),
            school_id: rawSchoolId,
            name: ex.name,
            term: ex.term,
            year: ex.year,
            exam_type: ex.examType,
            start_date: ex.startDate,
            end_date: ex.endDate,
            is_published: ex.isPublished,
          })),
        grades: userGrades
          .filter((gr) => gr.schoolId === s.id)
          .map((gr) => ({
            id: unscopeId(ownerUid, gr.id),
            school_id: rawSchoolId,
            exam_id: unscopeId(ownerUid, gr.examId),
            student_id: unscopeId(ownerUid, gr.studentId),
            subject_id: gr.subjectId,
            marks: gr.marks,
            rubric_level: gr.rubricLevel,
            points: gr.points,
            teacher_comment: gr.teacherComment,
            entered_by_teacher_id: gr.enteredByTeacherId,
          })),
        attendance: userAttendance
          .filter((at) => at.schoolId === s.id)
          .map((at) => ({
            id: unscopeId(ownerUid, at.id),
            school_id: rawSchoolId,
            student_id: unscopeId(ownerUid, at.studentId),
            date: at.date,
            status: at.status,
            marked_by_teacher_id: at.markedByTeacherId,
            remarks: at.remarks ?? undefined,
          })),
        invoices: userInvoices
          .filter((inv) => inv.schoolId === s.id)
          .map((inv) => ({
            id: unscopeId(ownerUid, inv.id),
            school_id: rawSchoolId,
            student_id: unscopeId(ownerUid, inv.studentId),
            fee_structure_id: inv.feeStructureId,
            invoice_number: inv.invoiceNumber,
            amount_due: inv.amountDue,
            amount_paid: inv.amountPaid,
            balance: inv.balance,
            due_date: inv.dueDate,
            status: inv.status,
            created_at: inv.createdAt.toISOString(),
          })),
        payments: userPayments
          .filter((pay) => pay.schoolId === s.id)
          .map((pay) => ({
            id: unscopeId(ownerUid, pay.id),
            school_id: rawSchoolId,
            invoice_id: unscopeId(ownerUid, pay.invoiceId),
            amount_paid: pay.amountPaid,
            payment_date: pay.paymentDate,
            method: pay.method,
            reference: pay.reference,
            receipt_number: pay.receiptNumber,
            recorded_by: pay.recordedBy,
          })),
        snapshot: snapRow?.payload || {},
      };
    });
  } catch (error) {
    console.error('Database error in loadUserWorkspacesFromSql:', error);
    throw new Error('Failed to load workspace data from SQL storage.', {
      cause: error,
    });
  }
}

export async function clearSchoolOperationalDataInSql(
  ownerUid: string,
  rawSchoolId: string
) {
  return await clearSchoolData(rawSchoolId, { ownerUid });
}

export async function getStudentsFromSql(
  ownerUid: string,
  rawSchoolId: string
) {
  const scopedSchoolId = scopeId(ownerUid, rawSchoolId);
  try {
    const rows = await db
      .select()
      .from(students)
      .where(eq(students.schoolId, scopedSchoolId));
    return rows.map((st) => ({
      ...st,
      id: unscopeId(ownerUid, st.id),
      schoolId: rawSchoolId,
    }));
  } catch (error) {
    console.error('Database error in getStudentsFromSql:', error);
    throw new Error('Failed to fetch students.', { cause: error });
  }
}
