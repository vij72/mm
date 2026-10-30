import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Calendar,
  Lock,
  Unlock,
  Eye,
  Trash2,
  Download,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  FileSpreadsheet,
  FileText,
  KeyRound,
  Check,
  X,
  RefreshCw,
  Edit2,
  UserCheck,
  UserX,
  Factory,
} from 'lucide-react';
import {
  AuthUser,
  DayWiseSummary,
  Employee,
  Gender,
  ItemTargetMapping,
  LabourType,
  PressRow,
  ShiftDoc,
  ShiftType,
} from '../types/press';
import {
  deleteShiftDoc,
  getAllDayWiseSummaries,
  getStoredCredentials,
  isDayLocked,
  loadShiftDoc,
  saveShiftDoc,
  saveStoredCredentials,
  setDayLocked,
} from '../utils/storage';
import { formatDmy } from '../utils/calculations';
import { exportDailySheetToExcel } from '../utils/exportExcel';
import { exportDailySheetToPdf } from '../utils/exportPdf';

interface AdminPanelProps {
  currentUser: AuthUser | null;
  employees: Employee[];
  onUpdateEmployees: (employees: Employee[]) => void;
  onAddNewEmployee: (newEmp: Employee, addToActiveSheet: boolean) => void;
  items: ItemTargetMapping[];
  activeDate: string;
  activeShift: ShiftType;
  onSelectDateAndShift: (date: string, shift: ShiftType) => void;
  onOpenLoginModal: () => void;
  showToast: (msg: string) => void;
  currentDoc: ShiftDoc;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  employees,
  onUpdateEmployees,
  onAddNewEmployee,
  items,
  activeDate,
  activeShift,
  onSelectDateAndShift,
  onOpenLoginModal,
  showToast,
  currentDoc,
}) => {
  // Navigation inside Admin Panel
  const [adminTab, setAdminTab] = useState<'employees' | 'daywise' | 'audit' | 'security'>('daywise');

  // Form State for "Add New Employee"
  const [empCode, setEmpCode] = useState('');
  const [empName, setEmpName] = useState('');
  const [empSection, setEmpSection] = useState('pressDay');
  const [customSection, setCustomSection] = useState('');
  const [empGender, setEmpGender] = useState<Gender>('M');
  const [empRole, setEmpRole] = useState<LabourType>('operator');
  const [empPhone, setEmpPhone] = useState('');
  const [empNotes, setEmpNotes] = useState('');
  const [empRate, setEmpRate] = useState<string>('');
  const [addToActiveSheet, setAddToActiveSheet] = useState(true);

  // Bulk Add
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Day-Wise Filter & Inspector State
  const [daySearch, setDaySearch] = useState('');
  const [dayInspectorDate, setDayInspectorDate] = useState<string | null>(null);
  const [newDateInput, setNewDateInput] = useState('');

  // Credentials State
  const creds = getStoredCredentials();
  const [adminPin, setAdminPin] = useState(creds.adminPin);
  const [supervisorPin, setSupervisorPin] = useState(creds.supervisorPin);
  const [pinSavedMessage, setPinSavedMessage] = useState(false);

  // Reload trigger for DayWise summaries when locks change or dates added
  const [refreshKey, setRefreshKey] = useState(0);

  // Calculate next employee code suggestion
  const suggestedNextCode = useMemo(() => {
    const numericCodes = employees
      .map((e) => parseInt(e.code, 10))
      .filter((n) => !isNaN(n));
    return numericCodes.length > 0 ? String(Math.max(...numericCodes) + 1) : '1';
  }, [employees]);

  // Set default code when empty
  React.useEffect(() => {
    if (!empCode) {
      setEmpCode(suggestedNextCode);
    }
  }, [suggestedNextCode, empCode]);

  // Handle employee name auto-prefix gender
  const handleEmpNameChange = (val: string) => {
    setEmpName(val);
    if (/^\s*mrs\.?/i.test(val)) {
      setEmpGender('F');
    } else if (/^\s*mr\.?/i.test(val)) {
      setEmpGender('M');
    }
  };

  // Day-Wise data consolidation
  const daySummaries = useMemo(() => {
    // refreshKey dependency forces recalculation
    void refreshKey;
    return getAllDayWiseSummaries(employees, items);
  }, [employees, items, refreshKey]);

  // Filtered day summaries
  const filteredDays = useMemo(() => {
    if (!daySearch) return daySummaries;
    const q = daySearch.toLowerCase();
    return daySummaries.filter(
      (d) =>
        d.date.includes(q) ||
        d.dayOfWeek.toLowerCase().includes(q) ||
        formatDmy(d.date).toLowerCase().includes(q)
    );
  }, [daySummaries, daySearch]);

  // Aggregate metrics across all days
  const aggregateMetrics = useMemo(() => {
    let totalBricks = 0;
    let totalMT = 0;
    let totalHours = 0;
    let totalShifts = 0;

    daySummaries.forEach((d) => {
      totalBricks += d.totalGoodNos;
      totalMT += d.totalWeightMT;
      totalHours += d.totalPayHours;
      if (d.dayDoc) totalShifts++;
      if (d.nightDoc) totalShifts++;
    });

    const avgDayBricks =
      daySummaries.length > 0 ? Math.round(totalBricks / daySummaries.length) : 0;

    return {
      totalDays: daySummaries.length,
      totalShifts,
      totalBricks,
      totalMT: Number(totalMT.toFixed(2)),
      totalHours: Number(totalHours.toFixed(2)),
      avgDayBricks,
    };
  }, [daySummaries]);

  // ACCESS GUARD: If not ADMIN, display clean restriction UI
  if (currentUser?.role !== 'ADMIN') {
    return (
      <div className="max-w-4xl mx-auto my-12 p-6 bg-white rounded-2xl shadow-xl border border-red-200 text-center animate-in fade-in">
        <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 mx-auto flex items-center justify-center mb-4">
          <ShieldAlert className="w-9 h-9" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Administrator Access Required
        </h2>
        <p className="text-sm text-slate-600 max-w-lg mx-auto mb-6 leading-relaxed">
          The Admin Panel contains sensitive Day-Wise factory production controls, master employee
          registration, shift locks, and security credentials. Your current session is set to{' '}
          <span className="font-bold text-blue-700">{currentUser?.role || 'SUPERVISOR'}</span>.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 max-w-md mx-auto text-xs text-amber-900 text-left mb-6 space-y-1.5">
          <p className="font-bold flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-amber-700" />
            Supervisor Permission Rule:
          </p>
          <p>
            Supervisors are authorized only to punch operational shift numbers. Adding new employees
            and day-wise master data operations are reserved strictly for Admin.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenLoginModal}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-md transition active:scale-95"
        >
          <KeyRound className="w-4 h-4 text-amber-400" />
          <span>Switch to Admin Account</span>
        </button>
      </div>
    );
  }

  // Handle Form Submit for Adding Employee
  const handleCreateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !empCode.trim()) {
      showToast('Employee Code and Full Name are required.');
      return;
    }

    const finalSection =
      empSection === 'custom' ? customSection.trim() || 'General' : empSection;

    const newEmp: Employee = {
      code: empCode.trim(),
      name: empName.trim(),
      section: finalSection,
      gender: empGender,
      defaultLabourType: empRole,
      phone: empPhone.trim() || undefined,
      notes: empNotes.trim() || undefined,
      dailyRate: empRate ? parseFloat(empRate) : undefined,
      isActive: true,
      joiningDate: new Date().toISOString().slice(0, 10),
    };

    onAddNewEmployee(newEmp, addToActiveSheet);

    // Reset form with next suggested code
    setEmpName('');
    setEmpNotes('');
    setEmpPhone('');
    setEmpRate('');
    const nextVal = String(parseInt(empCode, 10) + 1 || '');
    setEmpCode(nextVal);
  };

  // Handle Bulk Employee Add
  const handleProcessBulkAdd = () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split('\n').filter((l) => l.trim().length > 0);
    const created: Employee[] = [];

    lines.forEach((line) => {
      // Split by comma or tab
      const parts = line.split(/[,\t]+/).map((s) => s.trim());
      if (parts.length >= 2) {
        const code = parts[0];
        const name = parts[1];
        const sec = parts[2] || 'pressDay';
        const role = (parts[3] as LabourType) || 'operator';
        const gender: Gender = /^\s*mrs\.?/i.test(name) ? 'F' : 'M';

        created.push({
          code,
          name,
          section: sec,
          defaultLabourType: role,
          gender,
          isActive: true,
          joiningDate: new Date().toISOString().slice(0, 10),
        });
      }
    });

    if (created.length > 0) {
      onUpdateEmployees([...created, ...employees]);
      showToast(`Successfully registered ${created.length} employees in bulk!`);
      setBulkText('');
      setIsBulkOpen(false);
    } else {
      showToast('Could not parse employee lines. Use format: Code, Name, Section, Role');
    }
  };

  // Handle Lock / Unlock Day
  const handleToggleDayLock = (date: string, currentLock: boolean) => {
    setDayLocked(date, !currentLock, currentUser.name);
    setRefreshKey((k) => k + 1);
    showToast(
      !currentLock
        ? `🔒 Day ${formatDmy(date)} locked. Supervisors cannot alter this date.`
        : `🔓 Day ${formatDmy(date)} unlocked for supervisor punching.`
    );
  };

  // Handle Initialize New Day
  const handleInitializeNewDay = () => {
    if (!newDateInput) return;
    // Load fresh doc and save to persist
    const dayDoc = loadShiftDoc(newDateInput, 'DAY', employees, items);
    saveShiftDoc(dayDoc);
    setRefreshKey((k) => k + 1);
    showToast(`Initialized day record for ${formatDmy(newDateInput)}`);
    onSelectDateAndShift(newDateInput, 'DAY');
  };

  // Handle Delete / Reset Shift
  const handleDeleteShift = (date: string, shift: ShiftType) => {
    if (
      window.confirm(
        `Are you sure you want to completely clear the ${shift} shift record for ${formatDmy(date)}?`
      )
    ) {
      deleteShiftDoc(date, shift);
      setRefreshKey((k) => k + 1);
      showToast(`Cleared ${shift} shift for ${formatDmy(date)}`);
    }
  };

  // Handle Save Credentials
  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredCredentials({
      adminPin: adminPin.trim() || '9999',
      supervisorPin: supervisorPin.trim() || '1234',
    });
    setPinSavedMessage(true);
    setTimeout(() => setPinSavedMessage(false), 3000);
    showToast('Security PINs successfully updated');
  };

  return (
    <div className="max-w-[1880px] mx-auto p-3 sm:p-5 space-y-5">
      {/* Admin Panel Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-amber-950 text-white rounded-2xl shadow-xl border border-amber-500/30 p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                ADMIN CONTROL CENTER
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                ALL ACCESS
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
              Employee Master Registration, Day-Wise Production Governance & System Permissions
            </p>
          </div>
        </div>

        {/* Admin User Info & Active Target Notice */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-slate-800/90 border border-slate-700 px-3.5 py-2 rounded-xl text-xs flex items-center gap-3">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Logged in Administrator
              </span>
              <span className="font-bold text-amber-400">{currentUser.name}</span>
            </div>
            <span className="w-px h-6 bg-slate-700"></span>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                Supervisor Rule
              </span>
              <span className="text-emerald-400 font-medium">Punch Only Enforced</span>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Sub-Navigation Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setAdminTab('daywise')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs ${
            adminTab === 'daywise'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Day-Wise Data Management</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-900/40 text-amber-200 font-mono">
            {daySummaries.length} Days
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('employees')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs ${
            adminTab === 'employees'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Add & Manage Employees</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-900/40 text-amber-200 font-mono">
            {employees.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs ${
            adminTab === 'audit'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Punch Audit & Quality</span>
        </button>

        <button
          type="button"
          onClick={() => setAdminTab('security')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs ${
            adminTab === 'security'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Access & PIN Settings</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: DAY-WISE DATA MANAGEMENT (ONLY ADMIN)                   */}
      {/* ============================================================== */}
      {adminTab === 'daywise' && (
        <div className="space-y-5 animate-in fade-in duration-150">
          {/* Aggregate KPI Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Recorded Days
              </span>
              <p className="text-2xl font-black text-slate-900 mt-1 font-mono">
                {aggregateMetrics.totalDays}
              </p>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                {aggregateMetrics.totalShifts} Saved Shifts
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Good Bricks
              </span>
              <p className="text-2xl font-black text-blue-600 mt-1 font-mono">
                {aggregateMetrics.totalBricks.toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                ~{aggregateMetrics.avgDayBricks.toLocaleString()} / day
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Weight (MT)
              </span>
              <p className="text-2xl font-black text-emerald-600 mt-1 font-mono">
                {aggregateMetrics.totalMT.toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Good brick weight</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Hours Payable
              </span>
              <p className="text-2xl font-black text-purple-600 mt-1 font-mono">
                {aggregateMetrics.totalHours.toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Sum across all shifts</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Active Date
              </span>
              <p className="text-lg font-bold text-slate-800 mt-1 font-mono">
                {formatDmy(activeDate)}
              </p>
              <span className="text-[10px] font-bold text-amber-600 uppercase">
                {activeShift} Shift
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Current Lock Status
              </span>
              <div className="mt-1">
                {isDayLocked(activeDate) ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-lg">
                    <Lock className="w-3.5 h-3.5" /> Locked by Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                    <Unlock className="w-3.5 h-3.5" /> Open for Punch
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Toolbar: Filter, Initialize Date, Export */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="relative w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter by date (YYYY-MM-DD or DD/MM)..."
                  value={daySearch}
                  onChange={(e) => setDaySearch(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Initialize date picker */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 px-2.5 py-1 rounded-lg text-xs">
                <span className="text-slate-600 font-semibold">Initialize Date:</span>
                <input
                  type="date"
                  value={newDateInput}
                  onChange={(e) => setNewDateInput(e.target.value)}
                  className="bg-transparent border-0 text-xs p-0 focus:ring-0 cursor-pointer font-mono"
                />
                <button
                  type="button"
                  onClick={handleInitializeNewDay}
                  disabled={!newDateInput}
                  className="ml-1 px-2.5 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold rounded text-xs transition"
                >
                  Create Day
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                Showing <strong className="text-slate-800">{filteredDays.length}</strong> day records
              </span>
            </div>
          </div>

          {/* Day-Wise Master Table */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-3 border-r border-slate-800">Date & Day</th>
                    <th className="py-3 px-3 border-r border-slate-800">Status</th>
                    <th className="py-3 px-3 border-r border-slate-800 bg-amber-950/70 text-amber-200">
                      Day Shift (06:00–18:00)
                    </th>
                    <th className="py-3 px-3 border-r border-slate-800 bg-indigo-950/70 text-indigo-200">
                      Night Shift (18:00–06:00)
                    </th>
                    <th className="py-3 px-3 border-r border-slate-800 text-right">Day Good Nos</th>
                    <th className="py-3 px-3 border-r border-slate-800 text-right">Day WT (MT)</th>
                    <th className="py-3 px-3 border-r border-slate-800 text-right">Pay Hours</th>
                    <th className="py-3 px-3 text-center">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredDays.map((summary) => {
                    const isSelectedDate = summary.date === activeDate;
                    return (
                      <tr
                        key={summary.date}
                        className={`hover:bg-amber-50/40 transition ${
                          isSelectedDate ? 'bg-amber-50/70 font-semibold' : ''
                        }`}
                      >
                        {/* Date & Day */}
                        <td className="py-3 px-3 border-r border-slate-200 font-mono">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">
                              {formatDmy(summary.date)}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-sans">
                              {summary.dayOfWeek}
                            </span>
                            {isSelectedDate && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-bold font-sans">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">{summary.date}</span>
                        </td>

                        {/* Status (Locked or Open) */}
                        <td className="py-3 px-3 border-r border-slate-200">
                          {summary.isLocked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
                              <Lock className="w-3 h-3" /> Locked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <Unlock className="w-3 h-3" /> Open
                            </span>
                          )}
                        </td>

                        {/* Day Shift Stats */}
                        <td className="py-3 px-3 border-r border-slate-200 bg-amber-50/30">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span className="font-bold text-slate-800 font-mono">
                                {summary.dayGoodNos.toLocaleString()} pcs
                              </span>
                              <div className="text-[10px] text-slate-500">
                                {summary.dayWeightMT} MT • {summary.dayActiveRows} workers
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onSelectDateAndShift(summary.date, 'DAY')}
                              className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded font-semibold text-[11px] transition"
                              title="Open Day Shift in Daily Sheet"
                            >
                              Edit Day
                            </button>
                          </div>
                        </td>

                        {/* Night Shift Stats */}
                        <td className="py-3 px-3 border-r border-slate-200 bg-indigo-50/30">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span className="font-bold text-slate-800 font-mono">
                                {summary.nightGoodNos.toLocaleString()} pcs
                              </span>
                              <div className="text-[10px] text-slate-500">
                                {summary.nightWeightMT} MT • {summary.nightActiveRows} workers
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onSelectDateAndShift(summary.date, 'NIGHT')}
                              className="px-2 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 rounded font-semibold text-[11px] transition"
                              title="Open Night Shift in Daily Sheet"
                            >
                              Edit Night
                            </button>
                          </div>
                        </td>

                        {/* Total Day Good Nos */}
                        <td className="py-3 px-3 border-r border-slate-200 text-right font-mono font-bold text-blue-700">
                          {summary.totalGoodNos.toLocaleString()}
                        </td>

                        {/* Total Day WT */}
                        <td className="py-3 px-3 border-r border-slate-200 text-right font-mono font-bold text-emerald-700">
                          {summary.totalWeightMT}
                        </td>

                        {/* Total Pay Hours */}
                        <td className="py-3 px-3 border-r border-slate-200 text-right font-mono font-bold text-slate-800">
                          {summary.totalPayHours}
                        </td>

                        {/* Admin Action Buttons */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Lock / Unlock Toggle */}
                            <button
                              type="button"
                              onClick={() => handleToggleDayLock(summary.date, summary.isLocked)}
                              className={`p-1.5 rounded-lg border transition ${
                                summary.isLocked
                                  ? 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100'
                                  : 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100'
                              }`}
                              title={
                                summary.isLocked
                                  ? 'Unlock Day (Allow supervisor punching)'
                                  : 'Lock Day (Prevent supervisor changes)'
                              }
                            >
                              {summary.isLocked ? (
                                <Lock className="w-3.5 h-3.5" />
                              ) : (
                                <Unlock className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Inspect Breakdown */}
                            <button
                              type="button"
                              onClick={() => setDayInspectorDate(summary.date)}
                              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 transition"
                              title="Inspect Day Production Breakdown"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* Export Daily Sheet */}
                            <button
                              type="button"
                              onClick={() => {
                                const dDoc = loadShiftDoc(summary.date, 'DAY', employees, items);
                                const nDoc = loadShiftDoc(summary.date, 'NIGHT', employees, items);
                                exportDailySheetToExcel(
                                  [dDoc, nDoc],
                                  `DAY_DATA_${formatDmy(summary.date)}_COMBINED.xlsx`
                                );
                              }}
                              className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-emerald-50 text-emerald-700 transition"
                              title="Export Day Excel"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: ADD & MANAGE EMPLOYEES (ONLY ADMIN)                     */}
      {/* ============================================================== */}
      {adminTab === 'employees' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 animate-in fade-in duration-150">
          {/* Left Column: Comprehensive Add Employee Form */}
          <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500 rounded-lg text-slate-950 font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Add New Factory Employee</h2>
                  <p className="text-xs text-slate-500">
                    Admin Master Registration & Active Shift Assignment
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkOpen(!isBulkOpen)}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
              >
                {isBulkOpen ? 'Single Form' : 'Bulk Fast Add'}
              </button>
            </div>

            {/* Bulk Text Import Tool */}
            {isBulkOpen ? (
              <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700 block">
                  Bulk Paste Employees (CSV / Tab-delimited):
                </span>
                <p className="text-[11px] text-slate-500">
                  Format: <code className="bg-white px-1 py-0.5 rounded border">Code, Full Name, Section, Role</code>
                </p>
                <textarea
                  rows={6}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`530, Ramesh Singh, pressDay, operator\n531, Geeta Devi, pressDay, helper\n532, Suresh Yadav, pressNight, operator`}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-mono bg-white"
                />
                <button
                  type="button"
                  onClick={handleProcessBulkAdd}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition"
                >
                  Process & Import All
                </button>
              </div>
            ) : (
              /* Single Employee Form */
              <form onSubmit={handleCreateEmployee} className="space-y-3.5">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={empCode}
                      onChange={(e) => setEmpCode(e.target.value)}
                      placeholder="e.g. 525"
                      className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 font-mono font-bold"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Employee Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={empName}
                      onChange={(e) => handleEmpNameChange(e.target.value)}
                      placeholder="e.g. Mr. RAMESH KUMAR or Mrs. SUMAN"
                      className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Department / Shift Section
                    </label>
                    <select
                      value={empSection}
                      onChange={(e) => setEmpSection(e.target.value)}
                      className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-white"
                    >
                      <option value="pressDay">Press Section (Day Shift)</option>
                      <option value="pressNight">Press Section (Night Shift)</option>
                      <option value="millDay">Mill Section (Day)</option>
                      <option value="millNight">Mill Section (Night)</option>
                      <option value="tkl">TKL Roster</option>
                      <option value="tkp">TKP Roster</option>
                      <option value="odisha">Odisha Contractor</option>
                      <option value="custom">Other / Custom...</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Default Labour Role
                    </label>
                    <select
                      value={empRole}
                      onChange={(e) => setEmpRole(e.target.value as LabourType)}
                      className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-white"
                    >
                      <option value="operator">Press Operator (OP)</option>
                      <option value="helper">Helper (HP)</option>
                      <option value="labour">General Labour (LB)</option>
                    </select>
                  </div>
                </div>

                {empSection === 'custom' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Custom Section Name
                    </label>
                    <input
                      type="text"
                      value={customSection}
                      onChange={(e) => setCustomSection(e.target.value)}
                      placeholder="e.g. Kiln, Maintenance, Quality"
                      className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Gender</label>
                    <div className="flex items-center gap-4 text-xs pt-1.5">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          value="M"
                          checked={empGender === 'M'}
                          onChange={() => setEmpGender('M')}
                          className="text-amber-600 focus:ring-amber-500"
                        />
                        <span>Male (M)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          value="F"
                          checked={empGender === 'F'}
                          onChange={() => setEmpGender('F')}
                          className="text-amber-600 focus:ring-amber-500"
                        />
                        <span>Female (F)</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Daily Wage Rate (Optional)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={empRate}
                      onChange={(e) => setEmpRate(e.target.value)}
                      placeholder="e.g. 450"
                      className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={empPhone}
                      onChange={(e) => setEmpPhone(e.target.value)}
                      placeholder="Optional"
                      className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                    <input
                      type="text"
                      value={empNotes}
                      onChange={(e) => setEmpNotes(e.target.value)}
                      placeholder="Press skills, qualifications"
                      className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-amber-900">
                    <input
                      type="checkbox"
                      checked={addToActiveSheet}
                      onChange={(e) => setAddToActiveSheet(e.target.checked)}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>
                      Directly add into current daily production sheet ({formatDmy(activeDate)}{' '}
                      {activeShift})
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2 active:scale-98"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register & Save Employee</span>
                </button>
              </form>
            )}
          </div>

          {/* Right Column: Roster Overview Table */}
          <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Registered Factory Roster ({employees.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Master worker list available for daily shift punching
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                {employees.filter((e) => e.isActive !== false).length} Active
              </span>
            </div>

            <div className="overflow-x-auto max-h-[520px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 sticky top-0 z-10 font-bold">
                  <tr>
                    <th className="py-2 px-2.5 border-b">Code</th>
                    <th className="py-2 px-2.5 border-b">Name</th>
                    <th className="py-2 px-2.5 border-b">Section</th>
                    <th className="py-2 px-2.5 border-b">Role</th>
                    <th className="py-2 px-2.5 border-b">Status</th>
                    <th className="py-2 px-2.5 border-b text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp, index) => (
                    <tr key={`${emp.code}_${emp.section}_${index}`} className="hover:bg-slate-50">
                      <td className="py-2 px-2.5 font-mono font-bold text-slate-800">{emp.code}</td>
                      <td className="py-2 px-2.5 font-medium text-slate-900">
                        {emp.name}
                        {emp.phone && (
                          <span className="text-[10px] text-slate-400 block">{emp.phone}</span>
                        )}
                      </td>
                      <td className="py-2 px-2.5 text-slate-600 capitalize">{emp.section}</td>
                      <td className="py-2 px-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            emp.defaultLabourType === 'operator'
                              ? 'bg-blue-100 text-blue-800'
                              : emp.defaultLabourType === 'helper'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {emp.defaultLabourType || 'OP'}
                        </span>
                      </td>
                      <td className="py-2 px-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            const updated = employees.map((e) =>
                              e.code === emp.code
                                ? { ...e, isActive: e.isActive === false ? true : false }
                                : e
                            );
                            onUpdateEmployees(updated);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            emp.isActive !== false
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {emp.isActive !== false ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-2 px-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete employee ${emp.name} (${emp.code})?`)) {
                              onUpdateEmployees(employees.filter((e) => e.code !== emp.code));
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-red-600 transition"
                          title="Delete Employee"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: AUDIT & QUALITY METRICS                                 */}
      {/* ============================================================== */}
      {adminTab === 'audit' && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 animate-in fade-in duration-150">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Shift Punch & Quality Audit Trail</h2>
              <p className="text-xs text-slate-500">
                Monitor supervisor punch accuracy, moisture deviations, and target compliance
              </p>
            </div>
            <span className="text-xs text-slate-500">
              Active Doc: {formatDmy(activeDate)} ({activeShift})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700 block">Supervisor Punch Activity</span>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Supervisors punch hourly runtime, brick counts, moisture percentage, and bulk density.
                Their entries auto-calculate physical hours, 12h targets from matrix, and payable wages.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700 block">Day Lock Governance</span>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                When a day is finalized by management, Admin can toggle &quot;Lock Day&quot;. This prevents
                further edits or accidental alterations by shift supervisors.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700 block">Zero-Rogue Worker Policy</span>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Supervisors are restricted from adding rogue or unapproved employees. Only registered
                personnel in the Admin Master roster can be punched into daily production sheets.
              </p>
            </div>
          </div>

          {/* Current Active Sheet Deviation Inspection */}
          <div className="mt-4">
            <h3 className="text-xs font-bold text-slate-800 mb-2 uppercase tracking-wider">
              Active Sheet High-Variance Rows ({activeDate} {activeShift})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="p-2">Row</th>
                    <th className="p-2">Worker</th>
                    <th className="p-2">Press</th>
                    <th className="p-2">Item</th>
                    <th className="p-2">Target</th>
                    <th className="p-2">Good Nos</th>
                    <th className="p-2">Rej Nos</th>
                    <th className="p-2">T.Moist / A.Moist</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentDoc.rows
                    .filter((r) => r.good || r.run || r.item)
                    .slice(0, 15)
                    .map((r, i) => {
                      const tm = parseFloat(String(r.tm)) || 0;
                      const am = parseFloat(String(r.am)) || 0;
                      const moistDiff = Math.abs(am - tm);
                      const moistAlert = tm > 0 && am > 0 && moistDiff > 1.5;

                      return (
                        <tr key={r.id || i} className="hover:bg-slate-50">
                          <td className="p-2 font-mono text-slate-400">{i + 1}</td>
                          <td className="p-2 font-medium text-slate-900">
                            {r.name || r.code || 'Unassigned'}
                          </td>
                          <td className="p-2 font-semibold text-blue-700">{r.press || '—'}</td>
                          <td className="p-2">{r.item || '—'}</td>
                          <td className="p-2 font-mono">{r.tgt || '—'}</td>
                          <td className="p-2 font-mono font-bold text-emerald-700">
                            {r.good || '0'}
                          </td>
                          <td className="p-2 font-mono text-red-600">{r.rej || '0'}</td>
                          <td className="p-2 font-mono">
                            {r.tm || '—'} / {r.am || '—'}%
                            {moistAlert && (
                              <span className="ml-1 text-[10px] text-amber-600 font-bold">
                                (Δ {moistDiff.toFixed(1)}%)
                              </span>
                            )}
                          </td>
                          <td className="p-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                              Punched
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: ACCESS & PIN SETTINGS                                   */}
      {/* ============================================================== */}
      {adminTab === 'security' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in duration-150">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-sm font-bold text-slate-900">System PIN Configuration</h2>
              <p className="text-xs text-slate-500">
                Update access passcodes for Administrator and Shift Supervisors
              </p>
            </div>

            <form onSubmit={handleSaveCredentials} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Admin Passcode / PIN
                </label>
                <input
                  type="text"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 font-mono tracking-widest font-bold"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Enables all privileges: Add employee, day-wise data management, locking.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Supervisor PIN</label>
                <input
                  type="text"
                  value={supervisorPin}
                  onChange={(e) => setSupervisorPin(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 font-mono tracking-widest font-bold"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Permits daily data punching only. Cannot add any employee.
                </p>
              </div>

              {pinSavedMessage && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>PIN codes updated successfully!</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4 text-amber-400" />
                <span>Save New PIN Settings</span>
              </button>
            </form>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-sm font-bold text-slate-900">Role Privilege Matrix</h2>
              <p className="text-xs text-slate-500">
                Strict enforcement rules between Admin and Supervisor
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg">
                <thead className="bg-slate-100 text-slate-700 font-bold">
                  <tr>
                    <th className="p-2 border-b">Feature / Permission</th>
                    <th className="p-2 border-b text-center text-amber-800">Admin</th>
                    <th className="p-2 border-b text-center text-blue-800">Supervisor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-2 font-medium">Add New Employee to Master Roster</td>
                    <td className="p-2 text-center text-emerald-600 font-bold">YES</td>
                    <td className="p-2 text-center text-red-600 font-bold">NO (Restricted)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Day-Wise Data Overview & Audit</td>
                    <td className="p-2 text-center text-emerald-600 font-bold">YES</td>
                    <td className="p-2 text-center text-red-600 font-bold">NO (Admin Only)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Punch Daily Shift Data (Press/Run/Item)</td>
                    <td className="p-2 text-center text-emerald-600 font-bold">YES</td>
                    <td className="p-2 text-center text-emerald-600 font-bold">YES (Primary)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Lock / Unlock Shift Dates</td>
                    <td className="p-2 text-center text-emerald-600 font-bold">YES</td>
                    <td className="p-2 text-center text-red-600 font-bold">NO</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-medium">Edit Master Target Matrix & Wages Rate</td>
                    <td className="p-2 text-center text-emerald-600 font-bold">YES</td>
                    <td className="p-2 text-center text-red-600 font-bold">NO</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Inspector Modal for a selected Day */}
      {dayInspectorDate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden animate-in fade-in">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  Day Production Inspection: {formatDmy(dayInspectorDate)}
                </h3>
                <p className="text-xs text-slate-400">
                  Full combined record for Day & Night shifts
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDayInspectorDate(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                {/* Day Shift Summary */}
                <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200">
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wider block">
                    Day Shift (06:00–18:00)
                  </span>
                  <div className="mt-2 space-y-1 text-xs text-slate-700">
                    <p>
                      Workers: <strong>{loadShiftDoc(dayInspectorDate, 'DAY', employees, items).rows.filter((r) => r.name || r.code).length}</strong>
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectDateAndShift(dayInspectorDate, 'DAY');
                        setDayInspectorDate(null);
                      }}
                      className="mt-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-xs"
                    >
                      Open in Daily Sheet
                    </button>
                  </div>
                </div>

                {/* Night Shift Summary */}
                <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-200">
                  <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider block">
                    Night Shift (18:00–06:00)
                  </span>
                  <div className="mt-2 space-y-1 text-xs text-slate-700">
                    <p>
                      Workers: <strong>{loadShiftDoc(dayInspectorDate, 'NIGHT', employees, items).rows.filter((r) => r.name || r.code).length}</strong>
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectDateAndShift(dayInspectorDate, 'NIGHT');
                        setDayInspectorDate(null);
                      }}
                      className="mt-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs"
                    >
                      Open in Daily Sheet
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setDayInspectorDate(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
