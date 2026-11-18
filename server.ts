import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  authenticateUserWithSql,
  consumePasswordResetTokenAndUpdatePassword,
  createPasswordResetToken,
  ensureBaselineUsersInDb,
  getOrCreateUser,
  syncRegisteredUserToDb,
  verifyPasswordResetToken,
} from './src/db/users.ts';
import {
  executeQuery,
  getDatabaseHealthStats,
  tenantDbMiddleware,
} from './src/lib/db.ts';
import { adminAuth } from './src/lib/firebase-admin.ts';
import { getAuditLogsForSchool, logAuditSafe } from './src/lib/audit.ts';
import { sendPasswordResetEmail } from './src/lib/mailer.ts';
import { students } from './src/db/schema.ts';
import {
  clearSchoolOperationalDataInSql,
  loadUserWorkspacesFromSql,
  syncSchoolWorkspaceToSql,
  type WorkspaceSyncPayload,
} from './src/db/schoolData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '15mb' }));

  // Authenticated User Profile (PostgreSQL)
  app.get('/api/auth/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || '';
      const fullName =
        typeof req.user!.name === 'string' ? req.user!.name : undefined;
      const userRecord = await getOrCreateUser(uid, email, fullName);
      res.json({ user: userRecord });
    } catch (error: unknown) {
      console.error('Error in GET /api/auth/me:', error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to retrieve user profile',
      });
    }
  });

  // Sync newly registered user credentials into PostgreSQL users table
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { appUserId, email, fullName, phone, role, schoolId, password } =
        req.body || {};
      if (!email || typeof email !== 'string' || !fullName || typeof fullName !== 'string') {
        return res.status(400).json({ error: 'Email and full name are required.' });
      }
      const userRecord = await syncRegisteredUserToDb({
        appUserId: typeof appUserId === 'string' && appUserId ? appUserId : `usr-${Date.now()}`,
        email,
        fullName,
        phone: typeof phone === 'string' ? phone : undefined,
        role: typeof role === 'string' && role ? role : 'SCHOOL_ADMIN',
        schoolId: typeof schoolId === 'string' && schoolId ? schoolId : 'school-1',
        password: typeof password === 'string' ? password : undefined,
      });
      res.status(201).json({
        success: true,
        user: {
          id: userRecord.id,
          email: userRecord.email,
          fullName: userRecord.fullName,
          role: userRecord.role,
          schoolId: userRecord.schoolId,
        },
      });
    } catch (error: unknown) {
      console.error('Error in POST /api/auth/register:', error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to register user in PostgreSQL',
      });
    }
  });

  // Verify credentials against PostgreSQL users.password_hash
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
        return res.status(400).json({ error: 'Email and password are required.' });
      }
      const result = await authenticateUserWithSql(email, password);
      if (!result.found) {
        return res.status(404).json({ found: false, authenticated: false });
      }
      if (!result.authenticated) {
        return res.status(401).json({
          found: true,
          authenticated: false,
          error: 'Incorrect password. Please try again or use Forgot Password.',
        });
      }
      res.json({
        found: true,
        authenticated: true,
        user: result.user,
      });
    } catch (error: unknown) {
      console.error('Error in POST /api/auth/login:', error);
      res.status(500).json({
        error:
          error instanceof Error ? error.message : 'Authentication check failed',
      });
    }
  });

  // Request a time-limited Forgot Password email via Nodemailer
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body || {};
      const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({
          error: 'Please enter a valid institutional email address.',
        });
      }

      const tokenResult = await createPasswordResetToken(cleanEmail, 60);
      let previewUrl: string | null = null;
      let transportMode: string | undefined;

      if (tokenResult) {
        const envAppUrl = process.env.APP_URL?.trim();
        const forwardedProto = req.headers['x-forwarded-proto'];
        const proto =
          typeof forwardedProto === 'string' && forwardedProto
            ? forwardedProto.split(',')[0].trim()
            : req.protocol || 'http';
        const host =
          (typeof req.headers['x-forwarded-host'] === 'string' &&
            req.headers['x-forwarded-host'].split(',')[0].trim()) ||
          req.get('host') ||
          `localhost:${PORT}`;

        const baseUrl =
          envAppUrl && envAppUrl !== 'MY_APP_URL'
            ? envAppUrl.replace(/\/+$/, '')
            : `${proto}://${host}`;

        const resetUrl = `${baseUrl}/?resetToken=${encodeURIComponent(tokenResult.rawToken)}`;

        const mailResult = await sendPasswordResetEmail({
          to: tokenResult.user.email,
          fullName: tokenResult.user.fullName,
          resetUrl,
          resetToken: tokenResult.rawToken,
          expiresMinutes: 60,
        });

        previewUrl = mailResult.previewUrl;
        transportMode = mailResult.transportMode;

        if (tokenResult.user.schoolId && tokenResult.user.schoolId !== 'platform-master') {
          await logAuditSafe(
            Object.assign(req, {
              schoolId: tokenResult.user.schoolId,
              user: { uid: tokenResult.user.uid } as AuthRequest['user'],
            }),
            {
              action: 'PASSWORD_RESET_REQUESTED',
              entity: 'User',
              entityId: tokenResult.user.appUserId || String(tokenResult.user.id),
              userId: tokenResult.user.appUserId || tokenResult.user.uid,
            }
          );
        }
      }

      res.json({
        success: true,
        message:
          'If an account matches that email address, a password reset email with a 60-minute recovery link has been sent.',
        ...(previewUrl ? { previewUrl } : {}),
        ...(transportMode && process.env.NODE_ENV !== 'production'
          ? { transportMode }
          : {}),
      });
    } catch (error: unknown) {
      console.error('Error in POST /api/auth/forgot-password:', error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Unable to send password reset email at this time.',
      });
    }
  });

  // Validate password reset token before showing new password form
  app.get('/api/auth/reset-password/verify', async (req, res) => {
    try {
      const rawToken = typeof req.query.token === 'string' ? req.query.token : '';
      const result = await verifyPasswordResetToken(rawToken);
      if (!result.valid) {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (error: unknown) {
      console.error('Error in GET /api/auth/reset-password/verify:', error);
      res.status(500).json({
        valid: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to validate password reset token.',
      });
    }
  });

  // Consume single-use token and update PostgreSQL user password_hash
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, newPassword } = req.body || {};
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Password reset token is required.' });
      }
      if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        return res.status(400).json({
          error: 'New password must be at least 6 characters long.',
        });
      }

      const updated = await consumePasswordResetTokenAndUpdatePassword(
        token,
        newPassword
      );

      if (updated.schoolId && updated.schoolId !== 'platform-master') {
        await logAuditSafe(
          Object.assign(req, {
            schoolId: updated.schoolId,
          }),
          {
            action: 'PASSWORD_RESET_COMPLETED',
            entity: 'User',
            entityId: updated.email,
            userId: updated.email,
          }
        );
      }

      res.json({
        success: true,
        email: updated.email,
        message: 'Your password has been securely updated. You can now sign in.',
      });
    } catch (error: unknown) {
      console.error('Error in POST /api/auth/reset-password:', error);
      res.status(400).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to reset password.',
      });
    }
  });

  // Load user's school workspaces from PostgreSQL
  app.get('/api/sql/workspace', requireAuth, async (req: AuthRequest, res) => {
    try {
      const workspaces = await loadUserWorkspacesFromSql(req.user!.uid);
      res.json({ workspaces });
    } catch (error: unknown) {
      console.error('Error in GET /api/sql/workspace:', error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to load workspace data',
      });
    }
  });

  // Sync a school workspace to PostgreSQL
  app.post('/api/sql/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const payload = req.body as WorkspaceSyncPayload;
      if (!payload || !payload.school || !payload.school.id) {
        return res.status(400).json({ error: 'Invalid workspace payload' });
      }
      const result = await syncSchoolWorkspaceToSql(req.user!.uid, payload);
      await logAuditSafe(req, {
        action: 'WORKSPACE_SYNCED',
        entity: 'SchoolWorkspace',
        entityId: payload.school.id,
      });
      res.json(result);
    } catch (error: unknown) {
      console.error('Error in POST /api/sql/sync:', error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to save workspace data',
      });
    }
  });

  // Clear operational data for a school in PostgreSQL
  app.delete(
    '/api/sql/operational/:schoolId',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        const schoolIdParam = req.params.schoolId;
        const schoolId = Array.isArray(schoolIdParam)
          ? schoolIdParam[0]
          : schoolIdParam;
        if (!schoolId) {
          return res.status(400).json({ error: 'Missing schoolId' });
        }
        const result = await clearSchoolOperationalDataInSql(
          req.user!.uid,
          schoolId
        );
        await logAuditSafe(req, {
          action: 'OPERATIONAL_DATA_CLEARED',
          entity: 'SchoolWorkspace',
          entityId: schoolId,
        });
        res.json(result);
      } catch (error: unknown) {
        console.error('Error in DELETE /api/sql/operational:', error);
        res.status(500).json({
          error:
            error instanceof Error
              ? error.message
              : 'Failed to clear school data',
        });
      }
    }
  );

  // Query students for a school from PostgreSQL (automatically filtered by req.schoolId)
  app.get(
    '/api/sql/schools/:schoolId/students',
    requireAuth,
    tenantDbMiddleware,
    async (req: AuthRequest, res) => {
      try {
        const list = await req.db!.withDb(async ({ db: tenantDb, scopeWhere }) => {
          return await tenantDb
            .select()
            .from(students)
            .where(scopeWhere(students.schoolId));
        });
        const prefix = `${req.user!.uid}:`;
        const unscope = (val: string) =>
          val.startsWith(prefix) ? val.slice(prefix.length) : val;
        await logAuditSafe(req, {
          action: 'STUDENTS_VIEWED',
          entity: 'Student',
          entityId: req.params.schoolId as string,
        });
        res.json({
          students: list.map((st) => ({
            ...st,
            id: unscope(st.id),
            schoolId: unscope(st.schoolId),
          })),
        });
      } catch (error: unknown) {
        console.error('Error in GET /api/sql/schools/:schoolId/students:', error);
        res.status(500).json({
          error:
            error instanceof Error
              ? error.message
              : 'Failed to fetch students',
        });
      }
    }
  );

  // Retrieve tenant audit logs filtered automatically by req.schoolId
  app.get(
    '/api/sql/audit-logs',
    requireAuth,
    tenantDbMiddleware,
    async (req: AuthRequest, res) => {
      try {
        const limitParam = Number(req.query.limit);
        const logs = await getAuditLogsForSchool(
          req,
          Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 100
        );
        res.json({ auditLogs: logs });
      } catch (error: unknown) {
        console.error('Error in GET /api/sql/audit-logs:', error);
        res.status(500).json({
          error:
            error instanceof Error
              ? error.message
              : 'Failed to fetch audit logs',
        });
      }
    }
  );

  // Record a tenant-scoped sensitive audit log event in PostgreSQL audit_logs
  app.post(
    '/api/sql/audit-logs',
    requireAuth,
    tenantDbMiddleware,
    async (req: AuthRequest, res) => {
      try {
        const { action, entity, entityId, userId } = req.body || {};
        if (
          !action ||
          typeof action !== 'string' ||
          !entity ||
          typeof entity !== 'string'
        ) {
          return res
            .status(400)
            .json({ error: 'action and entity are required fields.' });
        }

        await logAuditSafe(req, {
          action: action.trim(),
          entity: entity.trim(),
          entityId:
            typeof entityId === 'string' && entityId.trim()
              ? entityId.trim()
              : undefined,
          userId:
            typeof userId === 'string' && userId.trim()
              ? userId.trim()
              : undefined,
        });

        res.status(201).json({ success: true });
      } catch (error: unknown) {
        console.error('Error in POST /api/sql/audit-logs:', error);
        res.status(500).json({
          error:
            error instanceof Error
              ? error.message
              : 'Failed to record audit log',
        });
      }
    }
  );

  // Platform-level query (explicitly opts out of req.schoolId filter for platform owner)
  app.get(
    '/api/sql/platform/schools',
    requireAuth,
    async (req: AuthRequest, res) => {
      try {
        if (!req.isPlatformOwner) {
          return res.status(403).json({ error: 'Forbidden: Platform owner access required' });
        }
        const result = await executeQuery(
          req,
          'SELECT id, slug, name, plan, status, current_term, academic_year, created_at FROM schools ORDER BY created_at DESC',
          [],
          { platformLevel: true }
        );
        res.json({ schools: result.rows });
      } catch (error: unknown) {
        console.error('Error in GET /api/sql/platform/schools:', error);
        res.status(500).json({
          error:
            error instanceof Error
              ? error.message
              : 'Failed to fetch platform schools',
        });
      }
    }
  );

  // Real-time PostgreSQL pool health telemetry for admin dashboard
  app.get('/api/admin/db-health', async (req: AuthRequest, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        if (!authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Unauthorized: Invalid authorization header' });
        }
        const token = authHeader.split('Bearer ')[1];
        try {
          await adminAuth.verifyIdToken(token);
        } catch {
          return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }
      }

      const health = await getDatabaseHealthStats();
      res.setHeader('Cache-Control', 'no-store');
      res.json(health);
    } catch (error: unknown) {
      console.error('Error in GET /api/admin/db-health:', error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to collect PostgreSQL health statistics',
      });
    }
  });

  // Vite dev middleware vs production static serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    void ensureBaselineUsersInDb();
  });
}

startServer();
