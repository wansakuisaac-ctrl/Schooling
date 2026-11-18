import { dbService } from './storage';
import { SqlSyncService } from './sqlSync';

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  error: string | null;
  syncedCount: {
    schools: number;
    students: number;
    grades: number;
    invoices: number;
  };
}

export class CloudSyncService {
  private static status: SyncStatus = {
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
    syncedCount: { schools: 0, students: 0, grades: 0, invoices: 0 },
  };

  public static getStatus(): SyncStatus {
    return { ...this.status };
  }

  /**
   * Syncs local workspace data to the PostgreSQL backend
   */
  public static async pushLocalToCloud(schoolId?: string): Promise<SyncStatus> {
    this.status.isSyncing = true;
    this.status.error = null;

    try {
      const schools = dbService.getSchools();
      const targetSchools = schoolId
        ? schools.filter((s) => s.id === schoolId)
        : schools;

      let totalStudents = 0;
      let totalGrades = 0;
      let totalInvoices = 0;

      for (const school of targetSchools) {
        const ok = await SqlSyncService.pushSchoolToSql(school.id);
        if (!ok) {
          throw new Error('Authentication required to synchronize data.');
        }

        totalStudents += dbService.getStudents(school.id).length;
        const exams = dbService.getExams(school.id);
        for (const exam of exams) {
          totalGrades += dbService.getGrades(school.id, exam.id).length;
        }
        totalInvoices += dbService.getInvoices(school.id).length;
      }

      this.status = {
        isSyncing: false,
        lastSyncedAt: new Date(),
        error: null,
        syncedCount: {
          schools: targetSchools.length,
          students: totalStudents,
          grades: totalGrades,
          invoices: totalInvoices,
        },
      };

      return this.status;
    } catch (err: unknown) {
      this.status.isSyncing = false;
      this.status.error = err instanceof Error ? err.message : String(err);
      console.error('SQL Sync Error:', err);
      return this.status;
    }
  }
}
