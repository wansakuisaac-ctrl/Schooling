import {
  cacheAttendanceForSchool,
  cacheReportCardsForSchool,
  cacheStudentsForSchool,
  getCachedAttendance,
  getCachedReportCards,
  getCachedStudentOfflineBundle,
  getCachedStudents,
  getPendingSyncQueue,
  StudentOfflineBundle,
  SyncQueueEntry,
} from '../lib/offlineCache';
import { Attendance, ReportCard, Student } from '../types';
import { SqlSyncService } from './sqlSync';

/**
 * Coordinates offline IndexedDB caching for student, attendance, and report card
 * records and automatically synchronizes queued updates when connectivity returns.
 */
export class SyncService {
  public static start(onSynced?: () => void): () => void {
    return SqlSyncService.startOnlineSyncListener(onSynced);
  }

  public static hydrateOfflineData(): Promise<boolean> {
    return SqlSyncService.hydrateFromOfflineCache();
  }

  public static cacheActiveSchool(schoolId: string): Promise<void> {
    return SqlSyncService.cacheActiveSchoolLocally(schoolId);
  }

  public static cacheStudents(schoolId: string, students: Student[]): Promise<void> {
    return cacheStudentsForSchool(schoolId, students);
  }

  public static cacheAttendance(
    schoolId: string,
    attendance: Attendance[]
  ): Promise<void> {
    return cacheAttendanceForSchool(schoolId, attendance);
  }

  public static cacheReportCards(
    schoolId: string,
    reportCards: ReportCard[]
  ): Promise<void> {
    return cacheReportCardsForSchool(schoolId, reportCards);
  }

  public static getOfflineStudents(schoolId: string): Promise<Student[]> {
    return getCachedStudents(schoolId);
  }

  public static getOfflineAttendance(
    schoolId: string,
    studentId?: string
  ): Promise<Attendance[]> {
    return getCachedAttendance(schoolId, studentId);
  }

  public static getOfflineReportCards(
    schoolId: string,
    studentId?: string
  ): Promise<ReportCard[]> {
    return getCachedReportCards(schoolId, studentId);
  }

  public static getOfflineStudentBundle(
    schoolId: string,
    studentId: string
  ): Promise<StudentOfflineBundle> {
    return getCachedStudentOfflineBundle(schoolId, studentId);
  }

  public static getPendingSyncJobs(): Promise<SyncQueueEntry[]> {
    return getPendingSyncQueue();
  }

  public static syncNow(explicitToken?: string): Promise<number> {
    return SqlSyncService.flushPendingQueue(explicitToken);
  }

  public static syncOnReconnect(): Promise<boolean> {
    return SqlSyncService.triggerReconnectSync();
  }
}
