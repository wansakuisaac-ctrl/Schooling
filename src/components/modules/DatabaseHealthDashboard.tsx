import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  RefreshCw,
  ServerCrash,
  XCircle,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getMemoryIdToken } from '../../services/firebase';

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

type PollIntervalOption = 5000 | 10000 | 30000 | 0;

function formatUptime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function formatClockTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export const DatabaseHealthDashboard: React.FC = () => {
  const [stats, setStats] = useState<DatabaseHealthStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [pollIntervalMs, setPollIntervalMs] = useState<PollIntervalOption>(5000);
  const [eventFilter, setEventFilter] = useState<'all' | 'errors'>('all');

  const loadHealth = useCallback(async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
    }
    try {
      const token = await getMemoryIdToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch('/api/admin/db-health', {
        headers,
        cache: 'no-store',
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Health probe returned HTTP ${res.status}`);
      }

      const payload = (await res.json()) as DatabaseHealthStats;
      setStats(payload);
      setFetchError(null);
    } catch (err: unknown) {
      setFetchError(
        err instanceof Error
          ? err.message
          : 'Unable to reach PostgreSQL health endpoint'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadHealth(false);
  }, [loadHealth]);

  useEffect(() => {
    if (pollIntervalMs === 0) return;
    const timer = window.setInterval(() => {
      void loadHealth(false);
    }, pollIntervalMs);
    return () => window.clearInterval(timer);
  }, [pollIntervalMs, loadHealth]);

  const chartData = useMemo(() => {
    if (!stats?.latency.samples) return [];
    return stats.latency.samples.map((sample) => ({
      time: formatClockTime(sample.timestamp),
      latencyMs: sample.latencyMs,
      ok: sample.ok,
      source: sample.source,
    }));
  }, [stats?.latency.samples]);

  const statusMeta = useMemo(() => {
    const currentStatus = stats?.status || (fetchError ? 'down' : 'healthy');
    if (currentStatus === 'down') {
      return {
        label: 'Unreachable',
        textClass: 'text-rose-700',
        surfaceClass: 'bg-rose-50 border-rose-200',
        icon: XCircle,
      };
    }
    if (currentStatus === 'degraded') {
      return {
        label: 'Degraded',
        textClass: 'text-amber-700',
        surfaceClass: 'bg-amber-50 border-amber-200',
        icon: AlertTriangle,
      };
    }
    return {
      label: 'Healthy',
      textClass: 'text-emerald-700',
      surfaceClass: 'bg-emerald-50 border-emerald-200',
      icon: CheckCircle2,
    };
  }, [stats?.status, fetchError]);

  const StatusIcon = statusMeta.icon;

  const filteredEvents = useMemo(() => {
    if (!stats) return [];
    if (eventFilter === 'errors') {
      return stats.errors.recentEvents.map((evt) => ({
        id: evt.id,
        timestamp: evt.timestamp,
        kind: evt.source,
        ok: false,
        detail: evt.message,
        latencyMs: null as number | null,
      }));
    }

    const sampleRows = [...stats.latency.samples]
      .reverse()
      .slice(0, 15)
      .map((sample, idx) => ({
        id: `sample-${sample.timestamp}-${idx}`,
        timestamp: sample.timestamp,
        kind: sample.source,
        ok: sample.ok,
        detail: sample.ok
          ? sample.source === 'probe'
            ? 'Live pool health ping succeeded'
            : 'Parameterized pool query committed'
          : 'Query execution failed',
        latencyMs: sample.latencyMs,
      }));

    return sampleRows;
  }, [stats, eventFilter]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header & Live Polling Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-slate-700 shrink-0" />
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              PostgreSQL Connection Pool Health
            </h1>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{stats?.databaseName || 'Cloud SQL PostgreSQL'}</span>
            <span aria-hidden="true">·</span>
            <span>{stats?.postgresVersion || 'pg Pool Monitor'}</span>
            {stats?.checkedAt && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  Last probe {formatClockTime(stats.checkedAt)}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Polling Cadence Segmented Control */}
          <div
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200"
            role="group"
            aria-label="Polling interval"
          >
            {(
              [
                { value: 5000, label: '5s' },
                { value: 10000, label: '10s' },
                { value: 30000, label: '30s' },
                { value: 0, label: 'Paused' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPollIntervalMs(opt.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition whitespace-nowrap shrink-0 cursor-pointer ${
                  pollIntervalMs === opt.value
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void loadHealth(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
            />
            <span>Run Probe</span>
          </button>
        </div>
      </div>

      {/* Fetch Error Banner */}
      {fetchError && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2.5 text-xs text-rose-800">
            <ServerCrash className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-900">
                Telemetry endpoint unreachable
              </p>
              <p className="mt-0.5 text-rose-700">{fetchError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void loadHealth(true)}
            className="px-3.5 py-1.5 bg-white border border-rose-300 hover:bg-rose-100 text-rose-800 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 cursor-pointer"
          >
            Retry Probe
          </button>
        </div>
      )}

      {/* Primary KPI Strip */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((slot) => (
            <div
              key={slot}
              className="bg-white p-5 rounded-xl border border-slate-200 animate-pulse space-y-3"
            >
              <div className="h-3 w-28 bg-slate-200 rounded" />
              <div className="h-7 w-24 bg-slate-200 rounded" />
              <div className="h-3 w-40 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Connection Health */}
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Connection Status</span>
              <StatusIcon className={`w-4 h-4 ${statusMeta.textClass}`} />
            </div>
            <div
              className={`mt-2 text-2xl font-bold tracking-tight ${statusMeta.textClass}`}
            >
              {statusMeta.label}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
              <span>Uptime {stats ? formatUptime(stats.uptimeSeconds) : '0s'}</span>
              <span aria-hidden="true">·</span>
              <span>
                {pollIntervalMs > 0
                  ? `Auto ${pollIntervalMs / 1000}s`
                  : 'Polling paused'}
              </span>
            </div>
          </div>

          {/* 2. Active Connections */}
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Active Pool Connections</span>
              <Activity className="w-4 h-4 text-emerald-700" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {stats?.pool.activeConnections ?? 0}
              <span className="text-sm font-normal text-slate-400">
                {' '}
                / {stats?.pool.maxConnections ?? 10} max
              </span>
            </div>
            <div className="mt-2.5 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-200"
                style={{
                  width: `${Math.min(100, stats?.pool.utilizationPercent ?? 0)}%`,
                }}
              />
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
              <span>{stats?.pool.idleConnections ?? 0} idle</span>
              <span aria-hidden="true">·</span>
              <span>{stats?.pool.waitingRequests ?? 0} waiting</span>
            </div>
          </div>

          {/* 3. Query Latency */}
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>Roundtrip Latency</span>
              <Clock className="w-4 h-4 text-sky-700" />
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
              {stats?.latency.currentMs !== null &&
              stats?.latency.currentMs !== undefined
                ? `${stats.latency.currentMs.toFixed(1)} ms`
                : 'N/A'}
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
              <span>Avg {stats?.latency.avgMs.toFixed(1) ?? '0.0'} ms</span>
              <span aria-hidden="true">·</span>
              <span>P95 {stats?.latency.p95Ms.toFixed(1) ?? '0.0'} ms</span>
            </div>
          </div>

          {/* 4. Recent Error Rate */}
          <div className="bg-white p-5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500">
              <span>
                Recent Error Rate ({stats?.errors.recentWindowMinutes ?? 15}m)
              </span>
              <AlertTriangle
                className={`w-4 h-4 ${
                  (stats?.errors.recentErrorRatePercent ?? 0) > 0
                    ? 'text-rose-600'
                    : 'text-slate-400'
                }`}
              />
            </div>
            <div
              className={`mt-2 text-2xl font-bold font-mono tabular-nums ${
                (stats?.errors.recentErrorRatePercent ?? 0) >= 5
                  ? 'text-rose-700'
                  : (stats?.errors.recentErrorRatePercent ?? 0) > 0
                  ? 'text-amber-700'
                  : 'text-slate-900'
              }`}
            >
              {(stats?.errors.recentErrorRatePercent ?? 0).toFixed(2)}%
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
              <span>
                {stats?.errors.recentFailedRequests ?? 0} /{' '}
                {stats?.errors.recentTotalRequests ?? 0} failed
              </span>
              <span aria-hidden="true">·</span>
              <span>{stats?.errors.idlePoolErrors ?? 0} pool errors</span>
            </div>
          </div>
        </div>
      )}

      {/* Latency Trend + Pool Allocation Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Query &amp; Probe Latency Timeline
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Measured roundtrip execution times across the recent sample window
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 font-mono tabular-nums">
              <span>Min {stats?.latency.minMs.toFixed(1) ?? '0.0'} ms</span>
              <span aria-hidden="true">·</span>
              <span>Max {stats?.latency.maxMs.toFixed(1) ?? '0.0'} ms</span>
            </div>
          </div>

          <div className="h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="dbLatencyFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#047857" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#047857" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                  />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    unit=" ms"
                    width={56}
                  />
                  <Tooltip
                    formatter={(value) => [`${value ?? 0} ms`, 'Latency']}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="latencyMs"
                    stroke="#047857"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#dbLatencyFill)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Waiting for first latency sample...
              </div>
            )}
          </div>
        </div>

        {/* Pool Allocation & Session Breakdown */}
        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Pool &amp; Backend Diagnostics
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live Node pg-pool slots and PostgreSQL server session counts
            </p>

            <dl className="mt-4 divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <dt className="text-slate-600">Total Pool Clients</dt>
                <dd className="font-mono tabular-nums font-semibold text-slate-900">
                  {stats?.pool.totalConnections ?? 0} /{' '}
                  {stats?.pool.maxConnections ?? 10}
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <dt className="text-slate-600">Active / Busy</dt>
                <dd className="font-mono tabular-nums font-semibold text-slate-900">
                  {stats?.pool.activeConnections ?? 0}
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <dt className="text-slate-600">Idle Available</dt>
                <dd className="font-mono tabular-nums font-semibold text-slate-900">
                  {stats?.pool.idleConnections ?? 0}
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <dt className="text-slate-600">Waiting Queue</dt>
                <dd className="font-mono tabular-nums font-semibold text-slate-900">
                  {stats?.pool.waitingRequests ?? 0}
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <dt className="text-slate-600">Lifetime Queries</dt>
                <dd className="font-mono tabular-nums font-semibold text-slate-900">
                  {stats?.errors.lifetimeTotalRequests ?? 0}
                </dd>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <dt className="text-slate-600">Lifetime Failures</dt>
                <dd className="font-mono tabular-nums font-semibold text-slate-900">
                  {stats?.errors.lifetimeFailedRequests ?? 0}
                </dd>
              </div>
              {stats?.pool.pgStatActivity && (
                <>
                  <div className="py-2.5 flex items-center justify-between">
                    <dt className="text-slate-600">DB Server Active Sessions</dt>
                    <dd className="font-mono tabular-nums font-semibold text-slate-900">
                      {stats.pool.pgStatActivity.activeSessions}
                    </dd>
                  </div>
                  <div className="py-2.5 flex items-center justify-between">
                    <dt className="text-slate-600">DB Server Total Sessions</dt>
                    <dd className="font-mono tabular-nums font-semibold text-slate-900">
                      {stats.pool.pgStatActivity.totalSessions}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Recent Probe & Pool Error Log */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Recent Pool Activity &amp; Error Log
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Inspect recent pool probes, query latency samples, and connection errors
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setEventFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition whitespace-nowrap shrink-0 cursor-pointer ${
                eventFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Events
            </button>
            <button
              type="button"
              onClick={() => setEventFilter('errors')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition whitespace-nowrap shrink-0 cursor-pointer ${
                eventFilter === 'errors'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Errors Only ({stats?.errors.recentEvents.length ?? 0})
            </button>
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="py-10 px-6 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-800">
              {eventFilter === 'errors'
                ? 'No pool or query errors recorded'
                : 'No pool activity recorded yet'}
            </p>
            <p className="text-xs text-slate-500">
              {eventFilter === 'errors'
                ? 'The PostgreSQL connection pool is operating without recent failures.'
                : 'Run a probe to verify active connectivity and record baseline latency.'}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => void loadHealth(true)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer"
              >
                Run Probe Now
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-4 font-semibold">Source</th>
                  <th className="py-2.5 px-4 font-semibold">Outcome</th>
                  <th className="py-2.5 px-4 font-semibold">Details</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredEvents.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                      {formatClockTime(row.timestamp)}
                    </td>
                    <td className="py-2.5 px-4 capitalize font-medium text-slate-800 whitespace-nowrap">
                      {row.kind}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {row.ok ? (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>OK</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-rose-700">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Error</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 max-w-md truncate">
                      {row.detail}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-800 whitespace-nowrap">
                      {row.latencyMs !== null ? `${row.latencyMs.toFixed(1)} ms` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
