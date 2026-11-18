import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useViewMode } from '../../context/ViewModeContext';
import { dbService } from '../../services/storage';
import {
  School as SchoolIcon,
  ShieldAlert,
  Bell,
  Search,
  LogOut,
  UserCheck,
  ChevronDown,
  Building2,
  Sparkles,
  ExternalLink,
  Smartphone,
  Monitor,
  Check,
  Trash2,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { SqlSyncService } from '../../services/sqlSync';
import { Role } from '../../types';

interface NavbarProps {
  onToggleSidebar: () => void;
  onOpenSignup: () => void;
  onOpenSetupProfile?: () => void;
  activeModule: string;
  setActiveModule: (mod: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onToggleSidebar,
  onOpenSignup,
  onOpenSetupProfile,
  setActiveModule,
}) => {
  const {
    currentUser,
    currentSchool,
    currentRole,
    isImpersonating,
    stopImpersonation,
    switchRole,
    logout,
    firebaseUser,
    signInWithGoogle,
  } = useAuth();
  const { viewMode, setViewMode } = useViewMode();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showSchoolMenu, setShowSchoolMenu] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearAlertMessage, setClearAlertMessage] = useState<string | null>(null);

  const handleExecuteClearData = async () => {
    try {
      dbService.clearAllOperationalData(currentSchool?.id);
      if (currentSchool?.id) {
        await SqlSyncService.clearOperationalInSql(currentSchool.id);
      }
      setShowClearModal(false);
      setShowSchoolMenu(false);
      setClearAlertMessage('Demo data cleared successfully! The student roster, marks, and invoices are now empty.');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: unknown) {
      setClearAlertMessage('Failed to clear data: ' + (err instanceof Error ? err.message : 'Error'));
    }
  };

  const allSchools = dbService.getSchools();
  const notifications = currentSchool ? dbService.getNotificationsLog(currentSchool.id) : [];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      {/* Impersonation Warning Banner */}
      {isImpersonating && (
        <div className="bg-amber-600 text-white px-4 py-2 text-xs md:text-sm font-medium flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 animate-pulse text-amber-200" />
            <span>
              <strong>Platform Impersonation Mode:</strong> Viewing <em>{currentSchool?.name}</em> as School Administrator (Audited Session).
            </span>
          </div>
          <button
            onClick={stopImpersonation}
            className="bg-white text-amber-800 hover:bg-amber-50 px-3 py-1 rounded text-xs font-bold transition shadow-sm"
          >
            Exit Impersonation
          </button>
        </div>
      )}

      {/* Main Bar */}
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile hamburger & School Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            title="Toggle Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* School Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSchoolMenu(!showSchoolMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition text-left cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shrink-0">
                {currentSchool ? currentSchool.name.charAt(0) : 'E'}
              </div>
              <div className="hidden sm:block">
                <div className="font-semibold text-slate-900 text-sm leading-tight truncate max-w-[200px]">
                  {currentUser?.role === 'PLATFORM_OWNER' && currentRole === 'PLATFORM_OWNER' ? 'ElimuCore Cloud SaaS' : currentSchool?.name}
                </div>
                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <span className="capitalize text-emerald-700 font-semibold">{currentSchool?.plan || 'pro'} plan</span>
                  <span>•</span>
                  <span>{currentSchool?.current_term || 'Term 1'} {currentSchool?.academic_year || 2026}</span>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {showSchoolMenu && (
              <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                {currentUser?.role === 'PLATFORM_OWNER' ? (
                  <>
                    <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Available School Tenants (Director View)
                    </div>
                    {allSchools.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          switchRole('SCHOOL_ADMIN', undefined, s.id);
                          setShowSchoolMenu(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-slate-50 transition cursor-pointer ${
                          s.id === currentSchool?.id ? 'bg-emerald-50 text-emerald-900 font-medium' : 'text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-medium text-slate-900">{s.name}</div>
                          <div className="text-xs text-slate-500">{s.address}</div>
                        </div>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {s.plan}
                        </span>
                      </button>
                    ))}
                    <div className="border-t border-slate-100 mt-2 pt-2 px-3">
                      <button
                        onClick={() => {
                          setShowSchoolMenu(false);
                          onOpenSignup();
                        }}
                        className="w-full text-left text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 py-1 cursor-pointer"
                      >
                        <Building2 className="w-3.5 h-3.5" />
                        + Register New School Tenant
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowSchoolMenu(false);
                          setShowClearModal(true);
                        }}
                        className="w-full text-left text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded flex items-center gap-1.5 py-1.5 px-1 mt-1 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear Demo Data (Start Fresh)
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      School Workspace Details
                    </div>
                    <div className="px-3 py-2 bg-slate-50 border-y border-slate-100">
                      <div className="font-bold text-slate-900 text-sm">{currentSchool?.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{currentSchool?.address}</div>
                      <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-600">
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold capitalize">
                          {currentSchool?.plan || 'pro'} Tier
                        </span>
                        <span>•</span>
                        <span>{currentSchool?.current_term || 'Term 1'} {currentSchool?.academic_year || 2026}</span>
                      </div>
                    </div>
                    <div className="px-3 pt-2 space-y-1">
                      {currentRole === 'SCHOOL_ADMIN' && onOpenSetupProfile && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowSchoolMenu(false);
                            onOpenSetupProfile();
                          }}
                          className="w-full text-left text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded flex items-center gap-1.5 py-1.5 px-1 transition cursor-pointer"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          Setup Profile (School & Levels)
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setShowSchoolMenu(false);
                          setShowClearModal(true);
                        }}
                        className="w-full text-left text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded flex items-center gap-1.5 py-1.5 px-1 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Clear Demo Data (Start Fresh)
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: Search box */}
        <div className="hidden lg:flex items-center flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search learners, classes, admission numbers, staff..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setActiveModule('students');
                }
              }}
            />
          </div>
        </div>

        {/* Right: View Mode, Role Switcher & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Device View Mode Switcher: Mobile Phone View vs Windows / Desktop View */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('mobile')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                viewMode === 'mobile'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Mobile Phone View (Touch-optimized phone layout & card entry)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Phone View</span>
            </button>
            <button
              onClick={() => setViewMode('windows')}
              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                viewMode === 'windows'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Windows / Desktop View (Widescreen tables & multi-column grid)"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Windows View</span>
            </button>
            <button
              onClick={() => setViewMode('auto')}
              className={`px-1.5 py-1 rounded-md text-[10px] font-semibold transition cursor-pointer ${
                viewMode === 'auto'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Auto Responsive (Detects phone or desktop screen)"
            >
              Auto
            </button>
          </div>

          {!firebaseUser && (
            <button
              onClick={() => void signInWithGoogle(currentSchool?.slug)}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer"
              title="Sign in with your Google Account"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Sign in with Google</span>
            </button>
          )}

          {/* Quick Role Switcher Pill - Strictly Role Guarded */}
          {currentUser?.role === 'PLATFORM_OWNER' ? (
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                title="Platform Director - Switch View"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Director:</span>
                <span className="text-emerald-300 uppercase tracking-wide">
                  {currentRole.replace('_', ' ')}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-300" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Platform Master Oversight
                  </div>
                  {[
                    { role: 'PLATFORM_OWNER', label: '1. Platform Owner Dashboard', desc: 'SaaS Director (All schools & MRR)' },
                    { role: 'SCHOOL_ADMIN', label: '2. School Administrator View', desc: 'Principal Grace (Full school access)' },
                    { role: 'TEACHER', label: '3. Teacher Portal View', desc: 'Tr. Daniel Mwangi (G4/G6/G9 Math/Sci)' },
                    { role: 'PARENT', label: '4. Parent Portal View', desc: 'Eng. David Otieno (Brian & Stacy)' },
                    { role: 'STUDENT', label: '5. Student Portal View', desc: 'Brian Otieno (Grade 9 Summit)' },
                  ].map((item) => (
                    <button
                      key={item.role}
                      onClick={() => {
                        switchRole(item.role as Role);
                        setShowRoleMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-50 transition cursor-pointer ${
                        currentRole === item.role ? 'bg-emerald-50 text-emerald-950 font-bold' : 'text-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-slate-900">{item.label}</div>
                      <div className="text-[11px] text-slate-500">{item.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : currentUser?.role === 'SCHOOL_ADMIN' ? (
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold border border-slate-200 transition cursor-pointer"
                title="School Admin - Preview School Roles"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Role:</span>
                <span className="text-emerald-800 uppercase tracking-wide">
                  {currentRole.replace('_', ' ')}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    School Workspace Roles
                  </div>
                  {[
                    { role: 'SCHOOL_ADMIN', label: 'School Administrator', desc: 'Headteacher / Principal workspace' },
                    { role: 'TEACHER', label: 'Teacher Portal', desc: 'Faculty marks entry & roll-call' },
                    { role: 'PARENT', label: 'Parent Portal', desc: 'Learner report cards & fees' },
                    { role: 'STUDENT', label: 'Student Portal', desc: 'Learner profile & lessons' },
                  ].map((item) => (
                    <button
                      key={item.role}
                      onClick={() => {
                        switchRole(item.role as Role);
                        setShowRoleMenu(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs hover:bg-slate-50 transition cursor-pointer ${
                        currentRole === item.role ? 'bg-emerald-50 text-emerald-950 font-bold' : 'text-slate-700'
                      }`}
                    >
                      <div className="font-semibold text-slate-900">{item.label}</div>
                      <div className="text-[11px] text-slate-500">{item.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Dedicated static badge for Teacher, Parent, Student with NO dropdown */
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 text-slate-800 rounded-lg text-xs font-semibold border border-slate-200">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Portal:</span>
              <span className="text-emerald-800 uppercase tracking-wide">
                {currentRole.replace('_', ' ')}
              </span>
            </div>
          )}

          {/* Notifications Button */}
          <button
            onClick={() => setActiveModule('notifications')}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
            title="Notifications & SMS Log"
          >
            <Bell className="w-4 h-4" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-600 rounded-full animate-ping" />
            )}
          </button>

          {/* User Profile Mini */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold">
              {currentUser?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="hidden xl:block text-left">
              <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[130px]">
                {currentUser?.full_name || 'User'}
              </div>
              <div className="text-[10px] text-slate-500">{currentUser?.email}</div>
            </div>

            <button
              onClick={logout}
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition flex items-center gap-1"
              title="Sign Out / Switch Account"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-semibold text-slate-500 hover:text-rose-600">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Status Notification Banner */}
      {clearAlertMessage && (
        <div className="bg-emerald-600 text-white text-xs py-2 px-4 flex items-center justify-between shadow-md animate-in slide-in-from-top">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{clearAlertMessage}</span>
          </div>
          <button
            onClick={() => setClearAlertMessage(null)}
            className="text-white hover:text-emerald-200 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* In-App Confirmation Modal (Works reliably inside iframes) */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-100 rounded-xl">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Clear All Demo Data?</h3>
                <p className="text-xs text-slate-500">Reset school to a completely blank slate</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will remove all dummy learners, sample marks, test exams, and dummy fee invoices for{' '}
              <strong>{currentSchool?.name}</strong> so that you and your teachers can enter your own real data from scratch.
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
              <strong>What remains intact:</strong> Your school profile, curriculum levels (PP1–Grade 9), and official KICD subjects.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteClearData}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Clear All Demo Data</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
