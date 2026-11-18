import {
  cacheSchoolWorkspace,
  clearCachedSchoolOperationalData,
  enqueueOfflineSync,
  getCachedAttendance,
  getCachedReportCards,
  getCachedReports,
  getCachedStudentOfflineBundle,
  getCachedStudents,
  getCachedWorkspaces,
  getPendingSyncQueue,
  removeSyncQueueItem,
} from '../lib/offlineCache';
import { getMemoryIdToken } from './firebase';
import { dbService } from './storage';

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let activeSchoolIdForSync: string | null = null;
let flushPromise: Promise<number> | null = null;
let onlineListenerRegistered = false;
let retryIntervalHandle: ReturnType<typeof setInterval> | null = null;
let latestOnSyncedCallback: (() => void) | undefined;

const NETWORK_TIMEOUT_MS = 12000;
const RETRY_INTERVAL_MS = 30000;

function isNavigatorOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = NETWORK_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export class SqlSyncService {
  public static setActiveSchoolId(schoolId: string | null) {
    activeSchoolIdForSync = schoolId;
  }

  public static scheduleSync(schoolId?: string) {
    const targetSchoolId = schoolId || activeSchoolIdForSync;
    if (!targetSchoolId) return;

    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      void this.pushSchoolToSql(targetSchoolId);
    }, 600);
  }

  public static async cacheActiveSchoolLocally(schoolId: string): Promise<void> {
    const payload = dbService.exportSchoolWorkspaceForSql(schoolId);
    if (!payload) return;
    await cacheSchoolWorkspace(payload);
  }

  public static async hydrateFromOfflineCache(): Promise<boolean> {
    try {
      const cached = await getCachedWorkspaces();
      if (!cached || cached.length === 0) return false;
      dbService.hydrateFromSqlWorkspaces(cached);
      return true;
    } catch (error) {
      console.warn('IndexedDB offline hydration failed:', error);
      return false;
    }
  }

  public static getOfflineStudents(schoolId: string) {
    return getCachedStudents(schoolId);
  }

  public static getOfflineReports(schoolId: string) {
    return getCachedReports(schoolId);
  }

  public static getOfflineReportCards(schoolId: string, studentId?: string) {
    return getCachedReportCards(schoolId, studentId);
  }

  public static getOfflineAttendance(schoolId: string, studentId?: string) {
    return getCachedAttendance(schoolId, studentId);
  }

  public static getOfflineStudentBundle(schoolId: string, studentId: string) {
    return getCachedStudentOfflineBundle(schoolId, studentId);
  }

  public static async verifyBackendAuth(explicitToken?: string): Promise<boolean> {
    if (!isNavigatorOnline()) return false;
    try {
      const token = explicitToken || (await getMemoryIdToken());
      if (!token) return false;

      const res = await fetchWithTimeout('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  public static async pullWorkspacesFromSql(explicitToken?: string): Promise<boolean> {
    if (!isNavigatorOnline()) {
      return this.hydrateFromOfflineCache();
    }

    try {
      const token = explicitToken || (await getMemoryIdToken());
      if (!token) {
        return this.hydrateFromOfflineCache();
      }

      const res = await fetchWithTimeout('/api/sql/workspace', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        return this.hydrateFromOfflineCache();
      }

      const data = await res.json();
      if (Array.isArray(data.workspaces) && data.workspaces.length > 0) {
        dbService.hydrateFromSqlWorkspaces(data.workspaces);
        await Promise.all(
          data.workspaces.map((ws: Parameters<typeof cacheSchoolWorkspace>[0]) =>
            cacheSchoolWorkspace(ws)
          )
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Background SQL pull failed, falling back to IndexedDB cache:', error);
      return this.hydrateFromOfflineCache();
    }
  }

  public static async pushSchoolToSql(
    schoolId: string,
    explicitToken?: string
  ): Promise<boolean> {
    const payload = dbService.exportSchoolWorkspaceForSql(schoolId);
    if (!payload) return false;

    // Always persist latest school workspace, students, report cards, and attendance locally
    await cacheSchoolWorkspace(payload);

    if (!isNavigatorOnline()) {
      await enqueueOfflineSync(schoolId, 'sync');
      return false;
    }

    try {
      const token = explicitToken || (await getMemoryIdToken());
      if (!token) {
        return false;
      }

      const res = await fetchWithTimeout('/api/sql/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-School-Id': schoolId,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await removeSyncQueueItem(schoolId);
        return true;
      }

      if (res.status >= 500 || res.status === 408 || res.status === 429) {
        await enqueueOfflineSync(schoolId, 'sync');
      }
      return false;
    } catch (error) {
      console.error('Background SQL sync failed, queued in IndexedDB:', error);
      await enqueueOfflineSync(schoolId, 'sync');
      return false;
    }
  }

  public static async clearOperationalInSql(schoolId: string): Promise<boolean> {
    await clearCachedSchoolOperationalData(schoolId);

    if (!isNavigatorOnline()) {
      await enqueueOfflineSync(schoolId, 'clear');
      return false;
    }

    try {
      const token = await getMemoryIdToken();
      if (!token) return false;

      const res = await fetchWithTimeout(
        `/api/sql/operational/${encodeURIComponent(schoolId)}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'X-School-Id': schoolId,
          },
        }
      );

      if (res.ok) {
        await removeSyncQueueItem(schoolId);
        return true;
      }

      if (res.status >= 500 || res.status === 408 || res.status === 429) {
        await enqueueOfflineSync(schoolId, 'clear');
      }
      return false;
    } catch (error) {
      console.error('Failed to clear SQL operational data, queued in IndexedDB:', error);
      await enqueueOfflineSync(schoolId, 'clear');
      return false;
    }
  }

  public static async flushPendingQueue(explicitToken?: string): Promise<number> {
    if (!isNavigatorOnline()) return 0;
    if (flushPromise) return flushPromise;

    flushPromise = (async () => {
      try {
        const token = explicitToken || (await getMemoryIdToken());
        if (!token) return 0;

        const queue = await getPendingSyncQueue();
        if (queue.length === 0) return 0;

        let syncedCount = 0;
        const cachedWorkspaces = await getCachedWorkspaces();

        for (const item of queue) {
          try {
            if (item.action === 'clear') {
              const res = await fetchWithTimeout(
                `/api/sql/operational/${encodeURIComponent(item.schoolId)}`,
                {
                  method: 'DELETE',
                  headers: {
                    Authorization: `Bearer ${token}`,
                    'X-School-Id': item.schoolId,
                  },
                }
              );
              if (res.ok || res.status === 404) {
                await removeSyncQueueItem(item.schoolId);
                syncedCount++;
              }
            } else {
              const payload =
                dbService.exportSchoolWorkspaceForSql(item.schoolId) ||
                cachedWorkspaces.find((ws) => ws.school?.id === item.schoolId);

              if (!payload) {
                await removeSyncQueueItem(item.schoolId);
                continue;
              }

              const res = await fetchWithTimeout('/api/sql/sync', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                  'X-School-Id': item.schoolId,
                },
                body: JSON.stringify(payload),
              });
              if (res.ok) {
                await removeSyncQueueItem(item.schoolId);
                syncedCount++;
              }
            }
          } catch {
            // Retain item in IndexedDB queue for the next reconnect attempt
          }
        }

        return syncedCount;
      } finally {
        flushPromise = null;
      }
    })();

    return flushPromise;
  }

  public static async triggerReconnectSync(): Promise<boolean> {
    if (!isNavigatorOnline()) return false;
    const synced = await this.flushPendingQueue();
    const pulled = await this.pullWorkspacesFromSql();
    if (synced > 0 || pulled) {
      latestOnSyncedCallback?.();
      return true;
    }
    return false;
  }

  public static startOnlineSyncListener(onSynced?: () => void): () => void {
    latestOnSyncedCallback = onSynced;
    if (typeof window === 'undefined') {
      return () => {};
    }

    if (!onlineListenerRegistered) {
      onlineListenerRegistered = true;

      window.addEventListener('online', () => {
        void this.triggerReconnectSync();
      });

      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible' && isNavigatorOnline()) {
            void (async () => {
              const queue = await getPendingSyncQueue();
              if (queue.length > 0) {
                await this.triggerReconnectSync();
              }
            })();
          }
        });
      }

      retryIntervalHandle = setInterval(() => {
        if (!isNavigatorOnline()) return;
        void (async () => {
          const queue = await getPendingSyncQueue();
          if (queue.length > 0) {
            await this.triggerReconnectSync();
          }
        })();
      }, RETRY_INTERVAL_MS);
    }

    return () => {
      latestOnSyncedCallback = undefined;
      if (retryIntervalHandle && typeof window === 'undefined') {
        clearInterval(retryIntervalHandle);
        retryIntervalHandle = null;
      }
    };
  }
}
