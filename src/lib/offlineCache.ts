import {
  Attendance,
  Exam,
  Grade,
  Invoice,
  Payment,
  ReportCard,
  School,
  Student,
} from '../types';
import type { DatabaseSchema } from '../services/storage';

const IDB_NAME = 'elimucore_offline_cache_v1';
const IDB_VERSION = 2;

const STORES = {
  WORKSPACES: 'workspaces',
  STUDENTS: 'students',
  REPORTS: 'reports',
  REPORT_CARDS: 'report_cards',
  ATTENDANCE: 'attendance',
  SYNC_QUEUE: 'sync_queue',
} as const;

export interface CachedReportRecord {
  id: string;
  school_id: string;
  kind: 'report_card' | 'exam' | 'grade';
  data: ReportCard | Exam | Grade;
}

export interface OfflineWorkspaceSnapshot {
  school: School;
  students: Student[];
  exams: Exam[];
  grades: Grade[];
  attendance: Attendance[];
  invoices: Invoice[];
  payments: Payment[];
  snapshot: Partial<DatabaseSchema>;
  cachedAt?: string;
}

export interface SyncQueueEntry {
  schoolId: string;
  action: 'sync' | 'clear';
  queuedAt: string;
}

export interface StudentOfflineBundle {
  student: Student | null;
  attendance: Attendance[];
  reportCards: ReportCard[];
  grades: Grade[];
  exams: Exam[];
}

let dbPromise: Promise<IDBDatabase | null> | null = null;

function isIndexedDbSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function openCacheDb(): Promise<IDBDatabase | null> {
  if (!isIndexedDbSupported()) {
    return Promise.resolve(null);
  }
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise<IDBDatabase | null>((resolve) => {
    try {
      const request = window.indexedDB.open(IDB_NAME, IDB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        const upgradeTx = request.transaction;

        if (!db.objectStoreNames.contains(STORES.WORKSPACES)) {
          db.createObjectStore(STORES.WORKSPACES, { keyPath: 'school.id' });
        }

        if (!db.objectStoreNames.contains(STORES.STUDENTS)) {
          const store = db.createObjectStore(STORES.STUDENTS, { keyPath: 'id' });
          store.createIndex('by_school', 'school_id', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.REPORTS)) {
          const store = db.createObjectStore(STORES.REPORTS, { keyPath: 'id' });
          store.createIndex('by_school', 'school_id', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.REPORT_CARDS)) {
          const store = db.createObjectStore(STORES.REPORT_CARDS, { keyPath: 'id' });
          store.createIndex('by_school', 'school_id', { unique: false });
          store.createIndex('by_student', 'student_id', { unique: false });
        } else if (upgradeTx) {
          const store = upgradeTx.objectStore(STORES.REPORT_CARDS);
          if (!store.indexNames.contains('by_student')) {
            store.createIndex('by_student', 'student_id', { unique: false });
          }
        }

        if (!db.objectStoreNames.contains(STORES.ATTENDANCE)) {
          const store = db.createObjectStore(STORES.ATTENDANCE, { keyPath: 'id' });
          store.createIndex('by_school', 'school_id', { unique: false });
          store.createIndex('by_student', 'student_id', { unique: false });
        } else if (upgradeTx) {
          const store = upgradeTx.objectStore(STORES.ATTENDANCE);
          if (!store.indexNames.contains('by_student')) {
            store.createIndex('by_student', 'student_id', { unique: false });
          }
        }

        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'schoolId' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.warn('IndexedDB unavailable for offline cache:', request.error);
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });

  return dbPromise;
}

/**
 * Deletes all records matching schoolId from an object store within the
 * active transaction, invoking onDone synchronously inside the final IDB
 * callback so subsequent puts remain within the same active transaction.
 */
function deleteBySchoolInTx(
  store: IDBObjectStore,
  schoolId: string,
  onDone: () => void
): void {
  const index = store.index('by_school');
  const cursorReq = index.openCursor(IDBKeyRange.only(schoolId));

  cursorReq.onsuccess = () => {
    const cursor = cursorReq.result;
    if (cursor) {
      cursor.delete();
      cursor.continue();
    } else {
      onDone();
    }
  };
  cursorReq.onerror = () => onDone();
}

function readBySchoolFromStore<T>(
  storeName: string,
  schoolId: string
): Promise<T[]> {
  return openCacheDb().then((db) => {
    if (!db) return [];
    return new Promise<T[]>((resolve) => {
      try {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index('by_school');
        const req = index.getAll(IDBKeyRange.only(schoolId));
        req.onsuccess = () => resolve((req.result as T[]) || []);
        req.onerror = () => resolve([]);
      } catch {
        resolve([]);
      }
    });
  });
}

/**
 * Caches a school's full workspace along with indexed student records,
 * attendance records, report cards, exams, and grades in IndexedDB.
 */
export async function cacheSchoolWorkspace(
  workspace: OfflineWorkspaceSnapshot
): Promise<void> {
  const db = await openCacheDb();
  if (!db || !workspace?.school?.id) return;

  const schoolId = workspace.school.id;
  const cachedEntry: OfflineWorkspaceSnapshot = {
    ...workspace,
    cachedAt: new Date().toISOString(),
  };

  return new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(
        [
          STORES.WORKSPACES,
          STORES.STUDENTS,
          STORES.REPORTS,
          STORES.REPORT_CARDS,
          STORES.ATTENDANCE,
        ],
        'readwrite'
      );

      const wsStore = tx.objectStore(STORES.WORKSPACES);
      const studentStore = tx.objectStore(STORES.STUDENTS);
      const reportStore = tx.objectStore(STORES.REPORTS);
      const reportCardStore = tx.objectStore(STORES.REPORT_CARDS);
      const attendanceStore = tx.objectStore(STORES.ATTENDANCE);

      wsStore.put(cachedEntry);

      deleteBySchoolInTx(studentStore, schoolId, () => {
        for (const student of workspace.students || []) {
          studentStore.put(student);
        }
      });

      deleteBySchoolInTx(attendanceStore, schoolId, () => {
        for (const att of workspace.attendance || []) {
          attendanceStore.put(att);
        }
      });

      deleteBySchoolInTx(reportCardStore, schoolId, () => {
        for (const rc of workspace.snapshot?.reportCards || []) {
          reportCardStore.put(rc);
        }
      });

      deleteBySchoolInTx(reportStore, schoolId, () => {
        for (const exam of workspace.exams || []) {
          reportStore.put({
            id: `exam:${exam.id}`,
            school_id: schoolId,
            kind: 'exam',
            data: exam,
          } satisfies CachedReportRecord);
        }

        for (const grade of workspace.grades || []) {
          reportStore.put({
            id: `grade:${grade.id}`,
            school_id: schoolId,
            kind: 'grade',
            data: grade,
          } satisfies CachedReportRecord);
        }

        for (const rc of workspace.snapshot?.reportCards || []) {
          reportStore.put({
            id: `rc:${rc.id}`,
            school_id: schoolId,
            kind: 'report_card',
            data: rc,
          } satisfies CachedReportRecord);
        }
      });

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Caches student records independently for fast teacher & parent offline access.
 */
export async function cacheStudentsForSchool(
  schoolId: string,
  studentList: Student[]
): Promise<void> {
  const db = await openCacheDb();
  if (!db || !schoolId) return;

  return new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORES.STUDENTS, 'readwrite');
      const store = tx.objectStore(STORES.STUDENTS);
      deleteBySchoolInTx(store, schoolId, () => {
        for (const st of studentList) {
          store.put(st);
        }
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Caches attendance records independently for offline roll-call & parent views.
 */
export async function cacheAttendanceForSchool(
  schoolId: string,
  records: Attendance[]
): Promise<void> {
  const db = await openCacheDb();
  if (!db || !schoolId) return;

  return new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORES.ATTENDANCE, 'readwrite');
      const store = tx.objectStore(STORES.ATTENDANCE);
      deleteBySchoolInTx(store, schoolId, () => {
        for (const rec of records) {
          store.put(rec);
        }
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Caches official CBC report cards independently for offline teacher & parent access.
 */
export async function cacheReportCardsForSchool(
  schoolId: string,
  reportCards: ReportCard[]
): Promise<void> {
  const db = await openCacheDb();
  if (!db || !schoolId) return;

  return new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORES.REPORT_CARDS, 'readwrite');
      const store = tx.objectStore(STORES.REPORT_CARDS);
      deleteBySchoolInTx(store, schoolId, () => {
        for (const rc of reportCards) {
          store.put(rc);
        }
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Retrieves all cached school workspaces from IndexedDB for offline hydration.
 */
export async function getCachedWorkspaces(): Promise<OfflineWorkspaceSnapshot[]> {
  const db = await openCacheDb();
  if (!db) return [];

  return new Promise<OfflineWorkspaceSnapshot[]>((resolve) => {
    try {
      const tx = db.transaction(STORES.WORKSPACES, 'readonly');
      const req = tx.objectStore(STORES.WORKSPACES).getAll();
      req.onsuccess = () =>
        resolve((req.result as OfflineWorkspaceSnapshot[]) || []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/**
 * Reads cached student records for a school from IndexedDB.
 */
export function getCachedStudents(schoolId: string): Promise<Student[]> {
  return readBySchoolFromStore<Student>(STORES.STUDENTS, schoolId);
}

/**
 * Reads cached reports (report cards, exams, grades) for a school from IndexedDB.
 */
export function getCachedReports(
  schoolId: string
): Promise<CachedReportRecord[]> {
  return readBySchoolFromStore<CachedReportRecord>(STORES.REPORTS, schoolId);
}

/**
 * Reads cached report cards for a school (optionally filtered by studentId) from IndexedDB.
 */
export async function getCachedReportCards(
  schoolId: string,
  studentId?: string
): Promise<ReportCard[]> {
  const all = await readBySchoolFromStore<ReportCard>(STORES.REPORT_CARDS, schoolId);
  return studentId ? all.filter((rc) => rc.student_id === studentId) : all;
}

/**
 * Reads cached attendance records for a school (optionally filtered by studentId) from IndexedDB.
 */
export async function getCachedAttendance(
  schoolId: string,
  studentId?: string
): Promise<Attendance[]> {
  const all = await readBySchoolFromStore<Attendance>(STORES.ATTENDANCE, schoolId);
  return studentId ? all.filter((a) => a.student_id === studentId) : all;
}

/**
 * Returns a student's complete offline bundle (profile, attendance, report cards,
 * grades, exams) from IndexedDB for offline teacher & parent access.
 */
export async function getCachedStudentOfflineBundle(
  schoolId: string,
  studentId: string
): Promise<StudentOfflineBundle> {
  const [students, attendance, reportCards, reports] = await Promise.all([
    getCachedStudents(schoolId),
    getCachedAttendance(schoolId, studentId),
    getCachedReportCards(schoolId, studentId),
    getCachedReports(schoolId),
  ]);

  const grades = reports
    .filter((r) => r.kind === 'grade')
    .map((r) => r.data as Grade)
    .filter((g) => g.student_id === studentId);

  const exams = reports
    .filter((r) => r.kind === 'exam')
    .map((r) => r.data as Exam);

  return {
    student: students.find((s) => s.id === studentId) || null,
    attendance,
    reportCards,
    grades,
    exams,
  };
}

/**
 * Clears cached students, reports, report cards, and attendance for a school in IndexedDB
 * while retaining the school workspace metadata.
 */
export async function clearCachedSchoolOperationalData(
  schoolId: string
): Promise<void> {
  const db = await openCacheDb();
  if (!db || !schoolId) return;

  return new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(
        [
          STORES.WORKSPACES,
          STORES.STUDENTS,
          STORES.REPORTS,
          STORES.REPORT_CARDS,
          STORES.ATTENDANCE,
        ],
        'readwrite'
      );

      deleteBySchoolInTx(tx.objectStore(STORES.STUDENTS), schoolId, () => {});
      deleteBySchoolInTx(tx.objectStore(STORES.REPORTS), schoolId, () => {});
      deleteBySchoolInTx(tx.objectStore(STORES.REPORT_CARDS), schoolId, () => {});
      deleteBySchoolInTx(tx.objectStore(STORES.ATTENDANCE), schoolId, () => {});

      const wsStore = tx.objectStore(STORES.WORKSPACES);
      const wsReq = wsStore.get(schoolId);
      wsReq.onsuccess = () => {
        const existing = wsReq.result as OfflineWorkspaceSnapshot | undefined;
        if (existing) {
          wsStore.put({
            ...existing,
            students: [],
            exams: [],
            grades: [],
            attendance: [],
            snapshot: {
              ...existing.snapshot,
              teachers: [],
              parents: [],
              classes: [],
              subjects: [],
              reportCards: [],
              formativeAssessments: [],
            },
            cachedAt: new Date().toISOString(),
          } satisfies OfflineWorkspaceSnapshot);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Enqueues a pending synchronization job in IndexedDB when offline or when
 * PostgreSQL is temporarily unreachable.
 */
export async function enqueueOfflineSync(
  schoolId: string,
  action: 'sync' | 'clear'
): Promise<void> {
  const db = await openCacheDb();
  if (!db || !schoolId) return;

  return new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      tx.objectStore(STORES.SYNC_QUEUE).put({
        schoolId,
        action,
        queuedAt: new Date().toISOString(),
      } satisfies SyncQueueEntry);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

/**
 * Returns all pending offline sync jobs queued in IndexedDB.
 */
export async function getPendingSyncQueue(): Promise<SyncQueueEntry[]> {
  const db = await openCacheDb();
  if (!db) return [];

  return new Promise<SyncQueueEntry[]>((resolve) => {
    try {
      const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
      const req = tx.objectStore(STORES.SYNC_QUEUE).getAll();
      req.onsuccess = () => resolve((req.result as SyncQueueEntry[]) || []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/**
 * Removes a completed sync job from the IndexedDB offline queue.
 */
export async function removeSyncQueueItem(schoolId: string): Promise<void> {
  const db = await openCacheDb();
  if (!db || !schoolId) return;

  return new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
      tx.objectStore(STORES.SYNC_QUEUE).delete(schoolId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
