import { performance } from 'perf_hooks';
import { Pool, type PoolConfig, type QueryResult, type QueryResultRow } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { and, eq, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';
import type { NextFunction, Request, Response } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import * as schema from '../db/schema.ts';

export interface PoolLatencySample {
  timestamp: string;
  latencyMs: number;
  ok: boolean;
  source: 'probe' | 'query';
}

export interface PoolErrorEvent {
  id: string;
  timestamp: string;
  source: 'pool' | 'query' | 'probe';
  message: string;
}

export interface DatabaseHealthStats {
  status: 'healthy' | 'degraded' | 'down';
  checkedAt: string;
  uptimeSeconds: number;
  databaseName: string | null;
  postgresVersion: string | null;
  pool: {
    activeConnections: number;
    idleConnections: number;
    totalConnections: number;
    waitingRequests: number;
    maxConnections: number;
    utilizationPercent: number;
    pgStatActivity: {
      totalSessions: number;
      activeSessions: number;
      idleSessions: number;
    } | null;
  };
  latency: {
    currentMs: number | null;
    avgMs: number;
    p95Ms: number;
    minMs: number;
    maxMs: number;
    samples: PoolLatencySample[];
  };
  errors: {
    recentWindowMinutes: number;
    recentErrorRatePercent: number;
    recentTotalRequests: number;
    recentFailedRequests: number;
    lifetimeTotalRequests: number;
    lifetimeFailedRequests: number;
    idlePoolErrors: number;
    recentEvents: PoolErrorEvent[];
  };
}

interface InternalPoolMetrics {
  startedAt: number;
  lifetimeTotalRequests: number;
  lifetimeFailedRequests: number;
  idlePoolErrors: number;
  samples: PoolLatencySample[];
  recentErrors: PoolErrorEvent[];
}

declare global {
  var _postgresPool: Pool | undefined;
  var _pgPoolMetrics: InternalPoolMetrics | undefined;
}

const METRICS_WINDOW_MS = 15 * 60 * 1000;
const MAX_SAMPLES = 120;
const MAX_ERROR_EVENTS = 30;

function getMetricsStore(): InternalPoolMetrics {
  if (!global._pgPoolMetrics) {
    global._pgPoolMetrics = {
      startedAt: Date.now(),
      lifetimeTotalRequests: 0,
      lifetimeFailedRequests: 0,
      idlePoolErrors: 0,
      samples: [],
      recentErrors: [],
    };
  }
  return global._pgPoolMetrics;
}

function sanitizeErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || 'Unknown database error');
  return raw.slice(0, 220);
}

function recordPoolSample(
  latencyMs: number,
  ok: boolean,
  source: 'probe' | 'query',
  error?: unknown
): void {
  const store = getMetricsStore();
  const timestamp = new Date().toISOString();
  const roundedLatency = Math.max(0, Number(latencyMs.toFixed(2)));

  store.lifetimeTotalRequests += 1;
  if (!ok) {
    store.lifetimeFailedRequests += 1;
    store.recentErrors.unshift({
      id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp,
      source,
      message: sanitizeErrorMessage(error),
    });
    if (store.recentErrors.length > MAX_ERROR_EVENTS) {
      store.recentErrors.length = MAX_ERROR_EVENTS;
    }
  }

  store.samples.push({
    timestamp,
    latencyMs: roundedLatency,
    ok,
    source,
  });
  if (store.samples.length > MAX_SAMPLES) {
    store.samples.splice(0, store.samples.length - MAX_SAMPLES);
  }
}

function recordIdlePoolError(error: unknown): void {
  const store = getMetricsStore();
  store.idlePoolErrors += 1;
  store.lifetimeFailedRequests += 1;
  store.recentErrors.unshift({
    id: `pool-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    source: 'pool',
    message: sanitizeErrorMessage(error),
  });
  if (store.recentErrors.length > MAX_ERROR_EVENTS) {
    store.recentErrors.length = MAX_ERROR_EVENTS;
  }
}

export interface ExecuteQueryOptions {
  /** Set to true ONLY for cross-tenant platform-level queries */
  platformLevel?: boolean;
  /** Optional table alias when joining multiple tables (e.g. "s" -> "s.school_id = $N") */
  tableAlias?: string;
}

export interface TenantDbClient {
  schoolId: string | null;
  query: <T extends QueryResultRow = QueryResultRow>(
    queryText: string,
    params?: unknown[],
    options?: ExecuteQueryOptions
  ) => Promise<QueryResult<T>>;
  withDb: <R>(
    handler: (ctx: {
      db: typeof db;
      schoolId: string | null;
      scopeWhere: (schoolIdColumn: PgColumn, extraCondition?: SQL) => SQL | undefined;
    }) => Promise<R>,
    options?: ExecuteQueryOptions
  ) => Promise<R>;
}

export interface TenantRequest extends Request {
  user?: DecodedIdToken;
  schoolId?: string;
  isPlatformOwner?: boolean;
  db?: TenantDbClient;
}

function buildPoolConfig(): PoolConfig {
  const host = process.env.SQL_HOST;
  const database = process.env.SQL_DB_NAME;
  const user = process.env.SQL_USER;
  const password = process.env.SQL_PASSWORD;

  const isUnixSocket = Boolean(host && host.startsWith('/'));
  const isLocalHost = !host || host === 'localhost' || host === '127.0.0.1';

  const config: PoolConfig = {
    host,
    database,
    user,
    password,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  };

  // Cloud SQL Auth Proxy (Unix socket or localhost proxy) handles transport encryption.
  // Enable TLS only when explicitly requested for non-proxy remote TCP hosts.
  if (!isUnixSocket && !isLocalHost && process.env.SQL_SSL === 'true') {
    config.ssl = {
      rejectUnauthorized: process.env.SQL_SSL_REJECT_UNAUTHORIZED !== 'false',
    };
  }

  return config;
}

export function createPool(): Pool {
  if (!global._postgresPool) {
    global._postgresPool = new Pool(buildPoolConfig());

    global._postgresPool.on('error', (err) => {
      recordIdlePoolError(err);
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
}

export const pool = createPool();
export const db = drizzle(pool, { schema });

function hasUnquotedSemicolon(sql: string): boolean {
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const prev = i > 0 ? sql[i - 1] : '';

    if (ch === "'" && !inDoubleQuote && prev !== '\\') {
      if (inSingleQuote && sql[i + 1] === "'") {
        i++;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (ch === '"' && !inSingleQuote && prev !== '\\') {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (!inSingleQuote && !inDoubleQuote && ch === ';') {
      return true;
    }
  }

  return false;
}

/**
 * Finds the matching closing parenthesis index for the '(' at `openIndex`.
 */
function findMatchingParen(sql: string, openIndex: number): number {
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = openIndex; i < sql.length; i++) {
    const ch = sql[i];
    const prev = i > 0 ? sql[i - 1] : '';

    if (ch === "'" && !inDoubleQuote && prev !== '\\') {
      if (inSingleQuote && sql[i + 1] === "'") {
        i++;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (ch === '"' && !inSingleQuote && prev !== '\\') {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (inSingleQuote || inDoubleQuote) continue;

    if (ch === '(') depth++;
    if (ch === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

/**
 * Finds the first top-level (parenthesis depth 0, outside quotes) keyword match.
 */
function findTopLevelKeyword(
  sql: string,
  pattern: RegExp,
  startIndex = 0
): { index: number; length: number } | null {
  let depth = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const prev = i > 0 ? sql[i - 1] : '';

    if (ch === "'" && !inDoubleQuote && prev !== '\\') {
      if (inSingleQuote && sql[i + 1] === "'") {
        i++;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (ch === '"' && !inSingleQuote && prev !== '\\') {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (inSingleQuote || inDoubleQuote) continue;

    if (ch === '(') {
      depth++;
      continue;
    }
    if (ch === ')') {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (depth === 0 && i >= startIndex) {
      const slice = sql.slice(i);
      const match = pattern.exec(slice);
      if (match && match.index === 0) {
        const beforeOk = i === 0 || !/[a-zA-Z0-9_$]/.test(sql[i - 1]);
        if (beforeOk) {
          return { index: i, length: match[0].length };
        }
      }
    }
  }

  return null;
}

/**
 * Automatically injects `school_id` into INSERT INTO table (...) VALUES (...) queries
 * when `school_id` is omitted from the explicit column list.
 */
function injectSchoolIdIntoInsert(
  trimmed: string,
  params: unknown[],
  schoolId: string
): { sql: string; params: unknown[] } {
  const headerMatch = /^insert\s+into\s+(?:"[^"]+"|[a-zA-Z_][a-zA-Z0-9_.]*)\s*\(/i.exec(
    trimmed
  );
  if (!headerMatch) {
    if (!/\bschool_id\b/i.test(trimmed)) {
      throw new Error(
        'Tenant isolation error: INSERT queries must include explicit columns or school_id.'
      );
    }
    return { sql: trimmed, params };
  }

  const colOpenIdx = headerMatch[0].length - 1;
  const colCloseIdx = findMatchingParen(trimmed, colOpenIdx);
  if (colCloseIdx === -1) {
    throw new Error('Malformed SQL INSERT column list.');
  }

  const colList = trimmed.slice(colOpenIdx + 1, colCloseIdx);
  if (/\bschool_id\b/i.test(colList)) {
    return { sql: trimmed, params };
  }

  const valuesMatch = findTopLevelKeyword(trimmed, /^values\b/i, colCloseIdx + 1);
  if (!valuesMatch) {
    throw new Error(
      'Tenant isolation error: INSERT ... SELECT queries must explicitly include school_id.'
    );
  }

  const nextParamIdx = params.length + 1;
  const nextParams = [...params, schoolId];

  // Collect every top-level VALUES (...) tuple closing parenthesis before ON CONFLICT / RETURNING
  const stopMatch = findTopLevelKeyword(
    trimmed,
    /^(on\s+conflict|returning)\b/i,
    valuesMatch.index + valuesMatch.length
  );
  const valuesEndLimit = stopMatch ? stopMatch.index : trimmed.length;

  const tupleCloseIndices: number[] = [];
  let cursor = valuesMatch.index + valuesMatch.length;
  while (cursor < valuesEndLimit) {
    const ch = trimmed[cursor];
    if (ch === '(') {
      const closeIdx = findMatchingParen(trimmed, cursor);
      if (closeIdx === -1 || closeIdx >= valuesEndLimit) {
        throw new Error('Malformed SQL INSERT VALUES tuple.');
      }
      tupleCloseIndices.push(closeIdx);
      cursor = closeIdx + 1;
    } else {
      cursor++;
    }
  }

  if (tupleCloseIndices.length === 0) {
    throw new Error('Malformed SQL INSERT VALUES clause.');
  }

  // Rebuild SQL injecting `, school_id` into column list and `, $N` into each VALUES tuple
  let rebuilt =
    trimmed.slice(0, colCloseIdx) +
    ', school_id' +
    trimmed.slice(colCloseIdx, tupleCloseIndices[0]);

  for (let i = 0; i < tupleCloseIndices.length; i++) {
    const closeIdx = tupleCloseIndices[i];
    const nextStart =
      i + 1 < tupleCloseIndices.length
        ? tupleCloseIndices[i + 1]
        : trimmed.length;
    rebuilt += `, $${nextParamIdx}` + trimmed.slice(closeIdx, nextStart);
  }

  return { sql: rebuilt, params: nextParams };
}

/**
 * Automatically injects a parameterized `school_id = $N` filter (or INSERT column)
 * into SQL queries so tenant-scoped queries cannot bypass school isolation.
 */
function applySchoolIdFilter(
  queryText: string,
  params: unknown[],
  schoolId: string,
  tableAlias?: string
): { sql: string; params: unknown[] } {
  const trimmed = queryText.trim().replace(/;+\s*$/, '');

  if (tableAlias && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableAlias)) {
    throw new Error('Invalid SQL table alias.');
  }

  if (hasUnquotedSemicolon(trimmed)) {
    throw new Error(
      'Tenant isolation error: Multi-statement queries are forbidden.'
    );
  }

  // Disallow DDL / destructive multi-tenant commands in tenant-scoped path
  if (/^(drop|alter|truncate|create|grant|revoke)\b/i.test(trimmed)) {
    throw new Error(
      'Tenant isolation error: DDL/DCL commands are forbidden in tenant queries.'
    );
  }

  const schoolColumn = tableAlias ? `${tableAlias}.school_id` : 'school_id';
  const nextParamIdx = params.length + 1;
  const nextParams = [...params, schoolId];

  // Explicit placeholder support (for complex CTEs or multi-branch queries)
  if (trimmed.includes('{{SCHOOL_FILTER}}')) {
    return {
      sql: trimmed.replaceAll(
        '{{SCHOOL_FILTER}}',
        `${schoolColumn} = $${nextParamIdx}`
      ),
      params: nextParams,
    };
  }

  // Automatically inject school_id into INSERT queries when omitted
  if (/^insert\s+into\b/i.test(trimmed)) {
    return injectSchoolIdIntoInsert(trimmed, params, schoolId);
  }

  const tailClauseRegex =
    /^(group\s+by|having|order\s+by|limit|offset|returning|for\s+update|for\s+share)\b/i;

  // Locate top-level WHERE clause (ignores WHERE inside CTEs or subqueries)
  const whereMatch = findTopLevelKeyword(trimmed, /^where\b/i);
  if (whereMatch) {
    const insertPos = whereMatch.index + whereMatch.length;
    const tailMatch = findTopLevelKeyword(trimmed, tailClauseRegex, insertPos);

    if (tailMatch) {
      const beforeClause = trimmed.slice(insertPos, tailMatch.index).trim();
      const tailClause = trimmed.slice(tailMatch.index);
      return {
        sql: `${trimmed.slice(0, insertPos)} ${schoolColumn} = $${nextParamIdx} AND (${beforeClause}) ${tailClause}`,
        params: nextParams,
      };
    }

    return {
      sql: `${trimmed.slice(0, insertPos)} ${schoolColumn} = $${nextParamIdx} AND (${trimmed.slice(insertPos).trim()})`,
      params: nextParams,
    };
  }

  // No top-level WHERE clause yet: insert before trailing clauses
  const tailMatch = findTopLevelKeyword(trimmed, tailClauseRegex);
  if (tailMatch) {
    return {
      sql: `${trimmed.slice(0, tailMatch.index).trimEnd()} WHERE ${schoolColumn} = $${nextParamIdx} ${trimmed.slice(tailMatch.index)}`,
      params: nextParams,
    };
  }

  return {
    sql: `${trimmed} WHERE ${schoolColumn} = $${nextParamIdx}`,
    params: nextParams,
  };
}

/**
 * Executes a parameterized PostgreSQL query using the connection pool.
 * Every query (except those marked `{ platformLevel: true }`) requires `req.schoolId`
 * and automatically injects `school_id` filtering/values using `req.schoolId`.
 */
export async function executeQuery<T extends QueryResultRow = QueryResultRow>(
  req: TenantRequest,
  queryText: string,
  params: unknown[] = [],
  options: ExecuteQueryOptions = {}
): Promise<QueryResult<T>> {
  const { platformLevel = false, tableAlias } = options;

  if (platformLevel) {
    if (req.user && !req.isPlatformOwner) {
      throw new Error(
        'Forbidden: Platform-level queries require platform owner access.'
      );
    }
    const started = performance.now();
    try {
      const result = await pool.query<T>(queryText, params);
      recordPoolSample(performance.now() - started, true, 'query');
      return result;
    } catch (error) {
      recordPoolSample(performance.now() - started, false, 'query', error);
      console.error('Database platform query failed:', error);
      throw new Error('Database query failed. Please try again later.', {
        cause: error,
      });
    }
  }

  const schoolId = req.schoolId;
  if (!schoolId || typeof schoolId !== 'string' || !schoolId.trim()) {
    throw new Error(
      'Forbidden: req.schoolId is required for tenant-scoped database queries.'
    );
  }

  const normalizedSchoolId = schoolId.trim();
  const scoped = applySchoolIdFilter(
    queryText,
    params,
    normalizedSchoolId,
    tableAlias
  );
  const started = performance.now();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(`SELECT set_config('app.current_school_id', $1, true)`, [
      normalizedSchoolId,
    ]);
    const result = await client.query<T>(scoped.sql, scoped.params);
    await client.query('COMMIT');
    recordPoolSample(performance.now() - started, true, 'query');
    return result;
  } catch (error) {
    recordPoolSample(performance.now() - started, false, 'query', error);
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback errors
    }
    console.error('Database tenant query failed:', error);
    throw new Error('Database query failed. Please try again later.', {
      cause: error,
    });
  } finally {
    client.release();
  }
}

/**
 * Alias for executeQuery to support concise tenant-scoped SQL calls.
 */
export const query = executeQuery;

/**
 * Type-safe Drizzle wrapper that enforces `req.schoolId` isolation for non-platform queries.
 */
export async function withTenantDb<R>(
  req: TenantRequest,
  handler: (ctx: {
    db: typeof db;
    schoolId: string | null;
    scopeWhere: (schoolIdColumn: PgColumn, extraCondition?: SQL) => SQL | undefined;
  }) => Promise<R>,
  options: ExecuteQueryOptions = {}
): Promise<R> {
  const { platformLevel = false } = options;

  if (!platformLevel && (!req.schoolId || !req.schoolId.trim())) {
    throw new Error(
      'Forbidden: req.schoolId is required for tenant-scoped database queries.'
    );
  }

  const schoolId = platformLevel ? null : req.schoolId!.trim();
  const started = performance.now();

  try {
    const result = await handler({
      db,
      schoolId,
      scopeWhere: (schoolIdColumn: PgColumn, extraCondition?: SQL) => {
        if (platformLevel) {
          return extraCondition;
        }
        const tenantFilter = eq(schoolIdColumn, schoolId!);
        return extraCondition ? and(tenantFilter, extraCondition) : tenantFilter;
      },
    });
    recordPoolSample(performance.now() - started, true, 'query');
    return result;
  } catch (error) {
    recordPoolSample(performance.now() - started, false, 'query', error);
    console.error('Database Drizzle tenant operation failed:', error);
    throw new Error('Database operation failed. Please try again later.', {
      cause: error,
    });
  }
}

/**
 * Creates a request-scoped database helper pre-bound to `req.schoolId`.
 */
export function createTenantDb(req: TenantRequest): TenantDbClient {
  return {
    schoolId: req.schoolId ? req.schoolId.trim() : null,
    query: <T extends QueryResultRow = QueryResultRow>(
      queryText: string,
      params: unknown[] = [],
      options: ExecuteQueryOptions = {}
    ) => executeQuery<T>(req, queryText, params, options),
    withDb: <R>(
      handler: (ctx: {
        db: typeof db;
        schoolId: string | null;
        scopeWhere: (schoolIdColumn: PgColumn, extraCondition?: SQL) => SQL | undefined;
      }) => Promise<R>,
      options: ExecuteQueryOptions = {}
    ) => withTenantDb<R>(req, handler, options),
  };
}

/**
 * Express middleware that attaches a tenant-isolated `req.db` client onto the request
 * and guarantees `school_id` injection for all non-platform database operations.
 */
export function tenantDbMiddleware(
  req: TenantRequest,
  res: Response,
  next: NextFunction
): void {
  const headerSchoolId = req.headers['x-school-id'];
  const rawHeaderSchoolId = Array.isArray(headerSchoolId)
    ? headerSchoolId[0]
    : headerSchoolId;
  const paramSchoolId = req.params?.schoolId;
  const rawParamSchoolId = Array.isArray(paramSchoolId)
    ? paramSchoolId[0]
    : paramSchoolId;

  if (!req.schoolId) {
    const candidate = rawParamSchoolId || rawHeaderSchoolId;
    if (candidate && typeof candidate === 'string' && candidate.trim()) {
      const uid = req.user?.uid;
      const trimmedCandidate = candidate.trim();
      req.schoolId =
        uid && !trimmedCandidate.startsWith(`${uid}:`)
          ? `${uid}:${trimmedCandidate}`
          : trimmedCandidate;
    }
  }

  if (!req.schoolId && !req.isPlatformOwner) {
    res.status(403).json({
      error: 'Forbidden: school_id context is required for tenant data access.',
    });
    return;
  }

  req.db = createTenantDb(req);
  next();
}

/**
 * Probes the live PostgreSQL connection pool and returns real-time connection,
 * latency, and error-rate telemetry without exposing secrets or tenant PII.
 */
export async function getDatabaseHealthStats(): Promise<DatabaseHealthStats> {
  const store = getMetricsStore();
  const maxConnections = pool.options.max ?? 10;

  let probeOk = false;
  let currentLatencyMs: number | null = null;
  let databaseName: string | null = null;
  let postgresVersion: string | null = null;
  let pgStatActivity: DatabaseHealthStats['pool']['pgStatActivity'] = null;

  const probeStarted = performance.now();
  try {
    const pingRes = await pool.query<{
      database_name: string;
      pg_version: string;
    }>('SELECT current_database() AS database_name, version() AS pg_version');
    currentLatencyMs = Number((performance.now() - probeStarted).toFixed(2));
    probeOk = true;
    recordPoolSample(currentLatencyMs, true, 'probe');

    const row = pingRes.rows[0];
    if (row) {
      databaseName = row.database_name || null;
      postgresVersion = row.pg_version
        ? row.pg_version.split(',')[0].trim()
        : null;
    }

    try {
      const activityRes = await pool.query<{
        total_sessions: number;
        active_sessions: number;
        idle_sessions: number;
      }>(
        `SELECT
          count(*)::int AS total_sessions,
          count(*) FILTER (WHERE state = 'active')::int AS active_sessions,
          count(*) FILTER (WHERE state = 'idle')::int AS idle_sessions
        FROM pg_stat_activity
        WHERE datname = current_database()`
      );
      if (activityRes.rows[0]) {
        pgStatActivity = {
          totalSessions: Number(activityRes.rows[0].total_sessions) || 0,
          activeSessions: Number(activityRes.rows[0].active_sessions) || 0,
          idleSessions: Number(activityRes.rows[0].idle_sessions) || 0,
        };
      }
    } catch {
      // pg_stat_activity may be restricted on some roles
    }
  } catch (err) {
    const failedLatency = Number((performance.now() - probeStarted).toFixed(2));
    currentLatencyMs = failedLatency;
    recordPoolSample(failedLatency, false, 'probe', err);
  }

  const totalConnections = pool.totalCount;
  const idleConnections = pool.idleCount;
  const waitingRequests = pool.waitingCount;
  const activeConnections = Math.max(0, totalConnections - idleConnections);
  const utilizationPercent =
    maxConnections > 0
      ? Math.min(100, Math.round((totalConnections / maxConnections) * 100))
      : 0;

  const cutoff = Date.now() - METRICS_WINDOW_MS;
  const recentSamples = store.samples.filter(
    (s) => Date.parse(s.timestamp) >= cutoff
  );
  const recentTotalRequests = recentSamples.length;
  const recentFailedRequests = recentSamples.filter((s) => !s.ok).length;
  const recentErrorRatePercent =
    recentTotalRequests > 0
      ? Number(((recentFailedRequests / recentTotalRequests) * 100).toFixed(2))
      : 0;

  const okLatencies = recentSamples
    .filter((s) => s.ok)
    .map((s) => s.latencyMs)
    .sort((a, b) => a - b);

  const avgMs =
    okLatencies.length > 0
      ? Number(
          (
            okLatencies.reduce((sum, val) => sum + val, 0) / okLatencies.length
          ).toFixed(2)
        )
      : currentLatencyMs ?? 0;
  const p95Idx =
    okLatencies.length > 0
      ? Math.min(okLatencies.length - 1, Math.floor(okLatencies.length * 0.95))
      : 0;
  const p95Ms = okLatencies.length > 0 ? okLatencies[p95Idx] : currentLatencyMs ?? 0;
  const minMs = okLatencies.length > 0 ? okLatencies[0] : currentLatencyMs ?? 0;
  const maxMs =
    okLatencies.length > 0
      ? okLatencies[okLatencies.length - 1]
      : currentLatencyMs ?? 0;

  let status: DatabaseHealthStats['status'] = 'healthy';
  if (!probeOk) {
    status = 'down';
  } else if (
    (currentLatencyMs !== null && currentLatencyMs > 500) ||
    recentErrorRatePercent >= 5 ||
    waitingRequests > 0
  ) {
    status = 'degraded';
  }

  return {
    status,
    checkedAt: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - store.startedAt) / 1000),
    databaseName,
    postgresVersion,
    pool: {
      activeConnections,
      idleConnections,
      totalConnections,
      waitingRequests,
      maxConnections,
      utilizationPercent,
      pgStatActivity,
    },
    latency: {
      currentMs: currentLatencyMs,
      avgMs,
      p95Ms,
      minMs,
      maxMs,
      samples: store.samples.slice(-40),
    },
    errors: {
      recentWindowMinutes: Math.round(METRICS_WINDOW_MS / 60000),
      recentErrorRatePercent,
      recentTotalRequests,
      recentFailedRequests,
      lifetimeTotalRequests: store.lifetimeTotalRequests,
      lifetimeFailedRequests: store.lifetimeFailedRequests,
      idlePoolErrors: store.idlePoolErrors,
      recentEvents: store.recentErrors.slice(0, 20),
    },
  };
}
