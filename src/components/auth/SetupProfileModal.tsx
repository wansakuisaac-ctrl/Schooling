import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  GraduationCap,
  Layers,
  Plus,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { dbService } from '../../services/storage';
import { LEVEL_NAMES } from '../../services/seedData';

interface SetupProfileModalProps {
  isOpen: boolean;
  isFirstLogin?: boolean;
  onClose: () => void;
  onCompleted?: () => void;
}

const STAGE_PRESETS: Array<{ label: string; levels: string[] }> = [
  {
    label: 'Full CBC (PP1–Grade 9)',
    levels: [...LEVEL_NAMES],
  },
  {
    label: 'Early Years (PP1–PP2)',
    levels: ['PP1', 'PP2'],
  },
  {
    label: 'Primary (Grade 1–6)',
    levels: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'],
  },
  {
    label: 'Junior Secondary (Grade 7–9)',
    levels: ['Grade 7', 'Grade 8', 'Grade 9'],
  },
];

const TERMS = ['Term 1', 'Term 2', 'Term 3'] as const;

export const SetupProfileModal: React.FC<SetupProfileModalProps> = ({
  isOpen,
  isFirstLogin = false,
  onClose,
  onCompleted,
}) => {
  const { currentSchool, currentUser, completeProfileSetup } = useAuth();

  const currentCalendarYear = new Date().getFullYear();
  const quickYears = useMemo(
    () => [currentCalendarYear - 1, currentCalendarYear, currentCalendarYear + 1],
    [currentCalendarYear]
  );

  const [schoolName, setSchoolName] = useState('');
  const [academicYear, setAcademicYear] = useState<number>(currentCalendarYear);
  const [currentTerm, setCurrentTerm] = useState<string>('Term 1');
  const [selectedLevels, setSelectedLevels] = useState<string[]>([...LEVEL_NAMES]);
  const [customLevelInput, setCustomLevelInput] = useState('');
  const [defaultStream, setDefaultStream] = useState('East');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Sync form defaults whenever modal opens for the active school
  useEffect(() => {
    if (!isOpen || !currentSchool) return;
    const existingLevels = dbService.getLevels(currentSchool.id).map((l) => l.name);
    const existingClasses = dbService.getClasses(currentSchool.id);

    setSchoolName(currentSchool.name || '');
    setAcademicYear(currentSchool.academic_year || currentCalendarYear);
    setCurrentTerm(currentSchool.current_term || 'Term 1');
    setSelectedLevels(existingLevels.length > 0 ? existingLevels : [...LEVEL_NAMES]);
    setDefaultStream(existingClasses[0]?.stream || 'East');
    setCustomLevelInput('');
    setError(null);
  }, [isOpen, currentSchool?.id, currentCalendarYear]);

  const availableLevels = useMemo(() => {
    const merged = [...LEVEL_NAMES];
    selectedLevels.forEach((lvl) => {
      if (!merged.some((m) => m.toLowerCase() === lvl.toLowerCase())) {
        merged.push(lvl);
      }
    });
    return merged;
  }, [selectedLevels]);

  if (!isOpen || !currentSchool) return null;

  const toggleLevel = (levelName: string) => {
    setError(null);
    setSelectedLevels((prev) => {
      const exists = prev.some((l) => l.toLowerCase() === levelName.toLowerCase());
      if (exists) {
        return prev.filter((l) => l.toLowerCase() !== levelName.toLowerCase());
      }
      return [...prev, levelName];
    });
  };

  const applyPreset = (levels: string[]) => {
    setError(null);
    setSelectedLevels([...levels]);
  };

  const handleAddCustomLevel = () => {
    const trimmed = customLevelInput.trim();
    if (!trimmed) return;
    setError(null);
    if (!selectedLevels.some((l) => l.toLowerCase() === trimmed.toLowerCase())) {
      setSelectedLevels((prev) => [...prev, trimmed]);
    }
    setCustomLevelInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!schoolName.trim() || schoolName.trim().length < 3) {
      setError('Please enter an official school name (minimum 3 characters).');
      return;
    }

    if (!Number.isInteger(Number(academicYear)) || Number(academicYear) < 2020 || Number(academicYear) > 2035) {
      setError('Please provide a valid academic year between 2020 and 2035.');
      return;
    }

    if (selectedLevels.length === 0) {
      setError('Please select at least one initial grade level for your institution.');
      return;
    }

    setSaving(true);
    try {
      await completeProfileSetup({
        schoolName: schoolName.trim(),
        academicYear: Number(academicYear),
        currentTerm,
        gradeLevels: selectedLevels,
        defaultStream: defaultStream.trim() || 'East',
      });
      onCompleted?.();
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to save school profile setup.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="setup-profile-title"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-medium text-emerald-300">
              {isFirstLogin
                ? `Welcome, ${currentUser?.full_name || 'School Administrator'} · First Login Onboarding`
                : 'Institutional Configuration'}
            </div>
            <h2
              id="setup-profile-title"
              className="text-xl font-bold tracking-tight text-white"
            >
              Setup Profile
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              Define your official school name, active academic year, and initial grade levels to initialize your classes and curriculum subjects.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Complete later"
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. School Name */}
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="setup-school-name"
                className="text-xs font-semibold text-slate-800 flex items-center gap-1.5"
              >
                <Building2 className="w-4 h-4 text-emerald-700" />
                <span>School Name</span>
                <span className="text-rose-600">*</span>
              </label>
              <span className="text-xs text-slate-500 font-mono truncate max-w-[220px]">
                /{currentSchool.slug}
              </span>
            </div>
            <input
              id="setup-school-name"
              type="text"
              required
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="e.g. Rift Valley Junior Academy"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 min-h-[42px]"
            />
          </section>

          {/* 2. Academic Year & Active Term */}
          <section className="pt-5 border-t border-slate-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label
                  htmlFor="setup-academic-year"
                  className="text-xs font-semibold text-slate-800 flex items-center gap-1.5"
                >
                  <Calendar className="w-4 h-4 text-emerald-700" />
                  <span>Academic Year</span>
                  <span className="text-rose-600">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="setup-academic-year"
                    type="number"
                    min={2020}
                    max={2035}
                    required
                    value={academicYear}
                    onChange={(e) =>
                      setAcademicYear(parseInt(e.target.value, 10) || currentCalendarYear)
                    }
                    className="w-28 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono tabular-nums font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 min-h-[40px]"
                  />
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                    {quickYears.map((yr) => {
                      const active = academicYear === yr;
                      return (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => setAcademicYear(yr)}
                          className={`px-2.5 py-1.5 rounded-md text-xs font-mono tabular-nums font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            active
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {yr}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-800 block">
                  Active Academic Term
                </span>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg">
                  {TERMS.map((term) => {
                    const active = currentTerm === term;
                    return (
                      <button
                        key={term}
                        type="button"
                        onClick={() => setCurrentTerm(term)}
                        className={`px-3 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {term}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* 3. Initial Grade Levels */}
          <section className="pt-5 border-t border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-emerald-700" />
                  <span>Initial Grade Levels</span>
                  <span className="text-rose-600">*</span>
                </div>
                <p className="text-xs text-slate-500">
                  Select the active CBC grade levels offered at your school.
                </p>
              </div>
              <div className="text-xs text-slate-600 font-mono tabular-nums">
                {selectedLevels.length} selected
              </div>
            </div>

            {/* Quick Stage Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              {STAGE_PRESETS.map((preset) => {
                const isExactMatch =
                  preset.levels.length === selectedLevels.length &&
                  preset.levels.every((lvl) =>
                    selectedLevels.some((s) => s.toLowerCase() === lvl.toLowerCase())
                  );
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(preset.levels)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isExactMatch
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Interactive Level Multi-Select Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {availableLevels.map((lvl) => {
                const isSelected = selectedLevels.some(
                  (item) => item.toLowerCase() === lvl.toLowerCase()
                );
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => toggleLevel(lvl)}
                    aria-pressed={isSelected}
                    className={`px-3 py-2.5 rounded-lg border text-xs font-semibold transition-colors flex items-center justify-between gap-1.5 min-h-[40px] cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">{lvl}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Custom Grade Level + Initial Stream Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customLevelInput}
                  onChange={(e) => setCustomLevelInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomLevel();
                    }
                  }}
                  placeholder="Add custom level (e.g. Grade 10)"
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 min-h-[40px]"
                />
                <button
                  type="button"
                  onClick={handleAddCustomLevel}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 min-h-[40px] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="setup-default-stream"
                  className="text-xs font-medium text-slate-600 flex items-center gap-1 whitespace-nowrap shrink-0"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  <span>Default Stream:</span>
                </label>
                <input
                  id="setup-default-stream"
                  type="text"
                  value={defaultStream}
                  onChange={(e) => setDefaultStream(e.target.value)}
                  placeholder="e.g. East"
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 min-h-[40px]"
                />
              </div>
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-2 pt-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>
                KICD subjects and starter <strong className="text-slate-700">{defaultStream || 'East'}</strong> streams will be provisioned for all selected levels.
              </span>
            </div>
          </section>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[40px] cursor-pointer"
            >
              {isFirstLogin ? 'Complete Later' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 min-h-[40px] cursor-pointer"
            >
              <span>{saving ? 'Saving Setup...' : 'Save & Complete Setup'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
