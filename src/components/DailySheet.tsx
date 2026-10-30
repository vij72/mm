import React, { useState, useMemo } from 'react';
import {
  Plus,
  Clock,
  Sparkles,
  Download,
  Trash2,
  Edit2,
  Copy,
  Search,
  Filter,
  RotateCcw,
  Undo2,
  Redo2,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  HelpCircle,
  ClipboardList,
  Lock,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { AuthUser, Employee, ItemTargetMapping, PressRow, ShiftDoc, ShiftType } from '../types/press';
import { PRESSES } from '../data/initialData';
import {
  calcGoodBrickWeightMT,
  calcHoursPayable,
  calcPhysicalHours,
  extractQualityPct,
  formatDmy,
  formatNum,
  lookupTarget,
  num,
} from '../utils/calculations';
import { exportDailySheetToExcel } from '../utils/exportExcel';
import { exportDailySheetToPdf } from '../utils/exportPdf';

interface DailySheetProps {
  currentDoc: ShiftDoc;
  onChangeDoc: (newDoc: ShiftDoc) => void;
  items: ItemTargetMapping[];
  itemMap: Record<string, Record<string, number>>;
  onOpenRowCorrection: (row: PressRow, index: number) => void;
  onOpenAddEmployee: () => void;
  onSaveManual: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  getOtherShiftDoc?: () => ShiftDoc | null;
  currentUser?: AuthUser | null;
  isLocked?: boolean;
  registeredEmployees?: Employee[];
}

export const DailySheet: React.FC<DailySheetProps> = ({
  currentDoc,
  onChangeDoc,
  items,
  itemMap,
  onOpenRowCorrection,
  onOpenAddEmployee,
  onSaveManual,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  getOtherShiftDoc,
  currentUser,
  isLocked = false,
  registeredEmployees = [],
}) => {
  const [filterSearch, setFilterSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'operator' | 'helper' | 'labour'>('all');
  const [exportScope, setExportScope] = useState<'one' | 'both'>('one');

  const { rows, shift, date } = currentDoc;

  // Update a single cell in a row
  const handleCellChange = <K extends keyof PressRow>(
    rowIndex: number,
    field: K,
    value: PressRow[K]
  ) => {
    const updatedRows = [...rows];
    const row = { ...updatedRows[rowIndex], [field]: value };

    // If editing code or name, auto-match from registered roster
    if (field === 'code' && value) {
      const match = registeredEmployees.find(
        (e) => e.code.trim().toLowerCase() === String(value).trim().toLowerCase()
      );
      if (match) {
        row.name = match.name;
        row.op = match.defaultLabourType === 'operator';
        row.hp = match.defaultLabourType === 'helper';
        row.lb = match.defaultLabourType === 'labour';
      }
    } else if (field === 'name' && value) {
      const match = registeredEmployees.find(
        (e) => e.name.trim().toLowerCase() === String(value).trim().toLowerCase()
      );
      if (match) {
        row.code = match.code;
        row.op = match.defaultLabourType === 'operator';
        row.hp = match.defaultLabourType === 'helper';
        row.lb = match.defaultLabourType === 'labour';
      }
    }

    // Auto-update timings & physical hours
    if (field === 'tin' || field === 'tout') {
      row.phys = calcPhysicalHours(
        field === 'tin' ? String(value) : row.tin,
        field === 'tout' ? String(value) : row.tout
      );
    }

    // Auto-update item & target
    if (field === 'item' || field === 'press') {
      const it = field === 'item' ? String(value) : row.item;
      const pr = field === 'press' ? String(value) : row.press;

      if (field === 'item') {
        const q = extractQualityPct(it);
        if (q) row.q = q;
      }

      const autoTgt = lookupTarget(itemMap, it, pr);
      if (autoTgt != null) {
        row.tgt = autoTgt;
        row.tgtAuto = true;
      }
    }

    // Manual override of target flags tgtAuto as false
    if (field === 'tgt') {
      row.tgtAuto = false;
    }

    // Recalculate weight in MT
    if (field === 'gw' || field === 'good') {
      const gw = field === 'gw' ? value : row.gw;
      const good = field === 'good' ? value : row.good;
      row.wt = calcGoodBrickWeightMT(gw as number, good as number);
    }

    // Recalculate hours payable
    if (field === 'tgt' || field === 'good') {
      const tgt = field === 'tgt' ? value : row.tgt;
      const good = field === 'good' ? value : row.good;
      row.pay = calcHoursPayable(tgt as number, good as number, 12);
    }

    updatedRows[rowIndex] = row;
    onChangeDoc({ ...currentDoc, rows: updatedRows });
  };

  // Add blank row
  const handleAddRow = () => {
    const newRow: PressRow = {
      id: `row_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      code: '',
      name: '',
      op: false,
      hp: false,
      lb: false,
      press: '',
      run: '',
      tin: '',
      tout: '',
      phys: '',
      item: '',
      q: '',
      gw: '',
      tm: '',
      am: '',
      tgt: '',
      tgtAuto: false,
      good: '',
      rej: '',
      wt: '',
      pay: '',
      tbd: '',
      abd: '',
      rem: '',
    };
    onChangeDoc({ ...currentDoc, rows: [...rows, newRow] });
  };

  // Duplicate a row (e.g. create a helper row for the same press & product)
  const handleDuplicateRow = (index: number) => {
    const source = rows[index];
    const copyRow: PressRow = {
      ...source,
      id: `row_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: '',
      code: '',
      op: false,
      hp: true, // often duplicated for helper
      good: source.good,
      rej: source.rej,
      pay: source.pay,
    };
    const updated = [...rows];
    updated.splice(index + 1, 0, copyRow);
    onChangeDoc({ ...currentDoc, rows: updated });
  };

  // Delete row
  const handleDeleteRow = (index: number) => {
    const updated = rows.filter((_, idx) => idx !== index);
    onChangeDoc({ ...currentDoc, rows: updated });
  };

  // Automation: Fill Shift Timings
  const handleFillShiftTimings = () => {
    const [tin, tout] = shift === 'DAY' ? ['06:00', '18:00'] : ['18:00', '06:00'];
    const updated = rows.map((r) => {
      if (r.name && (!r.tin || !r.tout)) {
        const ph = calcPhysicalHours(tin, tout);
        return { ...r, tin, tout, phys: ph };
      }
      return r;
    });
    onChangeDoc({ ...currentDoc, rows: updated });
  };

  // Automation: Re-sync Auto Targets for all rows with Item and Press
  const handleResyncTargets = () => {
    const updated = rows.map((r) => {
      if (r.item && r.press) {
        const autoTgt = lookupTarget(itemMap, r.item, r.press);
        if (autoTgt != null) {
          const pay = calcHoursPayable(autoTgt, r.good, 12);
          return { ...r, tgt: autoTgt, tgtAuto: true, pay };
        }
      }
      return r;
    });
    onChangeDoc({ ...currentDoc, rows: updated });
  };

  // Clear unassigned empty rows
  const handleCleanEmptyRows = () => {
    const cleaned = rows.filter((r) => r.name || r.code || r.press || r.good);
    if (cleaned.length === 0) {
      handleAddRow();
      return;
    }
    onChangeDoc({ ...currentDoc, rows: cleaned });
  };

  // Clear all sheet entries
  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all rows in this sheet?')) {
      onChangeDoc({
        ...currentDoc,
        rows: [
          {
            id: `row_${Date.now()}`,
            code: '',
            name: '',
            op: false,
            hp: false,
            lb: false,
            press: '',
            run: '',
            tin: '',
            tout: '',
            phys: '',
            item: '',
            q: '',
            gw: '',
            tm: '',
            am: '',
            tgt: '',
            good: '',
            rej: '',
            wt: '',
            pay: '',
            tbd: '',
            abd: '',
            rem: '',
          },
        ],
      });
    }
  };

  // Filtered rows for presentation
  const displayedRows = useMemo(() => {
    return rows.map((r, originalIdx) => ({ r, originalIdx })).filter(({ r }) => {
      const matchSearch =
        !filterSearch ||
        r.name.toLowerCase().includes(filterSearch.toLowerCase()) ||
        r.code.toLowerCase().includes(filterSearch.toLowerCase()) ||
        r.press.toLowerCase().includes(filterSearch.toLowerCase()) ||
        r.item.toLowerCase().includes(filterSearch.toLowerCase());

      const matchRole =
        filterRole === 'all' ||
        (filterRole === 'operator' && r.op) ||
        (filterRole === 'helper' && r.hp) ||
        (filterRole === 'labour' && r.lb);

      return matchSearch && matchRole;
    });
  }, [rows, filterSearch, filterRole]);

  // Totals calculations
  const totals = useMemo(() => {
    let op = 0;
    let hp = 0;
    let lb = 0;
    let run = 0;
    let phys = 0;
    let itemsCount = 0;
    let tgt = 0;
    let good = 0;
    let rej = 0;
    let wt = 0;
    let pay = 0;

    rows.forEach((r) => {
      if (r.op) op++;
      if (r.hp) hp++;
      if (r.lb) lb++;
      run += num(r.run);
      if (typeof r.phys === 'number') phys += r.phys;
      if (r.item) itemsCount++;
      tgt += num(r.tgt);
      good += num(r.good);
      rej += num(r.rej);
      if (typeof r.wt === 'number') wt += r.wt;
      if (typeof r.pay === 'number') pay += r.pay;
    });

    const efficiency = phys > 0 ? (pay / phys) * 100 : 0;

    return { op, hp, lb, run, phys, itemsCount, tgt, good, rej, wt, pay, efficiency };
  }, [rows]);

  // Exports
  const handleExportExcel = () => {
    let docsToExport = [currentDoc];
    if (exportScope === 'both' && getOtherShiftDoc) {
      const other = getOtherShiftDoc();
      if (other) {
        docsToExport = [currentDoc, other];
      }
    }
    exportDailySheetToExcel(
      docsToExport,
      `PRESS_DATA_${formatDmy(date)}_${exportScope === 'both' ? 'DAY_NIGHT' : shift}.xlsx`
    );
  };

  const handleExportPdf = () => {
    let docsToExport = [currentDoc];
    if (exportScope === 'both' && getOtherShiftDoc) {
      const other = getOtherShiftDoc();
      if (other) {
        docsToExport = [currentDoc, other];
      }
    }
    exportDailySheetToPdf(
      docsToExport,
      `PRESS_DATA_${formatDmy(date)}_${exportScope === 'both' ? 'DAY_NIGHT' : shift}.pdf`
    );
  };

  // Deduplicate roster codes and names for datalist autocomplete
  const uniqueRosterCodes = useMemo(() => {
    const map = new Map<string, string>();
    registeredEmployees.forEach((e) => {
      if (e.code && !map.has(e.code)) {
        map.set(e.code, `${e.name} (${e.section})`);
      }
    });
    return Array.from(map.entries());
  }, [registeredEmployees]);

  const uniqueRosterNames = useMemo(() => {
    const map = new Map<string, string>();
    registeredEmployees.forEach((e) => {
      if (e.name && !map.has(e.name)) {
        map.set(e.name, `Code: ${e.code} (${e.defaultLabourType || 'OP'} - ${e.section})`);
      }
    });
    return Array.from(map.entries());
  }, [registeredEmployees]);

  return (
    <div className="max-w-[1880px] mx-auto p-2 sm:p-4 space-y-3">
      {/* Roster Datalists for Autocomplete & Roster Selection */}
      <datalist id="roster-codes">
        {uniqueRosterCodes.map(([code, label]) => (
          <option key={`rc_${code}`} value={code}>
            {label}
          </option>
        ))}
      </datalist>

      <datalist id="roster-names">
        {uniqueRosterNames.map(([name, label]) => (
          <option key={`rn_${name}`} value={name}>
            {label}
          </option>
        ))}
      </datalist>

      {/* Date Locked Warning Banner */}
      {isLocked && (
        <div className="bg-red-50 border border-red-300 text-red-900 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-red-600 shrink-0" />
            <span>
              <strong>Shift Finalized & Locked:</strong> This date ({formatDmy(date)} {shift}) is locked by Administrator.
              {currentUser?.role === 'SUPERVISOR'
                ? ' Supervisor modifications are disabled. Contact Admin to unlock.'
                : ' You are logged in as Admin with override access.'}
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-red-200/80 text-red-900 font-bold text-[10px] uppercase tracking-wider">
            LOCKED RECORD
          </span>
        </div>
      )}

      {/* Supervisor Policy Notification Banner */}
      {currentUser?.role === 'SUPERVISOR' && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <ClipboardList className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Supervisor Punch Mode Active:</strong> You are authorized to punch operational numbers (run hours, item, good/reject nos, moisture, BD).{' '}
              <strong className="text-blue-950 underline decoration-blue-500">
                Notice: Adding new employees is restricted to Admin only.
              </strong>{' '}
              Pick worker codes from the approved factory roster.
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-200/80 text-blue-900 font-bold text-[10px] uppercase tracking-wider">
            SUPERVISOR PUNCH ONLY
          </span>
        </div>
      )}

      {/* Action Toolbar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3">
        {/* Left actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" /> Add Row
          </button>

          <button
            type="button"
            onClick={handleFillShiftTimings}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-300 transition"
            title="Auto-fill standard 12-hour shift timings for all active workers"
          >
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            Fill Shift Timings ({shift === 'DAY' ? '06:00–18:00' : '18:00–06:00'})
          </button>

          <button
            type="button"
            onClick={handleResyncTargets}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-300 transition"
            title="Auto-lookup and apply 12h targets from matrix"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Auto-Sync Targets
          </button>

          <button
            type="button"
            onClick={handleCleanEmptyRows}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 text-xs font-medium transition"
            title="Remove unassigned empty rows"
          >
            Clean Empty
          </button>

          {/* Undo / Redo */}
          <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden ml-1">
            <button
              type="button"
              disabled={!canUndo}
              onClick={onUndo}
              className="p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={!canRedo}
              onClick={onRedo}
              className="p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30 transition"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right actions: Search, Filter, Export */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Quick Search */}
          <div className="relative w-48 sm:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search worker, press, item..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Export Scope & Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <select
              value={exportScope}
              onChange={(e) => setExportScope(e.target.value as any)}
              className="text-xs px-2 py-1 rounded border border-slate-300 bg-white"
            >
              <option value="one">This Shift ({shift})</option>
              <option value="both">Both (Day + Night)</option>
            </select>
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition"
              title="Download Excel spreadsheet"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-xs transition"
              title="Download PDF document"
            >
              <FileText className="w-3.5 h-3.5" />
              PDF
            </button>
          </div>

          <button
            type="button"
            onClick={handleClearAll}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            title="Clear all rows"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Punching Grid */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[75vh]">
          <table className="w-full border-collapse text-left text-xs text-slate-700 min-w-[2200px]">
            {/* Header row 1: Groups */}
            <thead className="bg-[#1f4e78] text-white font-semibold sticky top-0 z-20 text-[11px] uppercase tracking-wider">
              <tr>
                <th rowSpan={2} className="py-2 px-1 text-center border-r border-[#316999] w-10">
                  SL.
                </th>
                <th rowSpan={2} className="py-2 px-2 border-r border-[#316999] w-16">
                  EMP CODE
                </th>
                <th rowSpan={2} className="py-2 px-3 border-r border-[#316999] min-w-[180px]">
                  EMPLOYEE NAME
                </th>
                <th colSpan={3} className="py-1 px-1 text-center border-r border-[#316999]">
                  TYPE OF LABOUR
                </th>
                <th colSpan={2} className="py-1 px-1 text-center border-r border-[#316999]">
                  GENDER
                </th>
                <th rowSpan={2} className="py-2 px-2 border-r border-[#316999] w-28">
                  PRESS NO.
                </th>
                <th rowSpan={2} className="py-2 px-2 border-r border-[#316999] w-20 text-right">
                  RUN (H)
                </th>
                <th rowSpan={2} className="py-2 px-2 border-r border-[#316999] w-20 text-center">
                  TIME IN
                </th>
                <th rowSpan={2} className="py-2 px-2 border-r border-[#316999] w-20 text-center">
                  TIME OUT
                </th>
                <th rowSpan={2} className="py-2 px-2 border-r border-[#316999] w-24 text-right bg-[#173e60]">
                  PHYS HRS
                </th>
                <th rowSpan={2} className="py-2 px-3 border-r border-[#316999] min-w-[240px]">
                  NAME OF BRICKS
                </th>
                <th rowSpan={2} className="py-2 px-2 border-r border-[#316999] w-18 text-center">
                  QUALITY %
                </th>
                <th rowSpan={2} className="py-2 px-2 border-r border-[#316999] w-24 text-right">
                  GW (KG)
                </th>
                <th rowSpan={2} className="py-2 px-2 border-r border-[#316999] w-20 text-right">
                  T. MOIST
                </th>
                <th rowSpan={2} className="py-2 px-2 border-r border-[#316999] w-20 text-right">
                  A. MOIST
                </th>
                <th rowSpan={2} className="py-2 px-2 border-r border-[#316999] w-24 text-right">
                  12H TARGET
                </th>
                <th rowSpan={2} className="py-2 px-2 border-r border-[#316999] w-24 text-right">
                  GOOD NOS
                </th>
                <th rowSpan={2} className="py-2 px-2 border-r border-[#316999] w-20 text-right">
                  REJ NOS
                </th>
                <th rowSpan={2} className="py-2 px-2 border-r border-[#316999] w-24 text-right bg-[#173e60]">
                  WT (MT)
                </th>
                <th rowSpan={2} className="py-2 px-2 border-r border-[#316999] w-24 text-right bg-[#173e60]">
                  PAY (H)
                </th>
                <th rowSpan={2} className="py-2 px-2 border-r border-[#316999] w-20 text-right">
                  T.BD
                </th>
                <th rowSpan={2} className="py-2 px-2 border-r border-[#316999] w-20 text-right">
                  A.BD
                </th>
                <th rowSpan={2} className="py-2 px-2 border-r border-[#316999] min-w-[140px]">
                  REMARKS
                </th>
                <th rowSpan={2} className="py-2 px-2 text-center w-20">
                  ACTIONS
                </th>
              </tr>
              {/* Header row 2: Sub-headers */}
              <tr className="bg-[#194266]">
                <th className="py-1 px-1 border-r border-[#316999] text-center w-12 text-[10px]">OP</th>
                <th className="py-1 px-1 border-r border-[#316999] text-center w-12 text-[10px]">HP</th>
                <th className="py-1 px-1 border-r border-[#316999] text-center w-12 text-[10px]">LB</th>
                <th className="py-1 px-1 border-r border-[#316999] text-center w-10 text-[10px]">M</th>
                <th className="py-1 px-1 border-r border-[#316999] text-center w-10 text-[10px]">F</th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-slate-200">
              {displayedRows.map(({ r, originalIdx }, displayIndex) => {
                const isMr = /^\s*mr\.?(?!s)/i.test(r.name);
                const isMrs = /^\s*mrs\.?/i.test(r.name);
                const suggestedTgt = lookupTarget(itemMap, r.item, r.press);
                const hasTargetMismatch =
                  r.tgt && suggestedTgt != null && num(r.tgt) !== suggestedTgt;

                return (
                  <tr
                    key={r.id || `row_${originalIdx}_${r.code || displayIndex}`}
                    className="hover:bg-blue-50/40 transition group"
                  >
                    {/* SL. NO */}
                    <td className="py-1.5 px-1 border-r border-slate-200 text-center font-mono text-slate-400">
                      {originalIdx + 1}
                    </td>

                    {/* EMP CODE */}
                    <td className="py-1 px-1 border-r border-slate-200">
                      <input
                        type="text"
                        list="roster-codes"
                        value={r.code ?? ''}
                        disabled={isLocked && currentUser?.role === 'SUPERVISOR'}
                        onChange={(e) => handleCellChange(originalIdx, 'code', e.target.value)}
                        className="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded font-mono font-bold bg-transparent disabled:opacity-50"
                        placeholder="Code"
                        title={
                          currentUser?.role === 'SUPERVISOR'
                            ? 'Select code from registered roster'
                            : 'Employee code'
                        }
                      />
                    </td>

                    {/* EMPLOYEE NAME */}
                    <td className="py-1 px-1 border-r border-slate-200">
                      <input
                        type="text"
                        list="roster-names"
                        value={r.name ?? ''}
                        disabled={isLocked && currentUser?.role === 'SUPERVISOR'}
                        onChange={(e) => handleCellChange(originalIdx, 'name', e.target.value)}
                        className="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded font-medium text-slate-900 bg-transparent disabled:opacity-50"
                        placeholder="Select Worker..."
                        title={
                          currentUser?.role === 'SUPERVISOR'
                            ? 'Select worker from registered roster (Admin adds new workers)'
                            : 'Employee full name'
                        }
                      />
                    </td>

                    {/* OP */}
                    <td className="py-1 px-1 border-r border-slate-200 text-center">
                      <input
                        type="checkbox"
                        checked={Boolean(r.op)}
                        onChange={(e) => handleCellChange(originalIdx, 'op', e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>

                    {/* HP */}
                    <td className="py-1 px-1 border-r border-slate-200 text-center">
                      <input
                        type="checkbox"
                        checked={Boolean(r.hp)}
                        onChange={(e) => handleCellChange(originalIdx, 'hp', e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>

                    {/* LB */}
                    <td className="py-1 px-1 border-r border-slate-200 text-center">
                      <input
                        type="checkbox"
                        checked={Boolean(r.lb)}
                        onChange={(e) => handleCellChange(originalIdx, 'lb', e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>

                    {/* M */}
                    <td className="py-1 px-1 border-r border-slate-200 text-center font-bold text-slate-500 bg-slate-50 text-[11px]">
                      {isMr ? 'M' : ''}
                    </td>

                    {/* F */}
                    <td className="py-1 px-1 border-r border-slate-200 text-center font-bold text-pink-600 bg-slate-50 text-[11px]">
                      {isMrs ? 'F' : ''}
                    </td>

                    {/* PRESS NO */}
                    <td className="py-1 px-1 border-r border-slate-200">
                      <select
                        value={r.press ?? ''}
                        onChange={(e) => handleCellChange(originalIdx, 'press', e.target.value)}
                        className="w-full px-1 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded bg-transparent font-medium"
                      >
                        <option value="">— Select Press —</option>
                        {PRESSES.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* RUN (H) */}
                    <td className="py-1 px-1 border-r border-slate-200">
                      <input
                        type="number"
                        step="any"
                        value={r.run ?? ''}
                        onChange={(e) => handleCellChange(originalIdx, 'run', e.target.value)}
                        className="w-full px-1 py-1 text-xs text-right border border-transparent hover:border-slate-300 focus:border-blue-500 rounded font-mono bg-transparent"
                        placeholder="0"
                      />
                    </td>

                    {/* TIME IN */}
                    <td className="py-1 px-1 border-r border-slate-200">
                      <input
                        type="time"
                        value={r.tin ?? ''}
                        onChange={(e) => handleCellChange(originalIdx, 'tin', e.target.value)}
                        className="w-full px-1 py-1 text-xs text-center border border-transparent hover:border-slate-300 focus:border-blue-500 rounded font-mono bg-transparent"
                      />
                    </td>

                    {/* TIME OUT */}
                    <td className="py-1 px-1 border-r border-slate-200">
                      <input
                        type="time"
                        value={r.tout ?? ''}
                        onChange={(e) => handleCellChange(originalIdx, 'tout', e.target.value)}
                        className="w-full px-1 py-1 text-xs text-center border border-transparent hover:border-slate-300 focus:border-blue-500 rounded font-mono bg-transparent"
                      />
                    </td>

                    {/* PHYS HRS (Auto calculated) */}
                    <td className="py-1 px-2 border-r border-slate-200 text-right font-mono font-bold bg-slate-50 text-blue-900">
                      {formatNum(r.phys)}
                    </td>

                    {/* NAME OF BRICKS */}
                    <td className="py-1 px-1 border-r border-slate-200">
                      <input
                        type="text"
                        list="daily-item-list"
                        value={r.item ?? ''}
                        onChange={(e) => handleCellChange(originalIdx, 'item', e.target.value)}
                        className="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded bg-transparent"
                        placeholder="Select or enter item..."
                      />
                    </td>

                    {/* QUALITY % */}
                    <td className="py-1 px-1 border-r border-slate-200 text-center font-mono">
                      <input
                        type="text"
                        value={r.q ?? ''}
                        onChange={(e) => handleCellChange(originalIdx, 'q', e.target.value)}
                        className="w-full px-1 py-1 text-xs text-center border border-transparent hover:border-slate-300 focus:border-blue-500 rounded font-mono bg-transparent"
                        placeholder="%"
                      />
                    </td>

                    {/* GW (KG) */}
                    <td className="py-1 px-1 border-r border-slate-200">
                      <input
                        type="number"
                        step="any"
                        value={r.gw ?? ''}
                        onChange={(e) => handleCellChange(originalIdx, 'gw', e.target.value)}
                        className="w-full px-1 py-1 text-xs text-right border border-transparent hover:border-slate-300 focus:border-blue-500 rounded font-mono bg-transparent"
                        placeholder="0"
                      />
                    </td>

                    {/* T. MOIST */}
                    <td className="py-1 px-1 border-r border-slate-200">
                      <input
                        type="number"
                        step="any"
                        value={r.tm ?? ''}
                        onChange={(e) => handleCellChange(originalIdx, 'tm', e.target.value)}
                        className="w-full px-1 py-1 text-xs text-right border border-transparent hover:border-slate-300 focus:border-blue-500 rounded font-mono bg-transparent"
                        placeholder="0"
                      />
                    </td>

                    {/* A. MOIST */}
                    <td className="py-1 px-1 border-r border-slate-200">
                      <input
                        type="number"
                        step="any"
                        value={r.am ?? ''}
                        onChange={(e) => handleCellChange(originalIdx, 'am', e.target.value)}
                        className="w-full px-1 py-1 text-xs text-right border border-transparent hover:border-slate-300 focus:border-blue-500 rounded font-mono bg-transparent"
                        placeholder="0"
                      />
                    </td>

                    {/* 12H TARGET */}
                    <td className="py-1 px-1 border-r border-slate-200 relative">
                      <input
                        type="number"
                        value={r.tgt ?? ''}
                        onChange={(e) => handleCellChange(originalIdx, 'tgt', e.target.value)}
                        className={`w-full px-1 py-1 text-xs text-right border rounded font-mono font-bold ${
                          r.tgtAuto
                            ? 'border-emerald-200 text-emerald-800 bg-emerald-50/40'
                            : hasTargetMismatch
                            ? 'border-amber-300 text-amber-900 bg-amber-50/50'
                            : 'border-transparent hover:border-slate-300 bg-transparent'
                        }`}
                        placeholder="Target"
                        title={
                          r.tgtAuto
                            ? 'Auto-filled from Target Press Matrix'
                            : hasTargetMismatch
                            ? `Matrix suggests: ${suggestedTgt}`
                            : 'Manual target'
                        }
                      />
                    </td>

                    {/* GOOD NOS */}
                    <td className="py-1 px-1 border-r border-slate-200">
                      <input
                        type="number"
                        value={r.good ?? ''}
                        onChange={(e) => handleCellChange(originalIdx, 'good', e.target.value)}
                        className="w-full px-1 py-1 text-xs text-right border border-transparent hover:border-slate-300 focus:border-blue-500 rounded font-mono font-bold text-slate-900 bg-transparent"
                        placeholder="Good"
                      />
                    </td>

                    {/* REJ NOS */}
                    <td className="py-1 px-1 border-r border-slate-200">
                      <input
                        type="number"
                        value={r.rej ?? ''}
                        onChange={(e) => handleCellChange(originalIdx, 'rej', e.target.value)}
                        className="w-full px-1 py-1 text-xs text-right border border-transparent hover:border-slate-300 focus:border-blue-500 rounded font-mono text-rose-600 bg-transparent"
                        placeholder="Rej"
                      />
                    </td>

                    {/* WT (MT) (Auto calc) */}
                    <td className="py-1 px-2 border-r border-slate-200 text-right font-mono font-bold bg-slate-50 text-slate-800">
                      {formatNum(r.wt)}
                    </td>

                    {/* PAY (H) (Auto calc) */}
                    <td className="py-1 px-2 border-r border-slate-200 text-right font-mono font-bold bg-emerald-50 text-emerald-800">
                      {formatNum(r.pay)}
                    </td>

                    {/* T.BD */}
                    <td className="py-1 px-1 border-r border-slate-200">
                      <input
                        type="number"
                        step="any"
                        value={r.tbd ?? ''}
                        onChange={(e) => handleCellChange(originalIdx, 'tbd', e.target.value)}
                        className="w-full px-1 py-1 text-xs text-right border border-transparent hover:border-slate-300 focus:border-blue-500 rounded font-mono bg-transparent"
                        placeholder="BD"
                      />
                    </td>

                    {/* A.BD */}
                    <td className="py-1 px-1 border-r border-slate-200">
                      <input
                        type="number"
                        step="any"
                        value={r.abd ?? ''}
                        onChange={(e) => handleCellChange(originalIdx, 'abd', e.target.value)}
                        className="w-full px-1 py-1 text-xs text-right border border-transparent hover:border-slate-300 focus:border-blue-500 rounded font-mono bg-transparent"
                        placeholder="BD"
                      />
                    </td>

                    {/* REMARKS */}
                    <td className="py-1 px-1 border-r border-slate-200">
                      <input
                        type="text"
                        value={r.rem ?? ''}
                        onChange={(e) => handleCellChange(originalIdx, 'rem', e.target.value)}
                        className="w-full px-1.5 py-1 text-xs border border-transparent hover:border-slate-300 focus:border-blue-500 rounded bg-transparent text-slate-600"
                        placeholder="Notes..."
                      />
                    </td>

                    {/* ACTIONS */}
                    <td className="py-1 px-1 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenRowCorrection(r, originalIdx)}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded"
                          title="Open detailed row correction modal"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateRow(originalIdx)}
                          className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded"
                          title="Duplicate row for helper"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(originalIdx)}
                          className="p-1 text-slate-300 hover:text-rose-600 hover:bg-slate-100 rounded"
                          title="Delete row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Sticky Totals Bar */}
            <tfoot className="sticky bottom-0 z-20 bg-[#dce8f4] text-slate-900 font-bold border-t-2 border-[#1f4e78] font-mono text-xs">
              <tr>
                <td colSpan={3} className="py-2.5 px-3 font-sans text-left uppercase tracking-wider">
                  TOTALS ({rows.length} rows recorded)
                </td>
                <td className="py-2 px-1 text-center border-r border-blue-200">{totals.op}</td>
                <td className="py-2 px-1 text-center border-r border-blue-200">{totals.hp}</td>
                <td className="py-2 px-1 text-center border-r border-blue-200">{totals.lb}</td>
                <td className="py-2 px-1 text-center border-r border-blue-200">—</td>
                <td className="py-2 px-1 text-center border-r border-blue-200">—</td>
                <td className="py-2 px-2 border-r border-blue-200 text-slate-600 text-[11px] font-sans">
                  {totals.itemsCount} Items
                </td>
                <td className="py-2 px-2 text-right border-r border-blue-200">{formatNum(totals.run)}</td>
                <td className="py-2 px-2 text-center border-r border-blue-200">—</td>
                <td className="py-2 px-2 text-center border-r border-blue-200">—</td>
                <td className="py-2 px-2 text-right border-r border-blue-200 text-blue-900">
                  {formatNum(totals.phys)}
                </td>
                <td className="py-2 px-2 border-r border-blue-200 text-slate-600 text-[11px] font-sans">
                  Eff: {formatNum(totals.efficiency, 1)}%
                </td>
                <td className="py-2 px-2 text-center border-r border-blue-200">—</td>
                <td className="py-2 px-2 text-right border-r border-blue-200">—</td>
                <td className="py-2 px-2 text-right border-r border-blue-200">—</td>
                <td className="py-2 px-2 text-right border-r border-blue-200">—</td>
                <td className="py-2 px-2 text-right border-r border-blue-200">{formatNum(totals.tgt)}</td>
                <td className="py-2 px-2 text-right border-r border-blue-200 text-slate-900">
                  {formatNum(totals.good)}
                </td>
                <td className="py-2 px-2 text-right border-r border-blue-200 text-rose-700">
                  {formatNum(totals.rej)}
                </td>
                <td className="py-2 px-2 text-right border-r border-blue-200 text-slate-900">
                  {formatNum(totals.wt)} MT
                </td>
                <td className="py-2 px-2 text-right border-r border-blue-200 text-emerald-900">
                  {formatNum(totals.pay)} H
                </td>
                <td className="py-2 px-2 text-right border-r border-blue-200">—</td>
                <td className="py-2 px-2 text-right border-r border-blue-200">—</td>
                <td className="py-2 px-2 border-r border-blue-200">—</td>
                <td className="py-2 px-2 text-center">—</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Datalist for fast item suggestions */}
      <datalist id="daily-item-list">
        {items.map((it) => (
          <option key={it.name} value={it.name} />
        ))}
      </datalist>
    </div>
  );
};
