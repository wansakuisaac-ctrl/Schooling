import React from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  GraduationCap,
  Users,
  Menu,
} from 'lucide-react';

interface MobileBottomNavProps {
  activeModule: string;
  setActiveModule: (mod: string) => void;
  onOpenSidebar: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeModule,
  setActiveModule,
  onOpenSidebar,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
      {/* 1. Dashboard */}
      <button
        onClick={() => setActiveModule('admin_dashboard')}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer min-w-[56px] ${
          activeModule === 'admin_dashboard'
            ? 'text-emerald-700 font-bold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <LayoutDashboard className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] leading-tight">Dashboard</span>
      </button>

      {/* 2. Marks Entry */}
      <button
        onClick={() => setActiveModule('marks_entry')}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer min-w-[56px] relative ${
          activeModule === 'marks_entry'
            ? 'text-emerald-700 font-bold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <FileSpreadsheet className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] leading-tight">Marks</span>
        {activeModule === 'marks_entry' && (
          <span className="absolute -top-0.5 right-2 w-1.5 h-1.5 bg-emerald-600 rounded-full" />
        )}
      </button>

      {/* 3. Marksheet / Broadsheets */}
      <button
        onClick={() => setActiveModule('marksheet')}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer min-w-[56px] ${
          activeModule === 'marksheet' || activeModule === 'broadsheets'
            ? 'text-emerald-700 font-bold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <GraduationCap className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] leading-tight">Academics</span>
      </button>

      {/* 4. Learners / Registry */}
      <button
        onClick={() => setActiveModule('students')}
        className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer min-w-[56px] ${
          activeModule === 'students' || activeModule === 'admissions'
            ? 'text-emerald-700 font-bold'
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        <Users className="w-5 h-5 mb-0.5" />
        <span className="text-[10px] leading-tight">Registry</span>
      </button>

      {/* 5. Mobile Drawer Menu */}
      <button
        onClick={onOpenSidebar}
        className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 transition cursor-pointer min-w-[56px]"
      >
        <Menu className="w-5 h-5 mb-0.5 text-slate-800" />
        <span className="text-[10px] leading-tight font-bold text-slate-800">Menu</span>
      </button>
    </nav>
  );
};
