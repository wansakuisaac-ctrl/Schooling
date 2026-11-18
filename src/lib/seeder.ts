import { and, eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  attendance,
  bookLoans,
  classes,
  consentRecords,
  disciplineLogs,
  exams,
  feeStructures,
  formativeAssessments,
  gatePasses,
  grades,
  hostelAllocations,
  invoices,
  leaveRequests,
  parents,
  payments,
  payrollRecords,
  projectScores,
  reportCards,
  schools,
  schoolSnapshots,
  staffAttendance,
  students,
  studentTransports,
  subjects,
  teachers,
  timetableSlots,
} from '../db/schema.ts';

export interface ClearSchoolDataOptions {
  /** Optional owner UID to verify tenant ownership and scope raw school IDs */
  ownerUid?: string;
}

export interface ClearSchoolDataResult {
  ok: boolean;
  schoolId: string;
  cleared: boolean;
  deletedCounts: {
    grades: number;
    attendance: number;
    exams: number;
    students: number;
    parents: number;
    teachers: number;
    classes: number;
    subjects: number;
  };
}

function assertValidSchoolId(schoolId: unknown): string {
  if (typeof schoolId !== 'string') {
    throw new Error('Invalid schoolId: must be a non-empty string.');
  }
  const trimmed = schoolId.trim();
  if (!trimmed) {
    throw new Error('Invalid schoolId: cannot be empty or whitespace.');
  }
  if (
    trimmed === '*' ||
    trimmed.toLowerCase() === 'all' ||
    /[\s;'"\\]/.test(trimmed)
  ) {
    throw new Error('Invalid schoolId: wildcards and unsafe characters are forbidden.');
  }
  return trimmed;
}

function resolveScopedSchoolId(schoolId: string, ownerUid?: string): string {
  const valid = assertValidSchoolId(schoolId);
  if (!ownerUid) return valid;
  const validUid = assertValidSchoolId(ownerUid);
  return valid.startsWith(`${validUid}:`) ? valid : `${validUid}:${valid}`;
}

/**
 * Safely deletes all tenant operational records (students, teachers, parents,
 * classes, subjects, attendance, exams, grades, and dependent learner/staff rows)
 * associated with the provided `schoolId`, while strictly preserving
 * platform-level tables such as `schools`, `subscriptions`, `users`,
 * `platform_admins`, and `platform_audit_logs`.
 */
export async function clearSchoolData(
  schoolId: string,
  options: ClearSchoolDataOptions = {}
): Promise<ClearSchoolDataResult> {
  const targetSchoolId = resolveScopedSchoolId(schoolId, options.ownerUid);

  try {
    return await db.transaction(async (tx) => {
      // Verify school record exists (and matches ownerUid if supplied)
      const schoolFilter = options.ownerUid
        ? and(eq(schools.id, targetSchoolId), eq(schools.ownerUid, options.ownerUid))
        : eq(schools.id, targetSchoolId);

      const existingSchool = await tx
        .select({ id: schools.id })
        .from(schools)
        .where(schoolFilter);

      if (existingSchool.length === 0) {
        return {
          ok: true,
          schoolId: targetSchoolId,
          cleared: false,
          deletedCounts: {
            grades: 0,
            attendance: 0,
            exams: 0,
            students: 0,
            parents: 0,
            teachers: 0,
            classes: 0,
            subjects: 0,
          },
        };
      }

      // 1. Delete dependent child records referencing students, exams, invoices, or teachers
      await tx.delete(payments).where(eq(payments.schoolId, targetSchoolId));
      await tx.delete(invoices).where(eq(invoices.schoolId, targetSchoolId));
      await tx.delete(feeStructures).where(eq(feeStructures.schoolId, targetSchoolId));
      await tx.delete(reportCards).where(eq(reportCards.schoolId, targetSchoolId));
      await tx
        .delete(formativeAssessments)
        .where(eq(formativeAssessments.schoolId, targetSchoolId));
      await tx.delete(bookLoans).where(eq(bookLoans.schoolId, targetSchoolId));
      await tx
        .delete(studentTransports)
        .where(eq(studentTransports.schoolId, targetSchoolId));
      await tx
        .delete(hostelAllocations)
        .where(eq(hostelAllocations.schoolId, targetSchoolId));
      await tx.delete(disciplineLogs).where(eq(disciplineLogs.schoolId, targetSchoolId));
      await tx.delete(gatePasses).where(eq(gatePasses.schoolId, targetSchoolId));
      await tx.delete(projectScores).where(eq(projectScores.schoolId, targetSchoolId));
      await tx.delete(consentRecords).where(eq(consentRecords.schoolId, targetSchoolId));
      await tx.delete(staffAttendance).where(eq(staffAttendance.schoolId, targetSchoolId));
      await tx.delete(leaveRequests).where(eq(leaveRequests.schoolId, targetSchoolId));
      await tx.delete(payrollRecords).where(eq(payrollRecords.schoolId, targetSchoolId));
      await tx.delete(timetableSlots).where(eq(timetableSlots.schoolId, targetSchoolId));

      // 2. Delete core requested tenant tables scoped strictly by schoolId
      const deletedGrades = await tx
        .delete(grades)
        .where(eq(grades.schoolId, targetSchoolId))
        .returning({ id: grades.id });

      const deletedAttendance = await tx
        .delete(attendance)
        .where(eq(attendance.schoolId, targetSchoolId))
        .returning({ id: attendance.id });

      const deletedExams = await tx
        .delete(exams)
        .where(eq(exams.schoolId, targetSchoolId))
        .returning({ id: exams.id });

      const deletedStudents = await tx
        .delete(students)
        .where(eq(students.schoolId, targetSchoolId))
        .returning({ id: students.id });

      const deletedParents = await tx
        .delete(parents)
        .where(eq(parents.schoolId, targetSchoolId))
        .returning({ id: parents.id });

      const deletedTeachers = await tx
        .delete(teachers)
        .where(eq(teachers.schoolId, targetSchoolId))
        .returning({ id: teachers.id });

      const deletedClasses = await tx
        .delete(classes)
        .where(eq(classes.schoolId, targetSchoolId))
        .returning({ id: classes.id });

      const deletedSubjects = await tx
        .delete(subjects)
        .where(eq(subjects.schoolId, targetSchoolId))
        .returning({ id: subjects.id });

      // 3. Clean matching arrays in school_snapshots while keeping schools & subscriptions intact
      const snap = await tx
        .select()
        .from(schoolSnapshots)
        .where(eq(schoolSnapshots.schoolId, targetSchoolId));

      if (snap.length > 0 && snap[0].payload) {
        const cleanedPayload = {
          ...snap[0].payload,
          students: [],
          teachers: [],
          parents: [],
          classes: [],
          subjects: [],
          attendance: [],
          exams: [],
          grades: [],
          formativeAssessments: [],
          reportCards: [],
          timetable: [],
          invoices: [],
          payments: [],
          bookLoans: [],
          disciplineLogs: [],
        };

        await tx
          .update(schoolSnapshots)
          .set({ payload: cleanedPayload, updatedAt: new Date() })
          .where(eq(schoolSnapshots.schoolId, targetSchoolId));
      }

      return {
        ok: true,
        schoolId: targetSchoolId,
        cleared: true,
        deletedCounts: {
          grades: deletedGrades.length,
          attendance: deletedAttendance.length,
          exams: deletedExams.length,
          students: deletedStudents.length,
          parents: deletedParents.length,
          teachers: deletedTeachers.length,
          classes: deletedClasses.length,
          subjects: deletedSubjects.length,
        },
      };
    });
  } catch (error) {
    console.error('Database error in clearSchoolData:', error);
    throw new Error('Failed to clear school data. Please try again later.', {
      cause: error,
    });
  }
}
