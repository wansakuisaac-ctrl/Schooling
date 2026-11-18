import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useViewMode } from '../../context/ViewModeContext';
import { dbService } from '../../services/storage';
import { Student, StudentType, StudentStatus, PathwayPreference } from '../../types';
import { ExcelExportService } from '../../services/excelExport';
import { exportStudentsCsv, exportStudentsPdf } from '../../lib/export';
import {
  GraduationCap,
  Search,
  Filter,
  Plus,
  Download,
  Upload,
  UserCheck,
  Edit2,
  Trash2,
  Eye,
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Building,
  Smartphone,
  Monitor,
  User,
  Printer,
  CreditCard,
  QrCode,
  ShieldCheck,
  ChevronDown,
  FileText,
} from 'lucide-react';

export const StudentManagement: React.FC = () => {
  const { currentSchool } = useAuth();
  const { effectiveIsMobile } = useViewMode();
  if (!currentSchool) return null;
  const schoolId = currentSchool.id;

  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [layoutMode, setLayoutMode] = useState<'cards' | 'table' | 'auto'>('auto');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingProfileStudent, setViewingProfileStudent] = useState<Student | null>(null);
  const [profileActiveTab, setProfileActiveTab] = useState<'overview' | 'results' | 'fees' | 'attendance' | 'discipline'>('overview');
  
  // Student ID Badges & Gate Passes State
  const [isIdCardModalOpen, setIsIdCardModalOpen] = useState(false);
  const [idCardSelectedStudentId, setIdCardSelectedStudentId] = useState<string>('all');
  const [idCardClassFilter, setIdCardClassFilter] = useState<string>('');

  const showCards = layoutMode === 'cards' || (layoutMode === 'auto' && effectiveIsMobile);

  const levels = dbService.getLevels(schoolId);
  const classes = dbService.getClasses(schoolId);
  const parents = dbService.getParents(schoolId);

  // Form State
  const [formData, setFormData] = useState({
    admission_number: '',
    full_name: '',
    level_id: levels[0]?.id || '',
    class_id: classes[0]?.id || '',
    parent_user_id: '',
    dob: '2016-01-01',
    gender: 'male' as 'male' | 'female',
    student_type: 'day' as StudentType,
    photo_url: '',
    kpsea_score: 80,
    sba_score: 80,
    pathway_preference: 'STEM' as PathwayPreference,
    status: 'active' as StudentStatus,
  });

  const students = dbService.getStudents(schoolId, {
    search: search.trim(),
    levelId: levelFilter || undefined,
    classId: classFilter || undefined,
    type: typeFilter || undefined,
    status: statusFilter || undefined,
  });

  const handleAutoGenerateAdmission = () => {
    const slug = currentSchool.slug.slice(0, 3).toUpperCase();
    const year = currentSchool.academic_year;
    const seq = String(dbService.getStudents(schoolId).length + 1).padStart(3, '0');
    setFormData((prev) => ({
      ...prev,
      admission_number: `${slug}/${year}/${seq}`,
    }));
  };

  const handleOpenCreate = () => {
    setEditingStudent(null);
    const initialLvl = levels[0]?.id || '';
    const initialClasses = classes.filter((c) => c.level_id === initialLvl);
    setFormData({
      admission_number: '',
      full_name: '',
      level_id: initialLvl,
      class_id: initialClasses[0]?.id || '',
      parent_user_id: parents[0]?.user_id || '',
      dob: '2015-05-12',
      gender: 'male',
      student_type: 'day',
      photo_url: '',
      kpsea_score: 75,
      sba_score: 78,
      pathway_preference: 'STEM',
      status: 'active',
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      admission_number: student.admission_number,
      full_name: student.full_name,
      level_id: student.level_id,
      class_id: student.class_id,
      parent_user_id: student.parent_user_id || '',
      dob: student.dob,
      gender: student.gender as 'male' | 'female',
      student_type: student.student_type,
      photo_url: student.photo_url || '',
      kpsea_score: student.kpsea_score || 0,
      sba_score: student.sba_score || 0,
      pathway_preference: student.pathway_preference || 'STEM',
      status: student.status,
    });
    setIsCreateModalOpen(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name || !formData.admission_number || !formData.class_id) {
      alert('Please fill out all mandatory fields.');
      return;
    }

    if (editingStudent) {
      dbService.updateStudent(schoolId, editingStudent.id, {
        ...formData,
        kpsea_score: Number(formData.kpsea_score),
        sba_score: Number(formData.sba_score),
      });
    } else {
      dbService.createStudent(schoolId, {
        ...formData,
        kpsea_score: Number(formData.kpsea_score),
        sba_score: Number(formData.sba_score),
      });
    }

    setIsCreateModalOpen(false);
  };

  const handleSoftDelete = (studentId: string) => {
    if (confirm('Are you sure you want to set this learner to inactive (soft delete)? All academic history remains audited.')) {
      dbService.softDeleteStudent(schoolId, studentId);
    }
  };

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  const filterSummary = useMemo(() => {
    const parts: string[] = [];
    if (search.trim()) parts.push(`"${search.trim()}"`);
    if (levelFilter) {
      const lvl = levels.find((l) => l.id === levelFilter);
      if (lvl) parts.push(lvl.name);
    }
    if (classFilter) {
      const cls = classes.find((c) => c.id === classFilter);
      if (cls) parts.push(`${cls.name} ${cls.stream}`);
    }
    if (typeFilter) parts.push(typeFilter === 'day' ? 'Day Scholars' : 'Boarders');
    if (statusFilter) parts.push(statusFilter === 'active' ? 'Active' : 'Inactive');
    return parts.length > 0 ? parts.join(' • ') : 'All Enrolled Learners';
  }, [search, levelFilter, classFilter, typeFilter, statusFilter, levels, classes]);

  const handleExportCsv = () => {
    exportStudentsCsv(students, classes, levels, filterSummary);
    setIsExportOpen(false);
    setExportSuccessMsg(`Successfully exported ${students.length} filtered learners to CSV.`);
    setTimeout(() => setExportSuccessMsg(null), 4000);
  };

  const handleExportPdf = () => {
    if (students.length === 0) return;
    exportStudentsPdf(currentSchool, students, classes, levels, filterSummary);
    setIsExportOpen(false);
    setExportSuccessMsg(
      `Successfully generated official PDF register for ${students.length} filtered learners.`
    );
    setTimeout(() => setExportSuccessMsg(null), 4000);
  };

  const handleExportExcel = () => {
    ExcelExportService.exportStudents(students, classes, levels);
    setIsExportOpen(false);
    setExportSuccessMsg(`Exported ${students.length} learners to Excel workbook.`);
    setTimeout(() => setExportSuccessMsg(null), 4000);
  };

  const selectedLevel = levels.find((l) => l.id === formData.level_id);
  const isGrade9 = selectedLevel?.name === 'Grade 9';
  const availableClassesForLevel = classes.filter((c) => c.level_id === formData.level_id);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
              <GraduationCap className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Learners Directory</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Official CBC student registry, PP1 to Grade 9 enrollments, day/boarding types & parent linkages
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Card / Table Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setLayoutMode('cards')}
              className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 font-bold transition min-h-[36px] ${
                showCards
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Card View (Mobile friendly)"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('table')}
              className={`px-2.5 py-1.5 rounded-md flex items-center gap-1.5 font-bold transition min-h-[36px] ${
                !showCards
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Table View (Desktop spreadsheet)"
            >
              <Monitor className="w-3.5 h-3.5 text-slate-600" />
              <span>Table</span>
            </button>
          </div>

          {/* Direct Export All (Filtered PDF) */}
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={students.length === 0}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 min-h-[36px] cursor-pointer"
            title="Download full current filtered list as a formatted PDF register"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Export All</span>
          </button>

          {/* Bulk Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsExportOpen(!isExportOpen)}
              className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-xs min-h-[36px] whitespace-nowrap shrink-0 cursor-pointer"
              title="Bulk Export filtered view directly to CSV or PDF"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span>Bulk Export</span>
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-mono font-bold">
                {students.length}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isExportOpen ? 'rotate-180' : ''}`} />
            </button>

            {isExportOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsExportOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 z-30 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 w-64 text-xs animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Export Filtered View ({students.length})
                    </div>
                    <div className="text-[11px] font-semibold text-slate-700 truncate mt-0.5" title={filterSummary}>
                      {filterSummary}
                    </div>
                  </div>

                  <button
                    onClick={handleExportCsv}
                    className="w-full text-left px-3 py-2.5 hover:bg-emerald-50 text-slate-800 font-semibold flex items-center gap-2.5 transition min-h-[40px]"
                  >
                    <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                      <FileSpreadsheet className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">Export to CSV</div>
                      <div className="text-[10px] text-slate-500 font-normal">Excel, Sheets &amp; NEMIS compatible</div>
                    </div>
                  </button>

                  <button
                    onClick={handleExportPdf}
                    className="w-full text-left px-3 py-2.5 hover:bg-emerald-50 text-slate-800 font-semibold flex items-center gap-2.5 transition min-h-[40px]"
                  >
                    <span className="p-1.5 rounded-lg bg-rose-100 text-rose-800">
                      <FileText className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">Export to PDF Register</div>
                      <div className="text-[10px] text-slate-500 font-normal">Official branded landscape document</div>
                    </div>
                  </button>

                  <button
                    onClick={handleExportExcel}
                    className="w-full text-left px-3 py-2.5 hover:bg-emerald-50 text-slate-800 font-semibold flex items-center gap-2.5 transition min-h-[40px] border-t border-slate-100"
                  >
                    <span className="p-1.5 rounded-lg bg-blue-100 text-blue-800">
                      <Download className="w-4 h-4" />
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">Export to Excel (.xlsx)</div>
                      <div className="text-[10px] text-slate-500 font-normal">Native workbook format</div>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => {
              setIdCardSelectedStudentId('all');
              setIsIdCardModalOpen(true);
            }}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-xs min-h-[36px]"
            title="Generate & Print Student ID Badges / Gate Passes"
          >
            <CreditCard className="w-4 h-4 text-emerald-700" />
            <span className="hidden sm:inline">Student ID Cards</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-xs min-h-[36px]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Learner</span>
          </button>
        </div>
      </div>

      {exportSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between gap-2 shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{exportSuccessMsg}</span>
          </div>
          <button
            onClick={() => setExportSuccessMsg(null)}
            className="p-1 hover:bg-emerald-100 rounded text-emerald-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filters & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search learner name or admission no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[38px]"
        >
          <option value="">All CBC Levels</option>
          {levels.map((lvl) => (
            <option key={lvl.id} value={lvl.id}>
              {lvl.name}
            </option>
          ))}
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[38px]"
        >
          <option value="">All Student Types</option>
          <option value="day">Day Scholar</option>
          <option value="boarding">Boarding</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[38px]"
        >
          <option value="">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive / Soft Deleted</option>
        </select>
      </div>

      {/* Total Count Strip */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>Showing <strong className="text-slate-800 font-bold">{students.length}</strong> enrolled learners</span>
        {effectiveIsMobile && (
          <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            📱 Mobile Card Mode
          </span>
        )}
      </div>

      {/* Students Presentation: Cards on Mobile or When Selected, Table on Desktop */}
      {showCards ? (
        <div className="space-y-3">
          {students.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
              No learners match the specified search or filter criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {students.map((std) => {
                const lvl = levels.find((l) => l.id === std.level_id);
                const cls = classes.find((c) => c.id === std.class_id);

                return (
                  <div
                    key={std.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col justify-between hover:shadow-md transition gap-3"
                  >
                    <div>
                      {/* Top Bar: Avatar, Name & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-black flex items-center justify-center text-sm shadow-xs shrink-0">
                            {std.full_name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-sm text-slate-900 truncate">{std.full_name}</h3>
                            <div className="font-mono text-xs font-semibold text-emerald-800">
                              {std.admission_number}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                            std.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {std.status}
                        </span>
                      </div>

                      {/* Badges & Meta */}
                      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                        <span className="px-2 py-1 bg-slate-100 text-slate-800 rounded-md font-semibold">
                          {lvl?.name} ({cls?.stream || 'Main'})
                        </span>
                        <span
                          className={`px-2 py-1 rounded-md font-bold uppercase ${
                            std.student_type === 'boarding'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {std.student_type}
                        </span>
                        <span className="px-2 py-1 bg-slate-50 text-slate-600 rounded-md capitalize border border-slate-200">
                          {std.gender}
                        </span>
                      </div>

                      {/* Grade 9 KJSEA Pathway if applicable */}
                      {lvl?.name === 'Grade 9' && (
                        <div className="mt-2.5 p-2 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center justify-between text-xs">
                          <span className="text-emerald-900 font-bold">
                            Senior Pathway: {std.pathway_preference || 'STEM'}
                          </span>
                          {std.placement_score && (
                            <span className="text-[11px] text-emerald-700 font-semibold">
                              CBA: {std.placement_score} pts
                            </span>
                          )}
                        </div>
                      )}

                      <div className="mt-2 text-[11px] text-slate-400">
                        DOB: {std.dob}
                      </div>
                    </div>

                    {/* Touch Action Buttons (min 44px height for mobile ergonomics) */}
                    <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setViewingProfileStudent(std);
                          setProfileActiveTab('overview');
                        }}
                        className="flex-1 min-h-[44px] px-3 py-2 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-4 h-4" />
                        <span>360° Profile</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(std)}
                        className="min-h-[44px] min-w-[44px] px-3 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center"
                        title="Edit Details"
                      >
                        <Edit2 className="w-4 h-4 text-blue-600" />
                      </button>

                      {std.status === 'active' && (
                        <button
                          type="button"
                          onClick={() => handleSoftDelete(std.id)}
                          className="min-h-[44px] min-w-[44px] px-3 py-2 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 rounded-xl text-xs font-bold transition flex items-center justify-center"
                          title="Soft Delete (Archive)"
                        >
                          <Trash2 className="w-4 h-4 text-rose-600" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Students Table */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <th className="py-3 px-4 font-bold">Admission No</th>
                  <th className="py-3 px-4 font-bold">Learner Name</th>
                  <th className="py-3 px-4 font-bold">Level & Stream</th>
                  <th className="py-3 px-4 font-bold">Type</th>
                  <th className="py-3 px-4 font-bold">Gender</th>
                  <th className="py-3 px-4 font-bold">Pathway / CBA</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No learners match the specified search or filter criteria.
                    </td>
                  </tr>
                ) : (
                  students.map((std) => {
                    const lvl = levels.find((l) => l.id === std.level_id);
                    const cls = classes.find((c) => c.id === std.class_id);

                    return (
                      <tr key={std.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {std.admission_number}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{std.full_name}</div>
                          <div className="text-[11px] text-slate-400">DOB: {std.dob}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800">{lvl?.name}</span>
                          <span className="text-slate-500 ml-1.5 font-normal">
                            ({cls?.stream || 'Main'})
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              std.student_type === 'boarding'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {std.student_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 capitalize">{std.gender}</td>
                        <td className="py-3 px-4">
                          {lvl?.name === 'Grade 9' ? (
                            <div className="text-[11px]">
                              <span className="font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                                {std.pathway_preference || 'STEM'}
                              </span>
                              {std.placement_score && (
                                <span className="text-slate-500 ml-1">
                                  Score: {std.placement_score}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              std.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {std.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setViewingProfileStudent(std);
                                setProfileActiveTab('overview');
                              }}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-emerald-700 rounded transition"
                              title="View Full 360° Profile"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(std)}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded transition"
                              title="Edit Details"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {std.status === 'active' && (
                              <button
                                onClick={() => handleSoftDelete(std.id)}
                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition"
                                title="Soft Delete (Archive)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Student Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-emerald-400" />
                {editingStudent ? 'Edit Learner Profile' : 'Enroll New CBC Learner'}
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Admission Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      required
                      value={formData.admission_number}
                      onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })}
                      placeholder="e.g. KJA/2026/055"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleAutoGenerateAdmission}
                      className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold shrink-0 transition"
                      title="Auto Generate Admission No"
                    >
                      Auto
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Learner Official Name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    School Level (PP1 – Grade 9) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.level_id}
                    onChange={(e) => {
                      const newLevelId = e.target.value;
                      const validCls = classes.filter((c) => c.level_id === newLevelId);
                      setFormData({
                        ...formData,
                        level_id: newLevelId,
                        class_id: validCls[0]?.id || '',
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {levels.map((lvl) => (
                      <option key={lvl.id} value={lvl.id}>
                        {lvl.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Assigned Class & Stream <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.class_id}
                    onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {availableClassesForLevel.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} - {c.stream}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Student Type (Day / Boarding)
                  </label>
                  <select
                    value={formData.student_type}
                    onChange={(e) => setFormData({ ...formData, student_type: e.target.value as StudentType })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="day">Day Scholar (Lunch & Transport)</option>
                    <option value="boarding">Boarding (Full Hostel Allocation)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Linked Parent</label>
                  <select
                    value={formData.parent_user_id}
                    onChange={(e) => setFormData({ ...formData, parent_user_id: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">No linked parent account</option>
                    {parents.map((p) => (
                      <option key={p.id} value={p.user_id}>
                        {p.user.full_name} ({p.relationship})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Grade 9 KJSEA Special Fields */}
              {isGrade9 && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
                  <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    Grade 9 KJSEA National Assessment Parameters
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        KPSEA Grade 6 Score (0–100)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.kpsea_score}
                        onChange={(e) => setFormData({ ...formData, kpsea_score: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        SBA Grade 7–8 Score (0–100)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.sba_score}
                        onChange={(e) => setFormData({ ...formData, sba_score: Number(e.target.value) })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Senior School Pathway
                      </label>
                      <select
                        value={formData.pathway_preference}
                        onChange={(e) => setFormData({ ...formData, pathway_preference: e.target.value as PathwayPreference })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                      >
                        <option value="STEM">STEM (Pure & Applied)</option>
                        <option value="SocialSciences">Social Sciences & Humanities</option>
                        <option value="Arts">Arts & Creative Music</option>
                        <option value="Sports">Sports Science & Athletics</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
                >
                  {editingStudent ? 'Save Changes' : 'Enroll Learner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 360° Learner Profile Drawer / Modal */}
      {viewingProfileStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
            {/* Drawer Header */}
            <div className="bg-emerald-900 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-lg font-black border border-white/20">
                  {viewingProfileStudent.full_name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-base">{viewingProfileStudent.full_name}</h3>
                  <div className="text-xs text-emerald-200 flex items-center gap-2">
                    <span>Adm: {viewingProfileStudent.admission_number}</span>
                    <span>•</span>
                    <span className="capitalize">{viewingProfileStudent.student_type} Scholar</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewingProfileStudent(null)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Tab Selector */}
            <div className="bg-slate-100 border-b border-slate-200 px-5 flex items-center gap-2 overflow-x-auto shrink-0 text-xs font-semibold py-2">
              {(['overview', 'results', 'fees', 'attendance', 'discipline'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setProfileActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition ${
                    profileActiveTab === tab
                      ? 'bg-white text-emerald-800 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="p-6 overflow-y-auto flex-1 text-xs space-y-4">
              {profileActiveTab === 'overview' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-slate-400 font-medium">Full Name</span>
                    <div className="font-bold text-slate-800 text-sm">{viewingProfileStudent.full_name}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-slate-400 font-medium">Admission Number</span>
                    <div className="font-bold text-slate-800 text-sm font-mono">{viewingProfileStudent.admission_number}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-slate-400 font-medium">Date of Birth & Gender</span>
                    <div className="font-bold text-slate-800 text-sm">{viewingProfileStudent.dob} ({viewingProfileStudent.gender})</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <span className="text-slate-400 font-medium">Class / Stream</span>
                    <div className="font-bold text-slate-800 text-sm">
                      {classes.find((c) => c.id === viewingProfileStudent.class_id)?.name} -{' '}
                      {classes.find((c) => c.id === viewingProfileStudent.class_id)?.stream}
                    </div>
                  </div>
                </div>
              )}

              {profileActiveTab === 'results' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800">CBC Summative Grades</h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="p-2 font-bold">Subject</th>
                          <th className="p-2 font-bold">Score</th>
                          <th className="p-2 font-bold">Rubric</th>
                          <th className="p-2 font-bold">Teacher Comment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {dbService.getStudentGrades(schoolId, viewingProfileStudent.id).map((g) => (
                          <tr key={g.id}>
                            <td className="p-2 font-medium">
                              {dbService.getSubjects(schoolId).find((s) => s.id === g.subject_id)?.name || 'Subject'}
                            </td>
                            <td className="p-2 font-bold">{g.marks !== null ? `${g.marks}%` : 'Rubric'}</td>
                            <td className="p-2 font-bold text-emerald-700">{g.rubric_level} ({g.points} pts)</td>
                            <td className="p-2 text-slate-600">{g.teacher_comment}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {profileActiveTab === 'fees' && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800">Invoices & Term Fees</h4>
                  {dbService.getInvoices(schoolId, viewingProfileStudent.id).map((inv) => (
                    <div key={inv.id} className="p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{inv.invoice_number}</div>
                        <div className="text-slate-500">Billed: KES {inv.amount_due.toLocaleString()} | Paid: KES {inv.amount_paid.toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-rose-700">Bal: KES {inv.balance.toLocaleString()}</span>
                        <div className="text-[10px] uppercase font-bold text-emerald-700">{inv.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {profileActiveTab === 'attendance' && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800">Recent Attendance</h4>
                  {dbService.getStudentAttendance(schoolId, viewingProfileStudent.id).map((att) => (
                    <div key={att.id} className="p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
                      <span>{att.date}</span>
                      <span className="font-bold uppercase text-emerald-800">{att.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {profileActiveTab === 'discipline' && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800">Discipline Log</h4>
                  {dbService.getDisciplineLogs(schoolId, viewingProfileStudent.id).map((d) => (
                    <div key={d.id} className="p-2.5 rounded-lg border border-slate-200">
                      <div className="font-bold text-slate-800">{d.category.toUpperCase()}: {d.description}</div>
                      <div className="text-slate-500 mt-1">Action: {d.action_taken} ({d.incident_date})</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIdCardSelectedStudentId(viewingProfileStudent.id);
                  setIsIdCardModalOpen(true);
                }}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition"
              >
                <CreditCard className="w-4 h-4 text-emerald-700" />
                <span>Print Student ID Card</span>
              </button>
              <button
                onClick={() => setViewingProfileStudent(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student ID Badges & Gate Passes Generator Modal */}
      {isIdCardModalOpen && (() => {
        // Compute targeted students
        let targetStudents = students;
        if (idCardClassFilter) {
          targetStudents = targetStudents.filter((s) => s.class_id === idCardClassFilter);
        }
        if (idCardSelectedStudentId !== 'all') {
          targetStudents = targetStudents.filter((s) => s.id === idCardSelectedStudentId);
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
            {/* Print stylesheet for ID cards */}
            <style>{`
              @media print {
                body {
                  background: white !important;
                }
                .no-print, nav, header, aside, button, .modal-backdrop {
                  display: none !important;
                }
                .printable-id-badges-sheet {
                  display: grid !important;
                  grid-template-columns: repeat(2, 86mm) !important;
                  gap: 8mm 6mm !important;
                  padding: 10mm !important;
                  margin: 0 auto !important;
                  background: white !important;
                }
                .id-card-print-item {
                  page-break-inside: avoid !important;
                  border: 1px dashed #94a3b8 !important;
                  border-radius: 4mm !important;
                  overflow: hidden !important;
                }
              }
            `}</style>

            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 p-5 sm:p-6 space-y-4 my-auto max-h-[92vh] flex flex-col">
              {/* Header */}
              <div className="no-print flex items-start justify-between border-b border-slate-200 pb-3">
                <div>
                  <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-0.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Official CBC Student Identity Cards</span>
                  </div>
                  <h3 className="font-extrabold text-lg sm:text-xl text-slate-900">
                    Student ID Badges &amp; Gate Passes
                  </h3>
                  <p className="text-xs text-slate-500">
                    CR80 Standard PVC Badge Layout with Ministry CBC level, photo, UPI and emergency return contacts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsIdCardModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Filter Controls */}
              <div className="no-print bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Stream Filter
                    </label>
                    <select
                      value={idCardClassFilter}
                      onChange={(e) => {
                        setIdCardClassFilter(e.target.value);
                        setIdCardSelectedStudentId('all');
                      }}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                    >
                      <option value="">All Streams ({students.length} Learners)</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.stream}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Learner Target
                    </label>
                    <select
                      value={idCardSelectedStudentId}
                      onChange={(e) => setIdCardSelectedStudentId(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 max-w-[200px]"
                    >
                      <option value="all">Print All ({targetStudents.length} Badges)</option>
                      {targetStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name} ({s.admission_number})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">
                    {targetStudents.length} Badges Ready
                  </span>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Badges (A4 Sheet)</span>
                  </button>
                </div>
              </div>

              {/* Badges Preview Area */}
              <div className="flex-1 overflow-y-auto p-2 bg-slate-100 rounded-xl border border-slate-200">
                <div className="printable-id-badges-sheet grid grid-cols-1 md:grid-cols-2 gap-4">
                  {targetStudents.length === 0 ? (
                    <div className="col-span-2 text-center py-12 text-slate-400 text-xs font-medium">
                      No learners match the selected stream filter.
                    </div>
                  ) : (
                    targetStudents.map((stud) => {
                      const c = classes.find((cl) => cl.id === stud.class_id);
                      const lvl = levels.find((l) => l.id === stud.level_id);
                      const prt = parents.find(
                        (p) => p.user_id === stud.parent_user_id || p.id === stud.parent_user_id
                      );
                      const upi = `UPI-${stud.admission_number.replace(/\D/g, '').padEnd(4, '0').slice(0, 4)}-K`;

                      return (
                        <div key={stud.id} className="id-card-print-item space-y-3 p-1">
                          {/* FRONT OF BADGE */}
                          <div className="w-full max-w-[360px] mx-auto bg-white rounded-2xl border-2 border-slate-300 shadow-md overflow-hidden flex flex-col justify-between">
                            {/* Card Top Banner */}
                            <div className="bg-[#1b4332] text-white px-3.5 py-2.5 flex items-center justify-between border-b-2 border-amber-400">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-amber-400 text-[#1b4332] font-black flex items-center justify-center text-xs shadow-xs">
                                  EC
                                </div>
                                <div>
                                  <div className="text-[11px] font-black uppercase tracking-wider leading-tight">
                                    {currentSchool.name}
                                  </div>
                                  <div className="text-[9px] text-emerald-200 uppercase font-semibold">
                                    Official Student Identity Card
                                  </div>
                                </div>
                              </div>
                              <span className="text-[9px] font-bold bg-amber-400 text-slate-900 px-1.5 py-0.5 rounded uppercase">
                                CBC
                              </span>
                            </div>

                            {/* Card Content Body */}
                            <div className="p-3 flex items-center gap-3">
                              {/* Photo / Avatar */}
                              <div className="w-20 h-24 rounded-xl bg-gradient-to-b from-slate-100 to-slate-200 border-2 border-slate-300 flex flex-col items-center justify-center shrink-0 shadow-inner overflow-hidden">
                                {stud.photo_url ? (
                                  <img
                                    src={stud.photo_url}
                                    alt={stud.full_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="text-center">
                                    <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-black text-sm flex items-center justify-center mx-auto mb-1">
                                      {stud.full_name.charAt(0)}
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-500 uppercase">
                                      {stud.gender}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Student Biodata */}
                              <div className="min-w-0 flex-1 space-y-1 text-xs">
                                <div>
                                  <div className="text-[13px] font-black text-slate-900 leading-tight truncate uppercase">
                                    {stud.full_name}
                                  </div>
                                  <div className="text-[10px] font-mono font-bold text-emerald-700">
                                    Adm: {stud.admission_number}
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-600 pt-0.5 border-t border-slate-100">
                                  <div>
                                    <span className="font-bold text-slate-400">Class:</span>{' '}
                                    <span className="font-semibold text-slate-800">
                                      {c ? `${c.name} ${c.stream}` : lvl?.name || 'CBC'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-bold text-slate-400">NEMIS:</span>{' '}
                                    <span className="font-mono font-bold text-slate-800">{upi}</span>
                                  </div>
                                  <div>
                                    <span className="font-bold text-slate-400">Type:</span>{' '}
                                    <span className="capitalize font-semibold text-slate-800">
                                      {stud.student_type}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-bold text-slate-400">Valid:</span>{' '}
                                    <span className="font-bold text-emerald-700">2026/2027</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Barcode Strip */}
                            <div className="bg-slate-50 px-3 py-1.5 border-t border-slate-200 flex items-center justify-between text-[9px]">
                              <div className="flex items-center gap-0.5 tracking-widest font-mono text-slate-700 select-none">
                                ||||| | |||| ||| |||| | ||||| ||| |||| |
                              </div>
                              <span className="font-mono font-bold text-slate-500">
                                {stud.admission_number}
                              </span>
                            </div>
                          </div>

                          {/* BACK OF BADGE */}
                          <div className="w-full max-w-[360px] mx-auto bg-white rounded-2xl border-2 border-slate-300 shadow-md p-3 text-[10px] space-y-2 flex flex-col justify-between">
                            <div className="space-y-1 text-slate-700">
                              <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
                                <span>EMERGENCY CONTACTS</span>
                                <span className="text-[9px] px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded font-black">
                                  Blood: O+
                                </span>
                              </div>
                              <div>
                                <span className="font-bold text-slate-500">Parent / Guardian:</span>{' '}
                                <span className="font-semibold text-slate-900">
                                  {prt?.user?.full_name || 'Designated Guardian'}
                                </span>
                              </div>
                              <div>
                                <span className="font-bold text-slate-500">Emergency Phone:</span>{' '}
                                <span className="font-mono font-bold text-emerald-700">
                                  {prt?.user?.phone || (prt as any)?.phone || currentSchool.phone}
                                </span>
                              </div>
                            </div>

                            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-[9px] text-slate-500 leading-tight italic">
                              "This identity badge is property of {currentSchool.name}. If found, please return to the school administration at {currentSchool.address} or call {currentSchool.phone}."
                            </div>

                            <div className="pt-1 flex items-end justify-between border-t border-slate-200 text-[9px]">
                              <div>
                                <div className="font-bold text-slate-600">Principal's Signature:</div>
                                <div className="border-b border-slate-400 w-24 my-0.5"></div>
                                <div className="text-[8px] text-slate-400">Authorized Signature &amp; Stamp</div>
                              </div>
                              <div className="text-right font-mono text-[9px] text-slate-400">
                                Serial: {stud.id.slice(0, 8).toUpperCase()}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="no-print pt-2 flex items-center justify-between border-t border-slate-200">
                <span className="text-xs text-slate-500">
                  Tip: Print on heavy card stock (160–250 gsm) or laminate for durable student ID cards.
                </span>
                <button
                  type="button"
                  onClick={() => setIsIdCardModalOpen(false)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
