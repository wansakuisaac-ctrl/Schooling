import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { and, eq, gt, sql } from 'drizzle-orm';
import { db } from './index.ts';
import { users } from './schema.ts';
import { adminAuth } from '../lib/firebase-admin.ts';

const BCRYPT_SALT_ROUNDS = 10;

interface BaselineUserSeed {
  uid: string;
  appUserId: string;
  email: string;
  fullName: string;
  phone: string;
  role: string;
  schoolId: string;
  defaultPassword: string;
}

const BASELINE_USERS: BaselineUserSeed[] = [
  {
    uid: 'seed:usr-kilimani-academy-admin',
    appUserId: 'usr-kilimani-academy-admin',
    email: 'admin@kilimani.ac.ke',
    fullName: 'Madam Grace Ochieng (Principal)',
    phone: '+254 711 223 344',
    role: 'SCHOOL_ADMIN',
    schoolId: 'school-1',
    defaultPassword: 'admin123',
  },
  {
    uid: 'seed:usr-kilimani-academy-teacher-1',
    appUserId: 'usr-kilimani-academy-teacher-1',
    email: 'mwangi@kilimani.ac.ke',
    fullName: 'Tr. Daniel Mwangi (B.Ed Science)',
    phone: '+254 722 556 677',
    role: 'TEACHER',
    schoolId: 'school-1',
    defaultPassword: 'teacher123',
  },
  {
    uid: 'seed:usr-kilimani-academy-teacher-2',
    appUserId: 'usr-kilimani-academy-teacher-2',
    email: 'amina@kilimani.ac.ke',
    fullName: 'Tr. Amina Cherono (Early Years Lead)',
    phone: '+254 733 445 566',
    role: 'TEACHER',
    schoolId: 'school-1',
    defaultPassword: 'teacher123',
  },
  {
    uid: 'seed:usr-kilimani-academy-parent-1',
    appUserId: 'usr-kilimani-academy-parent-1',
    email: 'otieno@gmail.com',
    fullName: 'Eng. David Otieno',
    phone: '+254 720 123 456',
    role: 'PARENT',
    schoolId: 'school-1',
    defaultPassword: 'parent123',
  },
  {
    uid: 'seed:usr-kilimani-academy-student-1',
    appUserId: 'usr-kilimani-academy-student-1',
    email: 'brian.otieno@student.ke',
    fullName: 'Brian Otieno (Grade 9)',
    phone: '+254 720 123 456',
    role: 'STUDENT',
    schoolId: 'school-1',
    defaultPassword: 'student123',
  },
  {
    uid: 'seed:usr-mombasa-heritage-admin',
    appUserId: 'usr-mombasa-heritage-admin',
    email: 'admin@mombasaheritage.ac.ke',
    fullName: 'Mr. Omar Salim (Director)',
    phone: '+254 711 223 344',
    role: 'SCHOOL_ADMIN',
    schoolId: 'school-2',
    defaultPassword: 'admin123',
  },
  {
    uid: 'seed:usr-platform-owner',
    appUserId: 'usr-platform-owner',
    email: 'owner@elimucore.co.ke',
    fullName: 'Dr. Wanjiru Kariuki (Platform Director)',
    phone: '+254 700 000 000',
    role: 'PLATFORM_OWNER',
    schoolId: 'platform-master',
    defaultPassword: 'owner123',
  },
];

let baselineSeeded = false;

export function hashResetToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

export async function hashPassword(plainPassword: string): Promise<string> {
  return await bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(
  plainPassword: string,
  storedHash: string
): Promise<boolean> {
  if (!storedHash) return false;
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    return await bcrypt.compare(plainPassword, storedHash);
  }
  return plainPassword === storedHash;
}

export function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  if (local.length <= 2) return `${local[0] || '*'}*@${domain}`;
  return `${local[0]}${'*'.repeat(Math.min(local.length - 2, 6))}${local[local.length - 1]}@${domain}`;
}

export async function ensureBaselineUsersInDb(): Promise<void> {
  if (baselineSeeded) return;
  try {
    const existingRows = await db
      .select({ email: users.email, uid: users.uid })
      .from(users);

    const existingEmails = new Set(
      existingRows.map((r) => r.email.trim().toLowerCase())
    );
    const existingUids = new Set(existingRows.map((r) => r.uid));

    for (const seed of BASELINE_USERS) {
      const normalizedEmail = seed.email.trim().toLowerCase();
      if (existingEmails.has(normalizedEmail) || existingUids.has(seed.uid)) {
        continue;
      }
      const passwordHash = await hashPassword(seed.defaultPassword);
      await db
        .insert(users)
        .values({
          uid: seed.uid,
          appUserId: seed.appUserId,
          email: normalizedEmail,
          passwordHash,
          fullName: seed.fullName,
          phone: seed.phone,
          role: seed.role,
          schoolId: seed.schoolId,
          isActive: true,
        })
        .onConflictDoNothing({ target: users.uid });
    }

    baselineSeeded = true;
  } catch (error) {
    console.error('Non-fatal baseline user sync error:', error);
  }
}

export async function getOrCreateUser(uid: string, email: string, fullName?: string) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    const result = await db
      .insert(users)
      .values({
        uid,
        email: normalizedEmail,
        fullName: fullName || null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: normalizedEmail,
          ...(fullName ? { fullName } : {}),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user account. Please try again later.', {
      cause: error,
    });
  }
}

export async function syncRegisteredUserToDb(input: {
  appUserId: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  schoolId: string;
  password?: string;
}) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const uid = `local:${input.appUserId}`;
  const passwordHash = input.password ? await hashPassword(input.password) : null;

  const existing = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${normalizedEmail}`)
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(users)
      .set({
        appUserId: input.appUserId,
        fullName: input.fullName.trim(),
        phone: input.phone?.trim() || existing[0].phone,
        role: input.role,
        schoolId: input.schoolId,
        ...(passwordHash ? { passwordHash } : {}),
      })
      .where(eq(users.id, existing[0].id))
      .returning();
    return updated;
  }

  const [inserted] = await db
    .insert(users)
    .values({
      uid,
      appUserId: input.appUserId,
      email: normalizedEmail,
      passwordHash,
      fullName: input.fullName.trim(),
      phone: input.phone?.trim() || null,
      role: input.role,
      schoolId: input.schoolId,
      isActive: true,
    })
    .returning();

  return inserted;
}

export async function createPasswordResetToken(
  email: string,
  ttlMinutes = 60
): Promise<{
  user: typeof users.$inferSelect;
  rawToken: string;
  expiresAt: Date;
} | null> {
  await ensureBaselineUsersInDb();

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        sql`lower(${users.email}) = ${normalizedEmail}`,
        eq(users.isActive, true)
      )
    )
    .limit(1);

  if (!user) {
    return null;
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  const [updated] = await db
    .update(users)
    .set({
      resetToken: tokenHash,
      resetTokenExpiresAt: expiresAt,
    })
    .where(eq(users.id, user.id))
    .returning();

  return {
    user: updated,
    rawToken,
    expiresAt,
  };
}

export async function verifyPasswordResetToken(rawToken: string): Promise<
  | {
      valid: true;
      email: string;
      maskedEmail: string;
      fullName: string | null;
      expiresAt: Date;
    }
  | {
      valid: false;
      error: string;
    }
> {
  const cleanToken = rawToken.trim();
  if (!cleanToken || cleanToken.length < 16) {
    return {
      valid: false,
      error: 'Invalid password reset token format.',
    };
  }

  const tokenHash = hashResetToken(cleanToken);
  const now = new Date();

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      resetTokenExpiresAt: users.resetTokenExpiresAt,
    })
    .from(users)
    .where(
      and(
        eq(users.resetToken, tokenHash),
        gt(users.resetTokenExpiresAt, now),
        eq(users.isActive, true)
      )
    )
    .limit(1);

  if (!user || !user.resetTokenExpiresAt) {
    return {
      valid: false,
      error: 'This password reset token is invalid or has expired. Please request a new reset email.',
    };
  }

  return {
    valid: true,
    email: user.email,
    maskedEmail: maskEmail(user.email),
    fullName: user.fullName,
    expiresAt: user.resetTokenExpiresAt,
  };
}

export async function consumePasswordResetTokenAndUpdatePassword(
  rawToken: string,
  newPassword: string
): Promise<{
  email: string;
  fullName: string | null;
  schoolId: string | null;
  role: string;
}> {
  const cleanToken = rawToken.trim();
  if (!cleanToken || cleanToken.length < 16) {
    throw new Error('Invalid password reset token.');
  }
  if (!newPassword || newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters long.');
  }

  const tokenHash = hashResetToken(cleanToken);
  const newPasswordHash = await hashPassword(newPassword);

  const updatedUser = await db.transaction(async (tx) => {
    const now = new Date();
    const [matched] = await tx
      .select()
      .from(users)
      .where(
        and(
          eq(users.resetToken, tokenHash),
          gt(users.resetTokenExpiresAt, now),
          eq(users.isActive, true)
        )
      )
      .limit(1);

    if (!matched) {
      throw new Error(
        'This password reset token is invalid or has expired. Please request a new reset link.'
      );
    }

    const [updated] = await tx
      .update(users)
      .set({
        passwordHash: newPasswordHash,
        resetToken: null,
        resetTokenExpiresAt: null,
      })
      .where(eq(users.id, matched.id))
      .returning();

    return updated;
  });

  // If the account also exists in Firebase Auth (non-seed/local UID), sync password best-effort
  if (
    updatedUser.uid &&
    !updatedUser.uid.startsWith('seed:') &&
    !updatedUser.uid.startsWith('local:')
  ) {
    try {
      await adminAuth.updateUser(updatedUser.uid, {
        password: newPassword,
      });
    } catch {
      // Non-fatal if Firebase Auth account isn't present or uses federated OAuth only
    }
  }

  return {
    email: updatedUser.email,
    fullName: updatedUser.fullName,
    schoolId: updatedUser.schoolId,
    role: updatedUser.role,
  };
}

export async function authenticateUserWithSql(
  email: string,
  password: string
): Promise<
  | {
      found: true;
      authenticated: boolean;
      user: {
        id: number;
        appUserId: string | null;
        email: string;
        fullName: string | null;
        role: string;
        schoolId: string | null;
      };
    }
  | { found: false; authenticated: false }
> {
  await ensureBaselineUsersInDb();

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return { found: false, authenticated: false };
  }

  const [user] = await db
    .select()
    .from(users)
    .where(
      and(
        sql`lower(${users.email}) = ${normalizedEmail}`,
        eq(users.isActive, true)
      )
    )
    .limit(1);

  if (!user || !user.passwordHash) {
    return { found: false, authenticated: false };
  }

  const isMatch = await verifyPassword(password, user.passwordHash);
  return {
    found: true,
    authenticated: isMatch,
    user: {
      id: user.id,
      appUserId: user.appUserId,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      schoolId: user.schoolId,
    },
  };
}
