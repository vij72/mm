import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  Sun,
  Moon,
  Save,
  Users,
  Grid,
  FileSpreadsheet,
  Settings2,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  PlusCircle,
  ShieldCheck,
  ClipboardList,
  KeyRound,
  Lock,
} from 'lucide-react';
import { AuthUser, ShiftType } from '../types/press';
import { formatDmy } from '../utils/calculations';

interface HeaderProps {
  currentTab: 'daily' | 'admin' | 'wages' | 'employees' | 'targets' | 'analytics';
  onSelectTab: (tab: 'daily' | 'admin' | 'wages' | 'employees' | 'targets' | 'analytics') => void;
  date: string;
  shift: ShiftType;
  onChangeDate: (date: string) => void;
  onChangeShift: (shift: ShiftType) => void;
  autoShift: boolean;
  onToggleAutoShift: (auto: boolean) => void;
  autoSave: boolean;
  onToggleAutoSave: (auto: boolean) => void;
  saveStatus: 'saved' | 'dirty' | 'saving' | 'new';
  lastSavedAt?: number;
  onSaveManual: () => void;
  onOpenAddEmployee: () => void;
  totalActiveWorkers: number;
  currentUser: AuthUser | null;
  onOpenLoginModal: () => void;
  isDateLocked?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  date,
  shift,
  onChangeDate,
  onChangeShift,
  autoShift,
  onToggleAutoShift,
  autoSave,
  onToggleAutoSave,
  saveStatus,
  lastSavedAt,
  onSaveManual,
  onOpenAddEmployee,
  totalActiveWorkers,
  currentUser,
  onOpenLoginModal,
  isDateLocked = false,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDayOffset = (offset: number) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    const pad = (n: number) => String(n).padStart(2, '0');
    const newDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    onChangeDate(newDate);
  };

  const getStatusBadge = () => {
    switch (saveStatus) {
      case 'saving':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <RefreshCw className="w-3 h-3 animate-spin" /> Saving...
          </span>
        );
      case 'dirty':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3 h-3" /> Unsaved changes
          </span>
        );
      case 'saved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Saved{' '}
            {lastSavedAt
              ? new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : ''}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            New Draft
          </span>
        );
    }
  };

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md sticky top-0 z-40">
      {/* Top Bar: Title & Status */}
      <div className="max-w-[1880px] mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-inner">
            <Grid className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                PRESS SECTION MES
              </h1>
              <span className="hidden sm:inline-block text-xs uppercase px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-mono font-medium">
                Target Auto 3.0
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Refractory Press Daily Production, Automation & Wages Management
            </p>
          </div>
        </div>

        {/* Live Clock & Shift Badge */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-md border border-slate-700 text-xs text-slate-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            <span>{timeStr}</span>
            <span className="text-slate-500">|</span>
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live MES
            </span>
          </div>

          {getStatusBadge()}

          {/* Locked Date Indicator */}
          {isDateLocked && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-950 text-red-300 border border-red-800">
              <Lock className="w-3 h-3 text-red-400" />
              Locked by Admin
            </span>
          )}

          {/* User Role Badge & Switcher */}
          <button
            type="button"
            onClick={onOpenLoginModal}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer border ${
              currentUser?.role === 'ADMIN'
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border-blue-500/40'
            }`}
            title="Click to Switch Role or Log Out"
          >
            {currentUser?.role === 'ADMIN' ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>👑 ADMIN (All Access)</span>
              </>
            ) : (
              <>
                <ClipboardList className="w-3.5 h-3.5 text-blue-400" />
                <span>📋 SUPERVISOR (Punch Only)</span>
              </>
            )}
          </button>

          {/* ONLY ADMIN CAN ADD NEW EMPLOYEE */}
          {currentUser?.role === 'ADMIN' ? (
            <button
              type="button"
              onClick={onOpenAddEmployee}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-sm transition active:scale-95"
              title="Add New Employee (Admin Only)"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add Employee
            </button>
          ) : (
            <div className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800/90 text-slate-400 text-[11px] border border-slate-700/60" title="Supervisor Policy: Adding employees is restricted to Admin">
              <Lock className="w-3 h-3 text-slate-500" />
              <span>Punch Mode</span>
            </div>
          )}

          <button
            type="button"
            onClick={onSaveManual}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition active:scale-95"
            title="Save Sheet (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5" />
            Save Sheet
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-[1880px] mx-auto px-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-950/60 pt-1">
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-1" aria-label="Tabs">
          {/* Daily Data Sheet - Available to both Admin & Supervisor */}
          <button
            type="button"
            onClick={() => onSelectTab('daily')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-md border-b-2 transition ${
              currentTab === 'daily'
                ? 'bg-slate-800 text-white border-blue-500 font-semibold shadow'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/50'
            }`}
          >
            <Grid className="w-4 h-4 text-blue-400" />
            <span>Daily Data Sheet</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-500/20 text-blue-300 font-mono">
              {totalActiveWorkers} Active
            </span>
          </button>

          {/* ADMIN PANEL - STRICTLY ADMIN ONLY */}
          {currentUser?.role === 'ADMIN' && (
            <button
              type="button"
              onClick={() => onSelectTab('admin')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-t-md border-b-2 transition ${
                currentTab === 'admin'
                  ? 'bg-amber-950/80 text-amber-200 border-amber-500 shadow'
                  : 'text-amber-400/90 hover:text-amber-200 border-transparent hover:bg-amber-950/40'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Admin Panel (Day-Wise Data)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/30 text-amber-300 font-mono font-bold">
                ADMIN
              </span>
            </button>
          )}

          {/* Wages Sheet */}
          <button
            type="button"
            onClick={() => onSelectTab('wages')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-md border-b-2 transition ${
              currentTab === 'wages'
                ? 'bg-slate-800 text-white border-blue-500 font-semibold shadow'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Wages Sheet</span>
          </button>

          {/* Employees Roster */}
          <button
            type="button"
            onClick={() => onSelectTab('employees')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-md border-b-2 transition ${
              currentTab === 'employees'
                ? 'bg-slate-800 text-white border-blue-500 font-semibold shadow'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-4 h-4 text-purple-400" />
            <span>Employees Roster</span>
            {currentUser?.role !== 'ADMIN' && (
              <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400">View</span>
            )}
          </button>

          {/* Target Matrix - Admin priority */}
          {currentUser?.role === 'ADMIN' && (
            <button
              type="button"
              onClick={() => onSelectTab('targets')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-md border-b-2 transition ${
                currentTab === 'targets'
                  ? 'bg-slate-800 text-white border-blue-500 font-semibold shadow'
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/50'
              }`}
            >
              <Settings2 className="w-4 h-4 text-amber-400" />
              <span>Target Matrix</span>
            </button>
          )}

          {/* Shift Analytics */}
          <button
            type="button"
            onClick={() => onSelectTab('analytics')}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-md border-b-2 transition ${
              currentTab === 'analytics'
                ? 'bg-slate-800 text-white border-blue-500 font-semibold shadow'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/50'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span>Shift Analytics</span>
          </button>
        </nav>

        {/* Date & Shift Controls */}
        <div className="flex items-center gap-2.5 py-1.5 flex-wrap">
          {/* Shift Toggle */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-md border border-slate-700">
            <button
              type="button"
              onClick={() => onChangeShift('DAY')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition ${
                shift === 'DAY'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              Day (06:00-18:00)
            </button>
            <button
              type="button"
              onClick={() => onChangeShift('NIGHT')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition ${
                shift === 'NIGHT'
                  ? 'bg-indigo-600 text-white font-bold shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              Night (18:00-06:00)
            </button>
          </div>

          {/* Date Picker with Prev / Next */}
          <div className="flex items-center bg-slate-800 rounded-md border border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => handleDayOffset(-1)}
              aria-label="Previous Day"
              className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-700 transition"
            >
              &larr;
            </button>
            <div className="flex items-center gap-1.5 px-2 text-xs font-mono text-slate-200">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={date}
                onChange={(e) => e.target.value && onChangeDate(e.target.value)}
                className="bg-transparent text-white border-0 text-xs focus:ring-0 cursor-pointer"
                aria-label="Select Date"
              />
            </div>
            <button
              type="button"
              onClick={() => handleDayOffset(1)}
              aria-label="Next Day"
              className="px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-700 transition"
            >
              &rarr;
            </button>
          </div>

          {/* Automation Checkboxes */}
          <div className="hidden lg:flex items-center gap-3 text-xs text-slate-300">
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={autoShift}
                onChange={(e) => onToggleAutoShift(e.target.checked)}
                className="rounded border-slate-700 text-blue-500 focus:ring-blue-500"
              />
              <span>Auto Shift</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={autoSave}
                onChange={(e) => onToggleAutoSave(e.target.checked)}
                className="rounded border-slate-700 text-blue-500 focus:ring-blue-500"
              />
              <span>Auto-Save</span>
            </label>
          </div>
        </div>
      </div>
    </header>
  );
};
