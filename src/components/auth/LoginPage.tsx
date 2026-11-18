import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import {
  Lock,
  Mail,
  Building2,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Phone,
  GraduationCap,
  Users,
  Briefcase,
  UserCheck,
  X,
  ExternalLink,
  ChevronRight,
  UserPlus,
  LogIn,
  Check,
} from 'lucide-react';
import { Role } from '../../types';

interface LoginPageProps {
  onOpenSignup: () => void;
  onGoToLanding?: () => void;
  onSuccess?: () => void;
  initialResetToken?: string | null;
  onResetFlowCleared?: () => void;
}

type RoleMode = 'admin' | 'teacher' | 'parent' | 'student' | 'owner';

export const LoginPage: React.FC<LoginPageProps> = ({
  onOpenSignup,
  onGoToLanding,
  onSuccess,
  initialResetToken,
  onResetFlowCleared,
}) => {
  const { login, signInWithGoogle, switchRole, registerUser } = useAuth();

  const registeredSchools = dbService.getSchools();

  // Mode: Sign In vs Self-Registration on the Web
  const [authTab, setAuthTab] = useState<'signin' | 'register'>('signin');

  // Sign In State
  const [roleMode, setRoleMode] = useState<RoleMode>('admin');
  const [selectedSchoolSlug, setSelectedSchoolSlug] = useState<string>(
    registeredSchools[0]?.slug || 'kilimani-academy'
  );
  const [identifier, setIdentifier] = useState('admin@kilimani.ac.ke');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [parentLoginMethod, setParentLoginMethod] = useState<'phone' | 'email'>('phone');

  // Self-Registration Form State
  const [regRole, setRegRole] = useState<'TEACHER' | 'PARENT' | 'STUDENT' | 'SCHOOL_ADMIN'>('TEACHER');
  const [regSchoolId, setRegSchoolId] = useState<string>(registeredSchools[0]?.id || 'school-1');
  const [regFullName, setRegFullName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPhone, setRegPhone] = useState<string>('+254 7');
  const [regIdentifier, setRegIdentifier] = useState<string>(''); // TSC No, Adm No, etc.
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [regShowPassword, setRegShowPassword] = useState<boolean>(false);
  const [regTermsAccepted, setRegTermsAccepted] = useState<boolean>(true);

  // Common UI State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Forgot Password / Nodemailer Recovery Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'sent' | 'reset' | 'done'>('request');
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetTokenInput, setResetTokenInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [tokenVerifying, setTokenVerifying] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [verifiedResetEmail, setVerifiedResetEmail] = useState<string | null>(null);
  const [verifiedMaskedEmail, setVerifiedMaskedEmail] = useState<string | null>(null);
  const [resetPreviewUrl, setResetPreviewUrl] = useState<string | null>(null);

  // Presets per role mode
  const ROLE_CONFIGS: Record<
    RoleMode,
    {
      title: string;
      subtitle: string;
      label: string;
      placeholder: string;
      defaultIdentifier: string;
      defaultPassword: string;
      helperNote: string;
      icon: React.ComponentType<{ className?: string }>;
    }
  > = {
    admin: {
      title: 'Institutional Administration',
      subtitle: 'Headteacher, Deputy Principal & Bursar Workspace',
      label: 'Institutional Email Address',
      placeholder: 'e.g. admin@kilimani.ac.ke',
      defaultIdentifier: 'admin@kilimani.ac.ke',
      defaultPassword: 'admin123',
      helperNote: 'Full administrative access: fees, broadsheets, staff payroll & school settings',
      icon: Briefcase,
    },
    teacher: {
      title: 'Teaching Faculty Portal',
      subtitle: 'Class Teachers & CBC Subject Assessment Coordinators',
      label: 'Teacher Email or TSC Employee Number',
      placeholder: 'e.g. mwangi@kilimani.ac.ke or TSC/78910',
      defaultIdentifier: 'mwangi@kilimani.ac.ke',
      defaultPassword: 'teacher123',
      helperNote: 'Daily roll-call attendance, formative rubrics & 8-level CBC marks entry',
      icon: Users,
    },
    parent: {
      title: 'Parent & Guardian Portal',
      subtitle: 'Learner Progress, Fee Statements & Exeat Clearance',
      label: parentLoginMethod === 'phone' ? 'M-Pesa Registered Mobile Phone' : 'Parent Email Address',
      placeholder: parentLoginMethod === 'phone' ? 'e.g. 0722345678 or +254 7...' : 'e.g. otieno@gmail.com',
      defaultIdentifier: parentLoginMethod === 'phone' ? '0722345678' : 'otieno@gmail.com',
      defaultPassword: 'parent123',
      helperNote: 'Instant M-Pesa STK Push fee receipts, term report cards & attendance logs',
      icon: UserCheck,
    },
    student: {
      title: 'Junior Learner Portal',
      subtitle: 'Learner Portfolio, Homework & Term Assessment Cards',
      label: 'Admission Number or Student Email',
      placeholder: 'e.g. KIL/2026/001 or brian.otieno@student.ke',
      defaultIdentifier: 'KIL/2026/001',
      defaultPassword: 'student123',
      helperNote: 'Access digital lessons, school timetable, homework and library book loans',
      icon: GraduationCap,
    },
    owner: {
      title: 'Platform Director & Quality Auditor',
      subtitle: 'Ministry of Education & Multi-School Oversight',
      label: 'Platform Master Account',
      placeholder: 'owner@elimucore.co.ke',
      defaultIdentifier: 'owner@elimucore.co.ke',
      defaultPassword: 'owner123',
      helperNote: 'Multi-tenant school provisioning, billing subscriptions & DPA compliance audit',
      icon: ShieldCheck,
    },
  };

  const currentConfig = ROLE_CONFIGS[roleMode];
  const selectedSchool = registeredSchools.find((s) => s.slug === selectedSchoolSlug) || registeredSchools[0];

  // Switch Role Mode for Sign In
  const handleRoleModeChange = (mode: RoleMode) => {
    setRoleMode(mode);
    const cfg = ROLE_CONFIGS[mode];
    setIdentifier(cfg.defaultIdentifier);
    setPassword(cfg.defaultPassword);
    setErrorMessage(null);
  };

  // Fast One-Click Sign In (Demo Evaluator)
  const handleFastLogin = async (mode: RoleMode) => {
    handleRoleModeChange(mode);
    setLoading(true);
    setErrorMessage(null);

    const cfg = ROLE_CONFIGS[mode];
    try {
      if (mode === 'owner') {
        switchRole('PLATFORM_OWNER');
      } else {
        await login(cfg.defaultIdentifier, cfg.defaultPassword, selectedSchoolSlug);
      }
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Sign In
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setErrorMessage('Please enter your registered identifier (Email, Phone, Admission No, or TSC No).');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      if (roleMode === 'owner' || identifier.toLowerCase() === 'owner@elimucore.co.ke') {
        switchRole('PLATFORM_OWNER');
      } else {
        await login(identifier.trim(), password, selectedSchoolSlug);
      }
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Self-Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!regFullName.trim()) {
      setErrorMessage('Please enter your full legal name.');
      return;
    }
    if (!regEmail.trim()) {
      setErrorMessage('Please provide an email address.');
      return;
    }
    if (!regPhone.trim() || regPhone.trim().length < 9) {
      setErrorMessage('Please provide a valid phone number (e.g., 0712345678 or +254 7...).');
      return;
    }
    if (!regPassword.trim() || regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your password confirmation.');
      return;
    }
    if (!regTermsAccepted) {
      setErrorMessage('Please accept the Kenya Data Protection Act (DPA 2019) school privacy policy.');
      return;
    }

    setLoading(true);

    try {
      await registerUser({
        role: regRole,
        schoolId: regSchoolId,
        fullName: regFullName.trim(),
        email: regEmail.trim(),
        phone: regPhone.trim(),
        password: regPassword,
        additionalIdentifier: regIdentifier.trim() || undefined,
      });

      setSuccessMessage(`Account registered successfully! Welcome to the portal, ${regFullName}.`);
      if (onSuccess) {
        setTimeout(() => onSuccess(), 400);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  const verifyTokenAgainstServer = async (tokenValue: string) => {
    const clean = tokenValue.trim();
    if (!clean) {
      setVerifiedResetEmail(null);
      setVerifiedMaskedEmail(null);
      return;
    }

    setTokenVerifying(true);
    setForgotError(null);
    try {
      const res = await fetch(
        `/api/auth/reset-password/verify?token=${encodeURIComponent(clean)}`
      );
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setVerifiedResetEmail(null);
        setVerifiedMaskedEmail(null);
        setForgotError(
          data.error || 'This password reset token is invalid or has expired.'
        );
        return;
      }
      setVerifiedResetEmail(data.email || null);
      setVerifiedMaskedEmail(data.maskedEmail || data.email || null);
    } catch {
      setVerifiedResetEmail(null);
      setVerifiedMaskedEmail(null);
      setForgotError('Unable to verify reset token. Please check your connection.');
    } finally {
      setTokenVerifying(false);
    }
  };

  useEffect(() => {
    if (initialResetToken && initialResetToken.trim()) {
      const cleanToken = initialResetToken.trim();
      setIsForgotModalOpen(true);
      setForgotStep('reset');
      setResetTokenInput(cleanToken);
      setNewPassword('');
      setConfirmNewPassword('');
      setForgotError(null);
      void verifyTokenAgainstServer(cleanToken);
    }
  }, [initialResetToken]);

  const handleCloseForgotModal = () => {
    setIsForgotModalOpen(false);
    setForgotError(null);
    if (onResetFlowCleared) {
      onResetFlowCleared();
    }
  };

  // Recovery Flows (Nodemailer + PostgreSQL Token)
  const handleStartForgot = () => {
    setForgotStep('request');
    setForgotEmail(identifier.includes('@') ? identifier.trim() : '');
    setResetTokenInput('');
    setNewPassword('');
    setConfirmNewPassword('');
    setForgotError(null);
    setVerifiedResetEmail(null);
    setVerifiedMaskedEmail(null);
    setResetPreviewUrl(null);
    setIsForgotModalOpen(true);
  };

  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailClean = forgotEmail.trim().toLowerCase();
    if (!emailClean || !emailClean.includes('@')) {
      setForgotError('Please enter a valid institutional email address.');
      return;
    }

    setForgotLoading(true);
    setForgotError(null);
    setResetPreviewUrl(null);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailClean }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to dispatch password reset email.');
      }
      setResetPreviewUrl(data.previewUrl || null);
      setForgotStep('sent');
    } catch (err: unknown) {
      setForgotError(
        err instanceof Error ? err.message : 'Unable to send password reset email.'
      );
    } finally {
      setForgotLoading(false);
    }
  };

  const handleCompletePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const tokenClean = resetTokenInput.trim();
    if (!tokenClean) {
      setForgotError('Please paste the password reset token from your email.');
      return;
    }
    if (newPassword.length < 6) {
      setForgotError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setForgotError('New passwords do not match.');
      return;
    }

    setForgotLoading(true);
    setForgotError(null);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenClean,
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to reset password.');
      }

      const targetEmail = data.email || verifiedResetEmail || forgotEmail;
      if (targetEmail) {
        dbService.updateUserPasswordByEmail(targetEmail, newPassword);
        setIdentifier(targetEmail);
      }
      setPassword(newPassword);
      setForgotStep('done');
      setSuccessMessage('Password successfully updated. You may now sign in with your new password.');
      if (onResetFlowCleared) {
        onResetFlowCleared();
      }
    } catch (err: unknown) {
      setForgotError(
        err instanceof Error ? err.message : 'Unable to reset password.'
      );
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/80 flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      {/* Kenyan Flag Ribbon Accent at Top */}
      <div className="fixed top-0 left-0 right-0 h-1.5 flex z-50">
        <div className="flex-1 bg-black" />
        <div className="w-3 bg-white" />
        <div className="flex-1 bg-[#990000]" />
        <div className="w-3 bg-white" />
        <div className="flex-1 bg-[#006600]" />
      </div>

      <div className="max-w-5xl w-full mx-auto">
        {/* Main Card Container */}
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Left Institutional Showcase (Desktop lg:col-span-5) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 p-6 sm:p-8 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />

            <div className="relative z-10 space-y-6">
              {/* Crest & Title */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-white font-black text-2xl shadow-lg border border-emerald-400/40">
                  E
                </div>
                <div>
                  <h1 className="text-xl font-black tracking-tight leading-none text-white">
                    ElimuCore <span className="text-emerald-400">CBC</span>
                  </h1>
                  <span className="text-[11px] font-semibold text-emerald-300">
                    Kenyan School Management SaaS
                  </span>
                </div>
              </div>

              {/* Mission Statement */}
              <div className="space-y-3">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight text-white">
                  Empowering Kenya's Basic Education Ecosystem
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Unified cloud workspace for Heads of School, CBC Subject Teachers, Parents, and Junior Secondary Learners.
                </p>
              </div>

              {/* Registration Prompt Badge */}
              <div className="p-3 bg-emerald-900/50 border border-emerald-500/40 rounded-2xl">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs mb-1">
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  <span>Web Self-Registration Enabled</span>
                </div>
                <p className="text-[11px] text-slate-200 leading-relaxed">
                  Anyone can register on the web: teachers register with TSC numbers, parents with M-Pesa phone numbers, and learners with admission numbers.
                </p>
              </div>

              {/* Kenyan Standards Micro-Badges */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl">
                  <div className="font-bold text-emerald-400 text-sm">8-Level Rubric</div>
                  <div className="text-[10px] text-slate-300 mt-0.5">EE1 to BE2 Points</div>
                </div>
                <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl">
                  <div className="font-bold text-emerald-400 text-sm">Zero Ranking</div>
                  <div className="text-[10px] text-slate-300 mt-0.5">KICD Assessment Rules</div>
                </div>
                <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl">
                  <div className="font-bold text-emerald-400 text-sm">M-Pesa STK</div>
                  <div className="text-[10px] text-slate-300 mt-0.5">Instant Fee Settlement</div>
                </div>
                <div className="p-2.5 bg-white/5 border border-white/10 rounded-xl">
                  <div className="font-bold text-emerald-400 text-sm">DPA 2019</div>
                  <div className="text-[10px] text-slate-300 mt-0.5">Kenya ODPC Compliant</div>
                </div>
              </div>
            </div>

            {/* Republic of Kenya Endorsement Line */}
            <div className="relative z-10 pt-6 mt-6 border-t border-white/10 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Ministry of Education Aligned</span>
              <span className="text-slate-300 font-bold">Version 2.4 CBC</span>
            </div>
          </div>

          {/* Right Form Container (Desktop lg:col-span-7) */}
          <div className="lg:col-span-7 p-6 sm:p-8 space-y-4 flex flex-col justify-between bg-white">
            <div>
              {/* Header Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900">
                    {authTab === 'signin' ? 'Sign In to ElimuCore' : 'Create an Account on the Web'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {authTab === 'signin'
                      ? 'Select your role and sign in with your credentials'
                      : 'Register to access Kenyan CBC report cards, attendance & fee records'}
                  </p>
                </div>
                {onGoToLanding && (
                  <button
                    onClick={onGoToLanding}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>Public Home</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Status Notifications */}
              {errorMessage && (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMessage}</span>
                </div>
              )}

              {/* PROMINENT TOP SWITCHER: SIGN IN VS REGISTER */}
              <div className="mt-3 grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('signin');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`py-2 px-3 rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    authTab === 'signin'
                      ? 'bg-white text-emerald-900 shadow-sm border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LogIn className="w-4 h-4 text-emerald-700" />
                  <span>Sign In</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('register');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`py-2 px-3 rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    authTab === 'register'
                      ? 'bg-emerald-700 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register on the Web</span>
                </button>
              </div>

              {/* ========================================================
                  TAB 1: SIGN IN VIEW
                 ======================================================== */}
              {authTab === 'signin' && (
                <div className="mt-3 space-y-3.5">
                  {/* Role Portal Switcher Tabs */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                      <span>Select Portal Category:</span>
                      <span className="text-emerald-700 font-bold text-[10px]">
                        Active: {currentConfig.title}
                      </span>
                    </div>

                    {roleMode === 'owner' && (
                      <div className="p-2.5 bg-slate-900 text-white rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span className="font-bold">Platform Director Master Portal</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRoleModeChange('admin')}
                          className="text-[11px] text-slate-300 hover:text-white underline cursor-pointer"
                        >
                          Return to School Login
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs">
                      {[
                        { id: 'admin' as RoleMode, label: 'Admin', icon: Briefcase },
                        { id: 'teacher' as RoleMode, label: 'Teacher', icon: Users },
                        { id: 'parent' as RoleMode, label: 'Parent', icon: UserCheck },
                        { id: 'student' as RoleMode, label: 'Learner', icon: GraduationCap },
                      ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = roleMode === tab.id;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => handleRoleModeChange(tab.id)}
                            className={`py-2 px-2.5 rounded-xl font-bold transition flex items-center justify-center gap-1.5 min-h-[38px] cursor-pointer ${
                              isActive
                                ? 'bg-emerald-700 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Role Context Helper Banner */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-2.5 text-xs">
                    <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg mt-0.5 shrink-0">
                      <currentConfig.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{currentConfig.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{currentConfig.helperNote}</div>
                    </div>
                  </div>

                  {/* Main Sign In Form */}
                  <form onSubmit={handleSignInSubmit} className="space-y-3 text-xs">
                    {/* School Tenant Dropdown */}
                    {roleMode !== 'owner' && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="font-bold text-slate-700">School Institution Workspace</label>
                          <span className="text-[10px] text-slate-400">Multi-tenant selector</span>
                        </div>
                        <div className="relative">
                          <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <select
                            value={selectedSchoolSlug}
                            onChange={(e) => setSelectedSchoolSlug(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px]"
                          >
                            {registeredSchools.map((s) => (
                              <option key={s.id} value={s.slug}>
                                {s.name} ({s.address.split(',')[0]})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Parent Login Method Toggle */}
                    {roleMode === 'parent' && (
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-slate-500 font-medium text-[11px]">Parent sign-in via:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setParentLoginMethod('phone');
                            setIdentifier('0722345678');
                          }}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                            parentLoginMethod === 'phone'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          M-Pesa Mobile Phone
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setParentLoginMethod('email');
                            setIdentifier('otieno@gmail.com');
                          }}
                          className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                            parentLoginMethod === 'email'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Email Address
                        </button>
                      </div>
                    )}

                    {/* Identifier Field */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">{currentConfig.label}</label>
                      <div className="relative">
                        {roleMode === 'parent' && parentLoginMethod === 'phone' ? (
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        ) : roleMode === 'student' ? (
                          <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        ) : (
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        )}
                        <input
                          type="text"
                          required
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          placeholder={currentConfig.placeholder}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px]"
                        />
                      </div>
                    </div>

                    {/* Password Field */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700">Security Password</label>
                        <button
                          type="button"
                          onClick={handleStartForgot}
                          className="text-emerald-700 hover:text-emerald-800 text-[11px] font-bold cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Remember Me */}
                    <div className="flex items-center justify-between pt-0.5">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-slate-600 font-medium text-xs">Remember this device</span>
                      </label>
                    </div>

                    {/* Sign In Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-xs min-h-[44px] cursor-pointer"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Sign In as {currentConfig.title.split(' ')[0]}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <div className="relative flex items-center py-1">
                      <div className="flex-grow border-t border-slate-200" />
                      <span className="shrink mx-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Or
                      </span>
                      <div className="flex-grow border-t border-slate-200" />
                    </div>

                    <button
                      type="button"
                      disabled={loading}
                      onClick={async () => {
                        setLoading(true);
                        setErrorMessage(null);
                        try {
                          await signInWithGoogle(selectedSchoolSlug);
                          if (onSuccess) onSuccess();
                        } catch (err: unknown) {
                          setErrorMessage(
                            err instanceof Error
                              ? err.message
                              : 'Google Sign-In failed. Please try again.'
                          );
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2.5 shadow-2xs min-h-[42px] cursor-pointer"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
                      <span>Continue with Google</span>
                    </button>
                  </form>

                  {/* Switch to Register link */}
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-emerald-950 font-medium">Don't have an account yet?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('register');
                        setErrorMessage(null);
                      }}
                      className="font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                    >
                      Register on the Web &rarr;
                    </button>
                  </div>

                  {/* 1-Click Fast Switch Demo Bar */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Demo Evaluator Shortcuts:
                      </span>
                      <span className="text-[10px] text-emerald-700 font-mono">1-click login</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleFastLogin('admin')}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-lg font-bold text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>🛡️ Headteacher</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFastLogin('teacher')}
                        className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg font-bold text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>👨‍🏫 Tr. Mwangi</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFastLogin('parent')}
                        className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg font-bold text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>👨‍👩‍👧 Parent (Otieno)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFastLogin('student')}
                        className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-lg font-bold text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>🎓 Learner (Brian)</span>
                      </button>
                    </div>
                    <div className="pt-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRoleModeChange('owner')}
                        className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 transition inline-flex items-center gap-1.5 cursor-pointer py-1"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span>Platform Director / Master SaaS Login</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================
                  TAB 2: REGISTER ON THE WEB VIEW
                 ======================================================== */}
              {authTab === 'register' && (
                <div className="mt-3 space-y-3.5">
                  {/* Role Type Selection for Registration */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      1. Select Your Account Role:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                      {[
                        { role: 'TEACHER' as const, label: 'CBC Teacher', icon: Users, desc: 'Faculty' },
                        { role: 'PARENT' as const, label: 'Parent / Guardian', icon: UserCheck, desc: 'Learner Reports' },
                        { role: 'STUDENT' as const, label: 'Learner', icon: GraduationCap, desc: 'Student Portal' },
                        { role: 'SCHOOL_ADMIN' as const, label: 'School Admin', icon: Briefcase, desc: 'Headteacher' },
                      ].map((item) => {
                        const Icon = item.icon;
                        const isSelected = regRole === item.role;
                        return (
                          <button
                            key={item.role}
                            type="button"
                            onClick={() => setRegRole(item.role)}
                            className={`p-2 rounded-xl text-left border transition cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold shadow-xs'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-700' : 'text-slate-500'}`} />
                              <span className="text-xs truncate">{item.label}</span>
                            </div>
                            <span className="text-[10px] text-slate-500 block truncate">{item.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Main Self-Registration Form */}
                  <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
                    {/* School Selection */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700">2. School Institution <span className="text-rose-500">*</span></label>
                        <button
                          type="button"
                          onClick={onOpenSignup}
                          className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold cursor-pointer"
                        >
                          + Register New School Tenant
                        </button>
                      </div>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <select
                          value={regSchoolId}
                          onChange={(e) => setRegSchoolId(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px]"
                        >
                          {registeredSchools.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.address.split(',')[0]} - {s.slug})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Full Name & Phone in 2-Column Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Full Legal Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={regFullName}
                          onChange={(e) => setRegFullName(e.target.value)}
                          placeholder="e.g. Grace Muthoni"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px]"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          M-Pesa Mobile Phone <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            required
                            value={regPhone}
                            onChange={(e) => setRegPhone(e.target.value)}
                            placeholder="e.g. 0712345678"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Email & Role-Specific Identifier */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Email Address <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            required
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            placeholder="e.g. user@gmail.com"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          {regRole === 'TEACHER'
                            ? 'TSC Employee Number'
                            : regRole === 'PARENT'
                            ? 'Child Admission Number (Link)'
                            : regRole === 'STUDENT'
                            ? 'Student Admission No / UPI'
                            : 'Staff Designation'}
                        </label>
                        <input
                          type="text"
                          value={regIdentifier}
                          onChange={(e) => setRegIdentifier(e.target.value)}
                          placeholder={
                            regRole === 'TEACHER'
                              ? 'e.g. TSC/84920'
                              : regRole === 'PARENT'
                              ? 'e.g. KIL/2026/001'
                              : regRole === 'STUDENT'
                              ? 'e.g. KIL/2026/001'
                              : 'e.g. Deputy Principal'
                          }
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px]"
                        />
                      </div>
                    </div>

                    {/* Password & Confirm Password */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Create Password <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type={regShowPassword ? 'text' : 'password'}
                            required
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            placeholder="Min. 6 characters"
                            className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px]"
                          />
                          <button
                            type="button"
                            onClick={() => setRegShowPassword(!regShowPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                          >
                            {regShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Confirm Password <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type={regShowPassword ? 'text' : 'password'}
                            required
                            value={regConfirmPassword}
                            onChange={(e) => setRegConfirmPassword(e.target.value)}
                            placeholder="Re-type password"
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Privacy & Terms Consent */}
                    <div className="pt-1">
                      <label className="flex items-start gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={regTermsAccepted}
                          onChange={(e) => setRegTermsAccepted(e.target.checked)}
                          className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-slate-600 text-[11px] leading-tight">
                          I agree to register on the ElimuCore web platform and consent to secure processing under the <strong>Kenya Data Protection Act (DPA 2019)</strong>.
                        </span>
                      </label>
                    </div>

                    {/* Submit Registration Button */}
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-xs min-h-[44px] cursor-pointer"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Complete Registration & Access Portal</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Switch to Sign In link */}
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                    <span className="text-slate-600">Already have an account?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab('signin');
                        setErrorMessage(null);
                      }}
                      className="font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                    >
                      &larr; Return to Sign In
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Register Footer */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
              <span>New Kenyan basic education institution?</span>
              <button
                type="button"
                onClick={onOpenSignup}
                className="font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Register School Workspace</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password & Token Reset Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                  <KeyRound className="w-5 h-5" />
                </span>
                <h3 className="font-bold text-base text-slate-900">
                  {forgotStep === 'request'
                    ? 'Reset Account Password'
                    : forgotStep === 'sent'
                    ? 'Check Your Email Inbox'
                    : forgotStep === 'reset'
                    ? 'Create New Password'
                    : 'Password Reset Complete'}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseForgotModal}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {forgotError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-2 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span className="font-medium">{forgotError}</span>
              </div>
            )}

            {/* Step 1: Request Password Reset Email */}
            {forgotStep === 'request' && (
              <form onSubmit={handleRequestPasswordReset} className="space-y-4 text-xs">
                <p className="text-slate-600 leading-relaxed">
                  Enter the institutional email address linked to your ElimuCore account. We will send you a unique, single-use password reset link valid for 60 minutes.
                </p>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g. admin@kilimani.ac.ke"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 min-h-[42px] cursor-pointer"
                >
                  {forgotLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Send Password Reset Email</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotError(null);
                      setForgotStep('reset');
                    }}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
                  >
                    Already have a reset token? Enter it manually
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Email Sent Confirmation */}
            {forgotStep === 'sent' && (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Password Reset Email Dispatched</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    If an account exists for <strong>{forgotEmail}</strong>, a recovery email with a 60-minute single-use reset link and token has been sent.
                  </p>
                </div>

                {resetPreviewUrl && (
                  <a
                    href={resetPreviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5"
                  >
                    <span>Open Dispatched Email Preview</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotError(null);
                      setForgotStep('reset');
                    }}
                    className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 min-h-[42px] cursor-pointer"
                  >
                    <span>Enter Reset Token &amp; Set New Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setForgotError(null);
                      setForgotStep('request');
                    }}
                    className="w-full py-2 px-4 text-slate-600 hover:text-slate-900 font-bold text-xs transition cursor-pointer"
                  >
                    Resend or use a different email
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Verify Token & Save New Password */}
            {forgotStep === 'reset' && (
              <form onSubmit={handleCompletePasswordReset} className="space-y-4 text-xs">
                {tokenVerifying ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-slate-600">
                    <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                    <span>Validating time-limited recovery token...</span>
                  </div>
                ) : verifiedMaskedEmail ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Verified recovery token for <strong>{verifiedMaskedEmail}</strong>.
                    </span>
                  </div>
                ) : null}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">Recovery Token</label>
                    <button
                      type="button"
                      onClick={() => verifyTokenAgainstServer(resetTokenInput)}
                      disabled={!resetTokenInput.trim() || tokenVerifying}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 disabled:opacity-40 cursor-pointer"
                    >
                      Validate Token
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={resetTokenInput}
                    onChange={(e) => {
                      setResetTokenInput(e.target.value);
                      setVerifiedResetEmail(null);
                      setVerifiedMaskedEmail(null);
                    }}
                    placeholder="Paste token from reset email"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-[11px] focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[40px]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[42px]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    type="submit"
                    disabled={forgotLoading || !resetTokenInput.trim() || !newPassword || !confirmNewPassword}
                    className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 min-h-[42px] cursor-pointer"
                  >
                    {forgotLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Save New Password</span>
                        <Check className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setForgotError(null);
                      setForgotStep('request');
                    }}
                    className="w-full py-1.5 text-slate-500 hover:text-slate-800 font-bold text-[11px] transition cursor-pointer"
                  >
                    Request a new reset email
                  </button>
                </div>
              </form>
            )}

            {/* Step 4: Success Screen */}
            {forgotStep === 'done' && (
              <div className="text-center py-4 space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <h4 className="font-bold text-base text-slate-900">Password Updated</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Your password has been securely updated in your account and the recovery token has been invalidated.
                </p>
                <button
                  type="button"
                  onClick={handleCloseForgotModal}
                  className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Return to Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
