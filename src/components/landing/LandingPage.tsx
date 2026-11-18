import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  GraduationCap,
  ShieldCheck,
  Award,
  CheckCircle2,
  Building2,
  Lock,
  ArrowRight,
  BookOpen,
  DollarSign,
  FileText,
  Users,
  Smartphone,
  Sparkles,
} from 'lucide-react';

interface LandingPageProps {
  onOpenSignup: () => void;
  onEnterApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenSignup, onEnterApp }) => {
  const { login, switchRole } = useAuth();
  const [email, setEmail] = useState('admin@kilimani.ac.ke');
  const [password, setPassword] = useState('admin123');
  const [schoolSlug, setSchoolSlug] = useState('kilimani-academy');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError(null);
    try {
      await login(email, password, schoolSlug);
      onEnterApp();
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const quickLoginAs = (role: any, demoEmail: string, slug?: string) => {
    setEmail(demoEmail);
    if (slug) setSchoolSlug(slug);
    switchRole(role);
    onEnterApp();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center text-white font-extrabold text-xl shadow-md">
              E
            </div>
            <div>
              <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                ElimuCore <span className="text-emerald-700">CBC</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                Kenya Basic Education Framework
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onEnterApp()}
              className="px-3.5 py-2 text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition border border-emerald-200 cursor-pointer"
            >
              Sign In / Register
            </button>
            <button
              onClick={onOpenSignup}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              Register School Workspace
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-950 via-slate-900 to-slate-950 text-white py-16 lg:py-24 px-4 sm:px-6">
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-15" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Left copy */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              Engineered for Kenyan CBC Schools (PP1 – Grade 9)
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              The Complete Multi-Tenant SaaS for Competency-Based Education
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl">
              ElimuCore empowers Kenyan primary and junior secondary schools with isolated tenant workspaces, 
              the official 8-level CBC rubric (EE1–BE2), Grade 9 KJSEA placement engine, KNEC CBA portal export, 
              M-Pesa automated fee receipts, Africa&apos;s Talking SMS, and Kenya Data Protection Act (DPA 2019) compliance.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-xl font-black text-emerald-400">8-Level</div>
                <div className="text-xs text-slate-300">CBC Rubric & Points</div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-xl font-black text-emerald-400">Zero Rank</div>
                <div className="text-xs text-slate-300">KICD Assessment Compliant</div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-xl font-black text-emerald-400">KJSEA</div>
                <div className="text-xs text-slate-300">Grade 9 Senior Placement</div>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-xl font-black text-emerald-400">DPA 2019</div>
                <div className="text-xs text-slate-300">ODPC Privacy Ready</div>
              </div>
            </div>

            {/* Quick Demo Switcher Strip */}
            <div className="pt-4 border-t border-white/10">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Instant One-Click Demo Personas:
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => quickLoginAs('SCHOOL_ADMIN', 'admin@kilimani.ac.ke', 'kilimani-academy')}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-xs font-semibold text-emerald-200 transition"
                >
                  School Admin (Kilimani)
                </button>
                <button
                  onClick={() => quickLoginAs('TEACHER', 'mwangi@kilimani.ac.ke', 'kilimani-academy')}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition"
                >
                  Teacher (Tr. Mwangi)
                </button>
                <button
                  onClick={() => quickLoginAs('PARENT', 'otieno@gmail.com', 'kilimani-academy')}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition"
                >
                  Parent Portal (Eng. Otieno)
                </button>
                <button
                  onClick={() => quickLoginAs('STUDENT', 'brian.otieno@student.ke', 'kilimani-academy')}
                  className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-semibold text-white transition"
                >
                  Student Portal (Brian)
                </button>
              </div>
            </div>
          </div>

          {/* Right Login Box */}
          <div className="lg:col-span-5">
            <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Sign in to Workspace</h3>
                  <p className="text-xs text-slate-500">Access your school tenant or parent portal</p>
                </div>
                <span className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                  <Lock className="w-5 h-5" />
                </span>
              </div>

              {loginError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="name@school.ac.ke"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    School Identifier / Tenant Slug
                  </label>
                  <input
                    type="text"
                    value={schoolSlug}
                    onChange={(e) => setSchoolSlug(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. kilimani-academy"
                  />
                  <div className="text-[11px] text-slate-400 mt-1">
                    Default demo tenants: <code>kilimani-academy</code> or <code>mombasa-heritage</code>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 shadow-md shadow-emerald-900/10 disabled:opacity-50"
                >
                  {loading ? 'Authenticating...' : 'Sign In to Workspace'}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-center text-xs">
                <div>
                  <span className="text-slate-500">New user? </span>
                  <button
                    onClick={() => onEnterApp()}
                    className="font-bold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Register on the Web (Teacher, Parent, Learner) &rarr;
                  </button>
                </div>
                <div className="text-slate-400 text-[11px]">
                  <span>School Head? </span>
                  <button
                    onClick={onOpenSignup}
                    className="font-semibold text-slate-700 hover:text-emerald-700 hover:underline cursor-pointer"
                  >
                    Register New School Workspace
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Plans */}
      <section className="py-16 px-4 sm:px-6 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Transparent Pricing for Kenyan CBC Schools
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-2">
            Every plan includes complete multi-tenant database isolation, PP1–Grade 9 curriculum subjects, and KICD rubric compliance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free Tier */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs">
            <div>
              <div className="inline-block px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-[10px] font-bold uppercase mb-3">
                Starter Community
              </div>
              <h3 className="text-xl font-bold text-slate-900">Free Tier</h3>
              <div className="mt-2 text-2xl font-black text-slate-900">KES 0 <span className="text-xs font-normal text-slate-500">/ forever</span></div>
              <p className="text-xs text-slate-500 mt-2">Ideal for emerging schools and small community daycare / PP1–PP2 centres.</p>

              <ul className="mt-6 space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Up to 150 learners
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Full 8-level CBC Rubric & Score Entry
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> PDF Report Cards generation (no ranking)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Attendance Register & Class Management
                </li>
              </ul>
            </div>

            <button
              onClick={onOpenSignup}
              className="mt-6 w-full py-2 border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-lg transition"
            >
              Sign Up Free
            </button>
          </div>

          {/* Basic Tier */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between shadow-xs">
            <div>
              <div className="inline-block px-2.5 py-1 rounded bg-blue-100 text-blue-800 text-[10px] font-bold uppercase mb-3">
                Growing Schools
              </div>
              <h3 className="text-xl font-bold text-slate-900">Basic Tier</h3>
              <div className="mt-2 text-2xl font-black text-slate-900">KES 8,500 <span className="text-xs font-normal text-slate-500">/ term</span></div>
              <p className="text-xs text-slate-500 mt-2">For established primary academies needing fee invoicing and parent messaging.</p>

              <ul className="mt-6 space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Up to 500 learners
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Fee Invoicing & M-Pesa Receipt Generation
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Batch Africa&apos;s Talking SMS Notifications
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Library Book Loans & Overdue Fine Tracking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Weekly Timetable Conflict Detector
                </li>
              </ul>
            </div>

            <button
              onClick={onOpenSignup}
              className="mt-6 w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition"
            >
              Get Started
            </button>
          </div>

          {/* Pro Tier (Featured) */}
          <div className="bg-white rounded-2xl border-2 border-emerald-600 p-6 flex flex-col justify-between shadow-xl relative">
            <div className="absolute -top-3 right-6 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full">
              Recommended for Comprehensive Schools
            </div>

            <div>
              <div className="inline-block px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase mb-3">
                Comprehensive JSS
              </div>
              <h3 className="text-xl font-bold text-slate-900">Pro Enterprise</h3>
              <div className="mt-2 text-2xl font-black text-emerald-700">KES 18,000 <span className="text-xs font-normal text-slate-500">/ term</span></div>
              <p className="text-xs text-slate-500 mt-2">Complete suite for PP1 to Grade 9 Junior Secondary with Boarding & KJSEA.</p>

              <ul className="mt-6 space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> <strong>Unlimited learners & teachers</strong>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> <strong>Grade 9 KJSEA Placement Engine & CBA Portal Export</strong>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Boarding Hostel & Room Allocations
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Bus Transport Routes & Stop Rosters
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Teacher Payroll with SHIF, NSSF & Housing Levy
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Kenya DPA 2019 ODPC Consent & SLA Queue
                </li>
              </ul>
            </div>

            <button
              onClick={onOpenSignup}
              className="mt-6 w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-md transition"
            >
              Start Free Pro Trial
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-8 text-xs border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            © 2026 ElimuCore SaaS Ltd. Kenya Curriculum Framework & Data Protection Act 2019 Certified.
          </div>
          <div className="flex items-center gap-4">
            <span>Server: Kenya Cloud Run</span>
            <span>•</span>
            <span>ODPC Reg: No. 2025/ODPC/481</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
