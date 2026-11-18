import type { Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getOrCreateUser } from '../db/users.ts';
import { createTenantDb, type TenantRequest } from '../lib/db.ts';

export type AuthRequest = TenantRequest;

const PLATFORM_OWNER_EMAILS = ['owner@elimucore.co.ke', 'wansakuisaac@gmail.com'];

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;

    const email = (decodedToken.email || '').toLowerCase();
    req.isPlatformOwner = PLATFORM_OWNER_EMAILS.includes(email);

    // Ensure user exists in PostgreSQL
    const userRecord = await getOrCreateUser(
      decodedToken.uid,
      decodedToken.email || '',
      typeof decodedToken.name === 'string' ? decodedToken.name : undefined
    );

    // Resolve tenant schoolId onto req.schoolId for downstream tenant-filtered queries
    const headerSchoolId = req.headers['x-school-id'];
    const paramSchoolId = req.params?.schoolId;
    const bodySchoolId =
      typeof req.body?.school?.id === 'string'
        ? req.body.school.id
        : typeof req.body?.schoolId === 'string'
        ? req.body.schoolId
        : undefined;

    const resolvedSchoolId =
      (Array.isArray(paramSchoolId) ? paramSchoolId[0] : paramSchoolId) ||
      (Array.isArray(headerSchoolId) ? headerSchoolId[0] : headerSchoolId) ||
      bodySchoolId ||
      userRecord?.schoolId ||
      undefined;

    if (resolvedSchoolId) {
      req.schoolId = resolvedSchoolId.startsWith(`${decodedToken.uid}:`)
        ? resolvedSchoolId
        : `${decodedToken.uid}:${resolvedSchoolId}`;
    }

    // Bind tenant-isolated database wrapper onto req.db
    req.db = createTenantDb(req);

    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
