import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { User, School, Role } from '../types';
import { dbService } from '../services/storage';
import {
  auth,
  getMemoryIdToken,
  signInWithGooglePopup,
  signOutFirebase,
} from '../services/firebase';
import { SqlSyncService } from '../services/sqlSync';
import { SyncService } from '../services/syncService';

interface AuthContextType {
  currentUser: User | null;
  currentSchool: School | null;
  currentRole: Role;
  activeSchoolId: string;
  isImpersonating: boolean;
  impersonatedByActorId: string | null;
  firebaseUser: FirebaseUser | null;
  login: (email: string, password?: string, schoolSlug?: string) => Promise<boolean>;
  signInWithGoogle: (schoolSlug?: string) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: Role, customUser?: User, schoolId?: string) => void;
  impersonateSchool: (schoolId: string) => void;
  stopImpersonation: () => void;
  registerSchool: (data: {
    name: string;
    slug: string;
    email: string;
    phone: string;
    address: string;
    adminName: string;
    adminEmail: string;
    password: string;
  }) => Promise<{ school: School; adminUser: User }>;
  registerUser: (data: {
    role: Role;
    schoolId: string;
    fullName: string;
    email: string;
    phone: string;
    password: string;
    additionalIdentifier?: string;
  }) => Promise<{ user: User; school: School }>;
  completeProfileSetup: (data: {
    schoolName: string;
    academicYear: number;
    currentTerm?: string;
    gradeLevels: string[];
    defaultStream?: string;
  }) => Promise<void>;
  refreshState: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'elimucore_auth_state_v1';
const PLATFORM_OWNER_EMAILS = ['owner@elimucore.co.ke', 'wansakuisaac@gmail.com'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentSchool, setCurrentSchool] = useState<School | null>(null);
  const [currentRole, setCurrentRole] = useState<Role>('SCHOOL_ADMIN');
  const [isImpersonating, setIsImpersonating] = useState<boolean>(false);
  const [impersonatedByActorId, setImpersonatedByActorId] = useState<string | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  // Keep SqlSyncService & dbService actor attribution synced
  useEffect(() => {
    SqlSyncService.setActiveSchoolId(currentSchool?.id || null);
  }, [currentSchool?.id]);

  useEffect(() => {
    dbService.setCurrentActorId(currentUser?.id || null);
  }, [currentUser?.id]);

  useEffect(() => {
    const unsubscribeSave = dbService.subscribeSave(() => {
      if (currentSchool?.id) {
        void SyncService.cacheActiveSchool(currentSchool.id);
        SqlSyncService.scheduleSync(currentSchool.id);
      }
    });
    const unsubscribeAudit = dbService.subscribeAudit(async (entry) => {
      if (!entry.school_id || entry.school_id === 'platform-master') return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      try {
        const token = await getMemoryIdToken();
        if (!token) return;
        await fetch('/api/sql/audit-logs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'x-school-id': entry.school_id,
          },
          body: JSON.stringify({
            action: entry.action,
            entity: entry.entity,
            entityId: entry.entity_id,
            userId: entry.user_id,
          }),
        });
      } catch {
        // Offline or local-only session; retained in local tenant ledger & workspace sync
      }
    });
    return () => {
      unsubscribeSave();
      unsubscribeAudit();
    };
  }, [currentSchool?.id]);

  // Listen to Firebase Auth state and sync with Cloud SQL / IndexedDB offline cache
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const token = await fbUser.getIdToken();
          await SqlSyncService.verifyBackendAuth(token);
          await SqlSyncService.flushPendingQueue(token);
          const pulled = await SqlSyncService.pullWorkspacesFromSql(token);
          if (pulled) {
            setCurrentSchool((prev) =>
              prev ? dbService.getSchoolById(prev.id) || prev : prev
            );
            setCurrentUser((prev) =>
              prev ? dbService.getUserById(prev.id) || prev : prev
            );
          } else if (currentSchool?.id) {
            await SqlSyncService.pushSchoolToSql(currentSchool.id, token);
          }
        } catch (err) {
          console.error('Background auth sync error:', err);
        }
      }
    });
    return () => unsubscribe();
  }, [currentSchool?.id]);

  // Hydrate offline IndexedDB cache on boot & resync PostgreSQL when connection restores
  useEffect(() => {
    const stopListener = SyncService.start(() => {
      refreshState();
    });

    void SyncService.hydrateOfflineData().then((hydrated) => {
      if (hydrated) {
        refreshState();
      } else {
        const initialSchoolId = dbService.getSchools()[0]?.id;
        if (initialSchoolId) {
          void SyncService.cacheActiveSchool(initialSchoolId);
        }
      }
    });

    return () => stopListener();
  }, []);

  // Initialize on mount
  useEffect(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    if (saved === 'LOGGED_OUT') {
      setCurrentUser(null);
      setCurrentSchool(null);
      return;
    }

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const user = dbService.getUserById(parsed.userId);
        const school = dbService.getSchoolById(parsed.schoolId);

        if (user && school) {
          setCurrentUser(user);
          setCurrentSchool(school);
          setCurrentRole(parsed.role || user.role);
          setIsImpersonating(Boolean(parsed.isImpersonating));
          setImpersonatedByActorId(parsed.impersonatedByActorId || null);
          return;
        }
      } catch {
        // Fallback to default
      }
    }

    // Default: Log in as School Admin of Kilimani Junior Academy
    const defaultSchool = dbService.getSchools()[0];
    const defaultUsers = dbService.getUsers(defaultSchool.id);
    const defaultAdmin = defaultUsers.find((u) => u.role === 'SCHOOL_ADMIN') || defaultUsers[0];

    setCurrentSchool(defaultSchool);
    setCurrentUser(defaultAdmin);
    setCurrentRole('SCHOOL_ADMIN');
  }, []);

  const saveState = (
    user: User | null,
    school: School | null,
    role: Role,
    impersonating = false,
    actorId: string | null = null
  ) => {
    if (user && school) {
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          userId: user.id,
          schoolId: school.id,
          role,
          isImpersonating: impersonating,
          impersonatedByActorId: actorId,
        })
      );
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  };

  const signInWithGoogle = async (schoolSlug?: string): Promise<boolean> => {
    const { user: fbUser, idToken } = await signInWithGooglePopup();
    setFirebaseUser(fbUser);

    await SqlSyncService.verifyBackendAuth(idToken);
    await SqlSyncService.flushPendingQueue(idToken);
    await SqlSyncService.pullWorkspacesFromSql(idToken);

    const fbEmail = (fbUser.email || '').toLowerCase();
    const isOwner = PLATFORM_OWNER_EMAILS.includes(fbEmail);

    if (isOwner) {
      const platformUser: User = {
        id: 'usr-platform-owner',
        school_id: 'platform-master',
        email: fbUser.email || 'owner@elimucore.co.ke',
        role: 'PLATFORM_OWNER',
        full_name: fbUser.displayName || 'Dr. Wanjiru Kariuki (Platform Director)',
        phone: '+254 700 000 000',
        is_active: true,
        created_at: new Date().toISOString(),
      };
      const primarySchool = dbService.getSchools()[0];
      setCurrentUser(platformUser);
      setCurrentSchool(primarySchool);
      setCurrentRole('PLATFORM_OWNER');
      setIsImpersonating(false);
      setImpersonatedByActorId(null);
      saveState(platformUser, primarySchool, 'PLATFORM_OWNER');
      if (primarySchool) {
        await SqlSyncService.pushSchoolToSql(primarySchool.id, idToken);
      }
      return true;
    }

    // Standard school user (strictly isolated from Platform Owner dashboard)
    const targetSchool =
      (schoolSlug ? dbService.getSchoolBySlug(schoolSlug) : undefined) ||
      dbService.getSchools()[0];

    let appUser = dbService.getUserByEmail(fbEmail);
    if (!appUser && targetSchool) {
      const registered = dbService.registerUser({
        role: 'SCHOOL_ADMIN',
        schoolId: targetSchool.id,
        fullName: fbUser.displayName || fbEmail.split('@')[0] || 'School Administrator',
        email: fbEmail,
        phone: '+254 700 000 000',
        password: `google-oauth-${fbUser.uid}`,
      });
      appUser = registered.user;
    }

    const userSchool =
      (appUser ? dbService.getSchoolById(appUser.school_id) : undefined) || targetSchool;

    if (appUser && userSchool) {
      const safeRole: Role =
        appUser.role === 'PLATFORM_OWNER' ? 'SCHOOL_ADMIN' : appUser.role;
      setCurrentUser(appUser);
      setCurrentSchool(userSchool);
      setCurrentRole(safeRole);
      setIsImpersonating(false);
      setImpersonatedByActorId(null);
      saveState(appUser, userSchool, safeRole);
      await SqlSyncService.pushSchoolToSql(userSchool.id, idToken);
      return true;
    }

    return false;
  };

  const login = async (
    email: string,
    password?: string,
    schoolSlug?: string
  ): Promise<boolean> => {
    // 1. Check Platform Owner
    if (email.toLowerCase() === 'owner@elimucore.co.ke') {
      if (password && typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'owner@elimucore.co.ke', password }),
          });
          if (res.status === 401) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(
              errData.error || 'Incorrect password. Please try again or use Forgot Password.'
            );
          }
        } catch (err) {
          if (err instanceof Error && err.message.includes('Incorrect password')) {
            throw err;
          }
        }
      }
      const platformUser: User = {
        id: 'usr-platform-owner',
        school_id: 'platform-master',
        email: 'owner@elimucore.co.ke',
        role: 'PLATFORM_OWNER',
        full_name: 'Dr. Wanjiru Kariuki (Platform Director)',
        phone: '+254 700 000 000',
        is_active: true,
        created_at: '2025-01-01',
      };
      const primarySchool = dbService.getSchools()[0];
      setCurrentUser(platformUser);
      setCurrentSchool(primarySchool);
      setCurrentRole('PLATFORM_OWNER');
      setIsImpersonating(false);
      setImpersonatedByActorId(null);
      saveState(platformUser, primarySchool, 'PLATFORM_OWNER');
      return true;
    }

    // 2. Tenant User Lookup (supports email, phone, admission no, or TSC no)
    const user =
      dbService.findUserByIdentifier(email) || dbService.getUserByEmail(email);
    if (!user) {
      throw new Error(
        'No registered account found matching these credentials (Email, Phone, Admission No, or TSC No).'
      );
    }

    if (password && typeof navigator !== 'undefined' && navigator.onLine) {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, password }),
        });
        if (res.status === 401) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            errData.error || 'Incorrect password. Please try again or use Forgot Password.'
          );
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes('Incorrect password')) {
          throw err;
        }
      }
    }

    const school = dbService.getSchoolById(user.school_id);
    if (!school) {
      throw new Error('School workspace not found or suspended.');
    }

    if (schoolSlug && school.slug.toLowerCase() !== schoolSlug.toLowerCase().trim()) {
      throw new Error(
        `This user does not belong to school workspace "${schoolSlug}".`
      );
    }

    if (school.status === 'suspended') {
      throw new Error(
        'This school workspace has been suspended. Please contact platform support.'
      );
    }

    setCurrentUser(user);
    setCurrentSchool(school);
    setCurrentRole(user.role);
    setIsImpersonating(false);
    setImpersonatedByActorId(null);
    saveState(user, school, user.role);
    void SyncService.cacheActiveSchool(school.id);
    return true;
  };

  const logout = () => {
    setCurrentSchool(null);
    setCurrentUser(null);
    setCurrentRole('SCHOOL_ADMIN');
    setIsImpersonating(false);
    setImpersonatedByActorId(null);
    localStorage.setItem(AUTH_STORAGE_KEY, 'LOGGED_OUT');
    if (auth.currentUser) {
      void signOutFirebase();
    }
  };

  const switchRole = (role: Role, customUser?: User, schoolId?: string) => {
    const targetSchoolId =
      schoolId || currentSchool?.id || dbService.getSchools()[0].id;
    const targetSchool =
      dbService.getSchoolById(targetSchoolId) || dbService.getSchools()[0];

    if (role === 'PLATFORM_OWNER') {
      const platformUser: User = {
        id: 'usr-platform-owner',
        school_id: 'platform-master',
        email: 'owner@elimucore.co.ke',
        role: 'PLATFORM_OWNER',
        full_name: 'Dr. Wanjiru Kariuki (Platform Director)',
        phone: '+254 700 000 000',
        is_active: true,
        created_at: '2025-01-01',
      };
      setCurrentUser(platformUser);
      setCurrentSchool(targetSchool);
      setCurrentRole('PLATFORM_OWNER');
      setIsImpersonating(false);
      setImpersonatedByActorId(null);
      saveState(platformUser, targetSchool, 'PLATFORM_OWNER');
      return;
    }

    const schoolUsers = dbService.getUsers(targetSchool.id);
    const targetUser =
      customUser || schoolUsers.find((u) => u.role === role) || schoolUsers[0];

    setCurrentSchool(targetSchool);
    setCurrentUser(targetUser);
    setCurrentRole(role);
    setIsImpersonating(false);
    setImpersonatedByActorId(null);
    saveState(targetUser, targetSchool, role);
    void SyncService.cacheActiveSchool(targetSchool.id);
  };

  const impersonateSchool = (schoolId: string) => {
    const targetSchool = dbService.getSchoolById(schoolId);
    if (!targetSchool) return;

    const schoolUsers = dbService.getUsers(schoolId);
    const adminUser =
      schoolUsers.find((u) => u.role === 'SCHOOL_ADMIN') || schoolUsers[0];

    dbService.logPlatformAudit(
      'usr-platform-owner',
      schoolId,
      'IMPERSONATE_SESSION_START',
      'User'
    );

    setCurrentSchool(targetSchool);
    setCurrentUser(adminUser);
    setCurrentRole('SCHOOL_ADMIN');
    setIsImpersonating(true);
    setImpersonatedByActorId('usr-platform-owner');
    saveState(
      adminUser,
      targetSchool,
      'SCHOOL_ADMIN',
      true,
      'usr-platform-owner'
    );
  };

  const stopImpersonation = () => {
    if (impersonatedByActorId) {
      dbService.logPlatformAudit(
        impersonatedByActorId,
        currentSchool?.id || 'unknown',
        'IMPERSONATE_SESSION_END',
        'User'
      );
    }
    switchRole('PLATFORM_OWNER');
  };

  const registerSchool = async (data: {
    name: string;
    slug: string;
    email: string;
    phone: string;
    address: string;
    adminName: string;
    adminEmail: string;
    password: string;
  }) => {
    const { school, adminUser } = dbService.registerNewSchool(data);
    setCurrentSchool(school);
    setCurrentUser(adminUser);
    setCurrentRole('SCHOOL_ADMIN');
    setIsImpersonating(false);
    setImpersonatedByActorId(null);
    saveState(adminUser, school, 'SCHOOL_ADMIN');
    void fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appUserId: adminUser.id,
        email: adminUser.email,
        fullName: adminUser.full_name,
        phone: adminUser.phone,
        role: adminUser.role,
        schoolId: school.id,
        password: data.password,
      }),
    }).catch(() => {});
    if (auth.currentUser) {
      await SqlSyncService.pushSchoolToSql(school.id);
    }
    return { school, adminUser };
  };

  const registerUser = async (data: {
    role: Role;
    schoolId: string;
    fullName: string;
    email: string;
    phone: string;
    password: string;
    additionalIdentifier?: string;
  }) => {
    const { user, school } = dbService.registerUser(data);
    setCurrentSchool(school);
    setCurrentUser(user);
    setCurrentRole(user.role);
    setIsImpersonating(false);
    setImpersonatedByActorId(null);
    saveState(user, school, user.role);
    void fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appUserId: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        role: user.role,
        schoolId: school.id,
        password: data.password,
      }),
    }).catch(() => {});
    if (auth.currentUser) {
      await SqlSyncService.pushSchoolToSql(school.id);
    }
    return { user, school };
  };

  const refreshState = () => {
    setCurrentSchool((prev) => {
      if (!prev) return prev;
      const fresh = dbService.getSchoolById(prev.id);
      return fresh ? { ...fresh } : prev;
    });
    setCurrentUser((prev) => {
      if (!prev) return prev;
      const fresh = dbService.getUserById(prev.id);
      return fresh ? { ...fresh } : prev;
    });
  };

  const completeProfileSetup = async (data: {
    schoolName: string;
    academicYear: number;
    currentTerm?: string;
    gradeLevels: string[];
    defaultStream?: string;
  }) => {
    if (!currentSchool || !currentUser) {
      throw new Error('No active school workspace or administrator session found.');
    }
    const { school } = dbService.completeSchoolProfileSetup(
      currentSchool.id,
      currentUser.id,
      data
    );
    refreshState();
    await SyncService.cacheActiveSchool(school.id);
    if (auth.currentUser) {
      await SqlSyncService.pushSchoolToSql(school.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentSchool,
        currentRole,
        activeSchoolId: currentSchool?.id || 'school-1',
        isImpersonating,
        impersonatedByActorId,
        firebaseUser,
        login,
        signInWithGoogle,
        logout,
        switchRole,
        impersonateSchool,
        stopImpersonation,
        registerSchool,
        registerUser,
        completeProfileSetup,
        refreshState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
