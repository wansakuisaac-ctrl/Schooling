import crypto from 'crypto';
import { desc } from 'drizzle-orm';
import type { NextFunction, Response } from 'express';
import { auditLogs } from '../db/schema.ts';
import { type TenantRequest, withTenantDb } from './db.ts';

export interface AuditActionInput {
  action: string;
  entity: string;
  entityId?: string;
  userId?: string;
  ipAddress?: string;
}

export function extractClientIp(req: TenantRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0 && forwarded[0]) {
    return forwarded[0].split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '0.0.0.0';
}

/**
 * Persists a user action to the `audit_logs` table, automatically tagging the
 * record with `req.schoolId` for strict multi-tenant accountability.
 */
export async function logAuditAction(
  req: TenantRequest,
  input: AuditActionInput
) {
  if (!req.schoolId || !req.schoolId.trim()) {
    throw new Error(
      'Forbidden: req.schoolId is required to log a tenant audit event.'
    );
  }

  const userId = (input.userId || req.user?.uid || 'anonymous').trim();
  const entityId = (input.entityId || req.schoolId).trim();
  const ipAddress = (input.ipAddress || extractClientIp(req)).trim();

  return await withTenantDb(req, async ({ db: tenantDb, schoolId }) => {
    const [inserted] = await tenantDb
      .insert(auditLogs)
      .values({
        id: crypto.randomUUID(),
        schoolId: schoolId!,
        userId,
        action: input.action.trim(),
        entity: input.entity.trim(),
        entityId,
        ipAddress,
      })
      .returning();

    return inserted;
  });
}

/**
 * Non-blocking audit logging helper that records errors to stderr without
 * interrupting the primary HTTP response if e.g. the school row is not yet created.
 */
export async function logAuditSafe(
  req: TenantRequest,
  input: AuditActionInput
): Promise<void> {
  if (!req.schoolId || !req.schoolId.trim()) {
    return;
  }

  try {
    await logAuditAction(req, input);
  } catch (error) {
    console.error('Non-fatal audit log write failed:', error);
  }
}

/**
 * Retrieves recent `audit_logs` entries scoped strictly to `req.schoolId`.
 */
export async function getAuditLogsForSchool(
  req: TenantRequest,
  limit = 100
) {
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 500);

  return await withTenantDb(req, async ({ db: tenantDb, scopeWhere }) => {
    return await tenantDb
      .select()
      .from(auditLogs)
      .where(scopeWhere(auditLogs.schoolId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(safeLimit);
  });
}

export interface AuditMiddlewareOptions {
  /** Also log GET/HEAD read requests in addition to mutations (default: false) */
  includeReads?: boolean;
}

/**
 * Express middleware that automatically records authenticated tenant actions to
 * `audit_logs` tagged with `req.schoolId` once the response finishes cleanly.
 */
export function auditActionMiddleware(
  options: AuditMiddlewareOptions = {}
) {
  const { includeReads = false } = options;

  return (req: TenantRequest, res: Response, next: NextFunction): void => {
    const method = req.method.toUpperCase();
    const isMutation =
      method === 'POST' ||
      method === 'PUT' ||
      method === 'PATCH' ||
      method === 'DELETE';

    if (!isMutation && !includeReads) {
      next();
      return;
    }

    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      if (!req.schoolId || !req.schoolId.trim()) return;

      const rawPath = req.baseUrl ? `${req.baseUrl}${req.path}` : req.path;
      const entityId =
        (typeof req.params?.id === 'string' && req.params.id) ||
        (typeof req.params?.schoolId === 'string' && req.params.schoolId) ||
        (typeof req.body?.school?.id === 'string' && req.body.school.id) ||
        req.schoolId;

      void logAuditSafe(req, {
        action: `${method} ${rawPath}`,
        entity: rawPath.split('/').filter(Boolean).slice(-1)[0] || 'endpoint',
        entityId,
      });
    });

    next();
  };
}
