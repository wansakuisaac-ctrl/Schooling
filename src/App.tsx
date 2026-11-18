/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ViewModeProvider, useViewMode } from './context/ViewModeContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { LandingPage } from './components/landing/LandingPage';
import { SchoolSignupModal } from './components/auth/SchoolSignupModal';
import { SetupProfileModal } from './components/auth/SetupProfileModal';
import { LoginPage } from './components/auth/LoginPage';

// Existing Modules
import { PlatformOwnerDashboard } from './components/modules/PlatformOwnerDashboard';
import { AdminDashboard } from './components/modules/AdminDashboard';
import { DatabaseHealthDashboard } from './components/modules/DatabaseHealthDashboard';
import { AuditLogModule } from './components/modules/AuditLogModule';
import { StudentManagement } from './components/modules/StudentManagement';
import { TeacherManagement } from './components/modules/TeacherManagement';
import { ParentManagement } from './components/modules/ParentManagement';
import { ClassSubjectManagement } from './components/modules/ClassSubjectManagement';
import { AttendanceModule } from './components/modules/AttendanceModule';
import { ExamScoreEntry } from './components/modules/ExamScoreEntry';
import { FormativeAssessments } from './components/modules/FormativeAssessments';
import { ReportCardModule } from './components/modules/ReportCardModule';
import { NotificationModule } from './components/modules/NotificationModule';
import { FeesModule } from './components/modules/FeesModule';
import { TimetableModule } from './components/modules/TimetableModule';
import { MessagingModule } from './components/modules/MessagingModule';
import { AnnouncementsModule } from './components/modules/AnnouncementsModule';
import { LibraryModule } from './components/modules/LibraryModule';
import { TransportModule } from './components/modules/TransportModule';
import { HostelModule } from './components/modules/HostelModule';
import { PayrollModule } from './components/modules/PayrollModule';
import { Grade9KjseaModule } from './components/modules/Grade9KjseaModule';
import { DisciplineModule } from './components/modules/DisciplineModule';
import { InventoryModule } from './components/modules/InventoryModule';
import { GatePassModule } from './components/modules/GatePassModule';
import { DonationsModule } from './components/modules/DonationsModule';
import { TeacherPortal } from './components/modules/TeacherPortal';
import { ParentPortal } from './components/modules/ParentPortal';
import { StudentPortal } from './components/modules/StudentPortal';

// Newly Added Modules Matching Screenshots & Missing Submenus
import { BroadsheetsModule } from './components/modules/BroadsheetsModule';
import { MarksheetModule } from './components/modules/MarksheetModule';
import { MarksEntryModule } from './components/modules/MarksEntryModule';
import { SavedFilesModule } from './components/modules/SavedFilesModule';
import { ElearningModule } from './components/modules/ElearningModule';
import { ContestsModule } from './components/modules/ContestsModule';
import { AdmissionsModule } from './components/modules/AdmissionsModule';
import { BookRecordsModule } from './components/modules/BookRecordsModule';
import { DocumentsModule } from './components/modules/DocumentsModule';

// Floating button icons
import { FileText, MessageSquare } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { currentUser, currentSchool, currentRole, isImpersonating } = useAuth();
  const { effectiveIsMobile, viewMode, setViewMode } = useViewMode();

  const [activeModule, setActiveModule] = useState<string>('admin_dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [isLandingPage, setIsLandingPage] = useState<boolean>(false);
  const [isSignupOpen, setIsSignupOpen] = useState<boolean>(false);
  const [isSetupProfileOpen, setIsSetupProfileOpen] = useState<boolean>(false);
  const [snoozedSetupUserId, setSnoozedSetupUserId] = useState<string | null>(null);
  const [notificationExamId, setNotificationExamId] = useState<string | undefined>(undefined);
  const [pendingResetToken, setPendingResetToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('resetToken') || params.get('token') || null;
  });

  useEffect(() => {
    if (!currentUser) {
      setSnoozedSetupUserId(null);
      setIsSetupProfileOpen(false);
    }
  }, [currentUser]);

  const shouldPromptFirstLoginSetup = Boolean(
    currentUser &&
      currentSchool &&
      currentUser.role === 'SCHOOL_ADMIN' &&
      currentRole === 'SCHOOL_ADMIN' &&
      !isImpersonating &&
      currentUser.needs_profile_setup === true &&
      snoozedSetupUserId !== currentUser.id
  );

  const handleClearResetToken = () => {
    setPendingResetToken(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('resetToken');
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
  };

  // Auto route to appropriate default dashboard when role changes
  useEffect(() => {
    if (currentUser?.role === 'PLATFORM_OWNER' && currentRole === 'PLATFORM_OWNER' && !isImpersonating) {
      setActiveModule('platform_dashboard');
    } else if (currentRole === 'TEACHER') {
      setActiveModule('teacher_portal');
    } else if (currentRole === 'PARENT') {
      setActiveModule('parent_portal');
    } else if (currentRole === 'STUDENT') {
      setActiveModule('student_portal');
    } else {
      setActiveModule('admin_dashboard');
    }
  }, [currentRole, currentUser, isImpersonating]);

  if (isLandingPage && !pendingResetToken) {
    return (
      <>
        <LandingPage
          onOpenSignup={() => setIsSignupOpen(true)}
          onEnterApp={() => setIsLandingPage(false)}
        />
        <SchoolSignupModal
          isOpen={isSignupOpen}
          onClose={() => setIsSignupOpen(false)}
          onSuccess={() => setIsLandingPage(false)}
        />
      </>
    );
  }

  if (!currentUser || pendingResetToken) {
    return (
      <>
        <LoginPage
          initialResetToken={pendingResetToken}
          onResetFlowCleared={handleClearResetToken}
          onOpenSignup={() => setIsSignupOpen(true)}
          onGoToLanding={() => {
            handleClearResetToken();
            setIsLandingPage(true);
          }}
          onSuccess={() => {
            handleClearResetToken();
            setIsLandingPage(false);
          }}
        />
        <SchoolSignupModal
          isOpen={isSignupOpen}
          onClose={() => setIsSignupOpen(false)}
          onSuccess={() => setIsLandingPage(false)}
        />
      </>
    );
  }

  const renderActiveModule = () => {
    const isPlatformOwner = currentUser?.role === 'PLATFORM_OWNER' && currentRole === 'PLATFORM_OWNER' && !isImpersonating;

    // School logins are strictly restricted to their respective portals
    if (activeModule.startsWith('platform_') && !isPlatformOwner) {
      if (currentRole === 'TEACHER') return <TeacherPortal onNavigate={(mod) => setActiveModule(mod)} />;
      if (currentRole === 'PARENT') return <ParentPortal onNavigate={(mod) => setActiveModule(mod)} />;
      if (currentRole === 'STUDENT') return <StudentPortal onNavigate={(mod) => setActiveModule(mod)} />;
      return <AdminDashboard onNavigate={(mod) => setActiveModule(mod)} onOpenSetupProfile={() => setIsSetupProfileOpen(true)} />;
    }

    switch (activeModule) {
      // Platform Owner
      case 'platform_dashboard':
      case 'platform_schools':
      case 'platform_plans':
      case 'platform_audits':
        return isPlatformOwner ? (
          <PlatformOwnerDashboard />
        ) : (
          <AdminDashboard
            onNavigate={(mod) => setActiveModule(mod)}
            onOpenSetupProfile={() => setIsSetupProfileOpen(true)}
          />
        );

      // School Admin & Root Modules
      case 'admin_dashboard':
        return (
          <AdminDashboard
            onNavigate={(mod) => setActiveModule(mod)}
            onOpenSetupProfile={() => setIsSetupProfileOpen(true)}
          />
        );
      case 'db_health':
        if (currentRole === 'TEACHER') return <TeacherPortal onNavigate={(mod) => setActiveModule(mod)} />;
        if (currentRole === 'PARENT') return <ParentPortal onNavigate={(mod) => setActiveModule(mod)} />;
        if (currentRole === 'STUDENT') return <StudentPortal onNavigate={(mod) => setActiveModule(mod)} />;
        return <DatabaseHealthDashboard />;
      case 'audit_logs':
        if (currentRole === 'TEACHER') return <TeacherPortal onNavigate={(mod) => setActiveModule(mod)} />;
        if (currentRole === 'PARENT') return <ParentPortal onNavigate={(mod) => setActiveModule(mod)} />;
        if (currentRole === 'STUDENT') return <StudentPortal onNavigate={(mod) => setActiveModule(mod)} />;
        return <AuditLogModule />;
      case 'saved_files':
        return <SavedFilesModule />;

      // Registry Submenu
      case 'students':
        return <StudentManagement />;
      case 'teachers':
        return <TeacherManagement />;
      case 'parents':
        return <ParentManagement />;
      case 'classes_subjects':
        return <ClassSubjectManagement />;
      case 'admissions':
        return <AdmissionsModule />;
      case 'book_records':
        return <BookRecordsModule />;
      case 'documents':
        return <DocumentsModule />;

      // Academics Submenu
      case 'marks_entry':
        return <MarksEntryModule />;
      case 'broadsheets':
        return <BroadsheetsModule />;
      case 'marksheet':
        return <MarksheetModule />;
      case 'exams_scores':
        return <ExamScoreEntry />;
      case 'formative':
        return <FormativeAssessments />;
      case 'contests':
        return <ContestsModule />;
      case 'elearning':
        return <ElearningModule />;
      case 'report_cards':
        return (
          <ReportCardModule
            onNavigateToNotifications={(examId) => {
              setNotificationExamId(examId);
              setActiveModule('notifications');
            }}
          />
        );

      // Operations & Logistics
      case 'attendance':
        return <AttendanceModule />;
      case 'timetable':
        return <TimetableModule />;
      case 'library':
        return <LibraryModule />;
      case 'transport':
        return <TransportModule />;
      case 'hostel':
        return <HostelModule />;
      case 'inventory':
        return <InventoryModule />;
      case 'gate_pass':
        return <GatePassModule />;
      case 'discipline':
        return <DisciplineModule />;

      // Finance & Bursar
      case 'fees':
        return <FeesModule />;
      case 'payroll':
      case 'teacher_leave_pay':
        return <PayrollModule />;
      case 'donations':
        return <DonationsModule />;

      // Communications
      case 'notifications':
        return <NotificationModule initialExamId={notificationExamId} />;
      case 'messages':
        return <MessagingModule />;
      case 'announcements':
        return <AnnouncementsModule />;

      // KJSEA
      case 'kjsea':
        return <Grade9KjseaModule />;

      // Dedicated Portals
      case 'teacher_portal':
        return <TeacherPortal onNavigate={(mod) => setActiveModule(mod)} />;
      case 'parent_portal':
        return <ParentPortal onNavigate={(mod) => setActiveModule(mod)} />;
      case 'student_portal':
        return <StudentPortal onNavigate={(mod) => setActiveModule(mod)} />;

      default:
        return (
          <AdminDashboard
            onNavigate={(mod) => setActiveModule(mod)}
            onOpenSetupProfile={() => setIsSetupProfileOpen(true)}
          />
        );
    }
  };

  return (
    <div
      className={`min-h-screen bg-slate-100/70 text-slate-800 flex relative ${
        viewMode === 'mobile'
          ? 'max-w-md mx-auto shadow-2xl border-x border-slate-300 bg-white'
          : ''
      }`}
    >
      {/* View Mode Indicator Banner when desktop user is previewing mobile view */}
      {viewMode === 'mobile' && (
        <div className="no-print fixed top-0 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-3 py-1 rounded-b-xl text-[11px] font-bold shadow-lg flex items-center gap-2">
          <span>📱 Mobile Phone Mode</span>
          <button
            onClick={() => setViewMode('windows')}
            className="text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
          >
            Switch to Windows View
          </button>
        </div>
      )}

      {/* Sidebar Navigation with Screenshot Hierarchy */}
      <Sidebar
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenSignup={() => setIsSignupOpen(true)}
          onOpenSetupProfile={() => setIsSetupProfileOpen(true)}
          activeModule={activeModule}
          setActiveModule={setActiveModule}
        />

        <main
          className={`flex-1 max-w-7xl w-full mx-auto ${
            effectiveIsMobile ? 'pb-28 px-2 sm:px-4' : 'pb-16 px-4 sm:px-6'
          }`}
        >
          {renderActiveModule()}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Shown on phone or mobile view mode) */}
      {effectiveIsMobile && (
        <div className="no-print">
          <MobileBottomNav
            activeModule={activeModule}
            setActiveModule={setActiveModule}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
        </div>
      )}

      {/* Floating Action Buttons as shown in user screenshots */}
      <div
        className={`no-print fixed right-3 sm:right-6 z-30 flex flex-col gap-3 transition-all ${
          effectiveIsMobile ? 'bottom-20' : 'bottom-6'
        }`}
      >
        {/* Top Button: Document / Saved Files / Broadsheets */}
        <button
          onClick={() => setActiveModule('saved_files')}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#48bb78] hover:bg-[#38a169] text-white flex items-center justify-center shadow-lg transition transform hover:scale-105 cursor-pointer"
          title="Saved Files & Reports"
        >
          <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Bottom Button: WhatsApp / Bulk Messaging */}
        <button
          onClick={() => setActiveModule('notifications')}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#48bb78] hover:bg-[#38a169] text-white flex items-center justify-center shadow-lg transition transform hover:scale-105 cursor-pointer"
          title="Bulk Messaging & WhatsApp Broadcast"
        >
          <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* School Signup Modal */}
      <SchoolSignupModal
        isOpen={isSignupOpen}
        onClose={() => setIsSignupOpen(false)}
        onSuccess={() => {}}
      />

      {/* First-Login School Admin Onboarding Setup Profile Modal */}
      <SetupProfileModal
        isOpen={isSetupProfileOpen || shouldPromptFirstLoginSetup}
        isFirstLogin={shouldPromptFirstLoginSetup}
        onClose={() => {
          setIsSetupProfileOpen(false);
          if (shouldPromptFirstLoginSetup && currentUser) {
            setSnoozedSetupUserId(currentUser.id);
          }
        }}
        onCompleted={() => {
          setIsSetupProfileOpen(false);
          setSnoozedSetupUserId(null);
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ViewModeProvider>
        <MainAppContent />
      </ViewModeProvider>
    </AuthProvider>
  );
}
