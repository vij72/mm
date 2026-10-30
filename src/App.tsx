import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { DailySheet } from './components/DailySheet';
import { WagesSheet } from './components/WagesSheet';
import { EmployeeManager } from './components/EmployeeManager';
import { TargetMatrixManager } from './components/TargetMatrixManager';
import { ShiftAnalytics } from './components/ShiftAnalytics';
import { RowCorrectionModal } from './components/RowCorrectionModal';
import { AddEmployeeModal } from './components/AddEmployeeModal';
import { AdminPanel } from './components/AdminPanel';
import { LoginModal } from './components/LoginModal';
import { AuthUser, Employee, ItemTargetMapping, PressRow, ShiftDoc, ShiftType } from './types/press';
import {
  buildItemMap,
  detectShiftFromDate,
  formatDmy,
} from './utils/calculations';
import {
  getAllSavedShiftDocs,
  getHourlyRatePref,
  getStoredAuthUser,
  getStoredEmployees,
  getStoredItems,
  isDayLocked,
  loadShiftDoc,
  saveShiftDoc,
  saveStoredAuthUser,
  saveStoredEmployees,
  saveStoredItems,
  setHourlyRatePref,
} from './utils/storage';

export default function App() {
  // Navigation tab
  const [currentTab, setCurrentTab] = useState<
    'daily' | 'admin' | 'wages' | 'employees' | 'targets' | 'analytics'
  >('daily');

  // Authentication State (Admin vs Supervisor)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getStoredAuthUser());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Master Data
  const [employees, setEmployees] = useState<Employee[]>(() => getStoredEmployees());
  const [items, setItems] = useState<ItemTargetMapping[]>(() => getStoredItems());
  const itemMap = useMemo(() => buildItemMap(items), [items]);

  // Hourly Rate for Wages
  const [hourlyRate, setHourlyRate] = useState<number>(() => getHourlyRatePref());

  // Date and Shift State
  const initialShiftInfo = detectShiftFromDate();
  const [date, setDate] = useState<string>(initialShiftInfo.date);
  const [shift, setShift] = useState<ShiftType>(initialShiftInfo.shift);
  const [autoShift, setAutoShift] = useState<boolean>(true);
  const [autoSave, setAutoSave] = useState<boolean>(true);

  // Day lock status
  const isCurrentDateLocked = useMemo(() => isDayLocked(date), [date]);

  // Active Shift Document
  const [currentDoc, setCurrentDoc] = useState<ShiftDoc>(() =>
    loadShiftDoc(initialShiftInfo.date, initialShiftInfo.shift, employees, items)
  );

  // Saved Docs Cache for multi-shift Wages calculations
  const [savedDocs, setSavedDocs] = useState<ShiftDoc[]>(() => getAllSavedShiftDocs());

  // Save status & timestamp
  const [saveStatus, setSaveStatus] = useState<'saved' | 'dirty' | 'saving' | 'new'>('new');
  const [lastSavedAt, setLastSavedAt] = useState<number | undefined>(undefined);

  // Undo / Redo stacks
  const [undoStack, setUndoStack] = useState<ShiftDoc[]>([]);
  const [redoStack, setRedoStack] = useState<ShiftDoc[]>([]);

  // Modals
  const [correctionTarget, setCorrectionTarget] = useState<{
    row: PressRow;
    index: number;
  } | null>(null);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);

  // Toast notifications
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Save timer ref for auto-save debounce
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Perform save to storage
  const handleSave = useCallback(
    (docToSave: ShiftDoc = currentDoc, isSilent = false) => {
      // If locked and user is Supervisor, reject save
      if (currentUser?.role === 'SUPERVISOR' && isDayLocked(docToSave.date)) {
        if (!isSilent) {
          showToast(`Cannot save: ${formatDmy(docToSave.date)} is locked by Admin`);
        }
        return;
      }
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      setSaveStatus('saving');
      const docWithAuthor: ShiftDoc = {
        ...docToSave,
        lastPunchedBy: currentUser?.name || 'Supervisor',
        lastPunchRole: currentUser?.role || 'SUPERVISOR',
      };
      saveShiftDoc(docWithAuthor);
      const now = Date.now();
      setLastSavedAt(now);
      setSaveStatus('saved');
      setSavedDocs(getAllSavedShiftDocs());
      if (!isSilent) {
        showToast(`Saved: ${formatDmy(docToSave.date)} ${docToSave.shift} Shift`);
      }
    },
    [currentDoc, currentUser, showToast]
  );

  // Switch Date or Shift
  const handleSwitchDateOrShift = useCallback(
    (newDate: string, newShift: ShiftType) => {
      // Flush any dirty state before switching
      if (saveStatus === 'dirty') {
        handleSave(currentDoc, true);
      }
      setDate(newDate);
      setShift(newShift);
      const loaded = loadShiftDoc(newDate, newShift, employees, items);
      setCurrentDoc(loaded);
      setSaveStatus(loaded.savedAt ? 'saved' : 'new');
      setLastSavedAt(loaded.savedAt);
      setUndoStack([]);
      setRedoStack([]);
    },
    [currentDoc, employees, handleSave, items, saveStatus]
  );

  // Auto shift ticker check (every 30 seconds)
  useEffect(() => {
    if (!autoShift) return;
    const interval = setInterval(() => {
      const live = detectShiftFromDate();
      if (live.date !== date || live.shift !== shift) {
        handleSwitchDateOrShift(live.date, live.shift);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [autoShift, date, shift, handleSwitchDateOrShift]);

  // Handle document changes with history
  const handleDocChange = useCallback(
    (newDoc: ShiftDoc) => {
      // Record undo state
      setUndoStack((prev) => [...prev.slice(-20), currentDoc]);
      setRedoStack([]);
      setCurrentDoc(newDoc);
      setSaveStatus('dirty');

      // Trigger auto-save debounce
      if (autoSave) {
        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = setTimeout(() => {
          handleSave(newDoc, true);
        }, 3000);
      }
    },
    [autoSave, currentDoc, handleSave]
  );

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => s.slice(0, -1));
    setRedoStack((s) => [...s, currentDoc]);
    setCurrentDoc(prev);
    setSaveStatus('dirty');
  }, [currentDoc, undoStack]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((s) => s.slice(0, -1));
    setUndoStack((s) => [...s, currentDoc]);
    setCurrentDoc(next);
    setSaveStatus('dirty');
  }, [currentDoc, redoStack]);

  // Keyboard shortcuts (Ctrl+S, Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave(currentDoc, false);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'y' || (e.key === 'z' && e.shiftKey))
      ) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentDoc, handleRedo, handleSave, handleUndo]);

  // Employee Master updates
  const handleUpdateEmployees = useCallback((newEmployees: Employee[]) => {
    setEmployees(newEmployees);
    saveStoredEmployees(newEmployees);
  }, []);

  const handleAddNewEmployee = useCallback(
    (newEmp: Employee, addToActiveSheet: boolean) => {
      if (currentUser?.role !== 'ADMIN') {
        showToast('Unauthorized: Only Admin can add new employees.');
        return;
      }
      const updated = [newEmp, ...employees];
      handleUpdateEmployees(updated);
      showToast(`Employee ${newEmp.name} (Code: ${newEmp.code}) registered to roster`);

      if (addToActiveSheet) {
        const newRow: PressRow = {
          id: `row_${Date.now()}`,
          code: newEmp.code,
          name: newEmp.name,
          op: newEmp.defaultLabourType === 'operator',
          hp: newEmp.defaultLabourType === 'helper',
          lb: newEmp.defaultLabourType === 'labour',
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
        };
        handleDocChange({ ...currentDoc, rows: [newRow, ...currentDoc.rows] });
      }
    },
    [currentDoc, currentUser, employees, handleDocChange, handleUpdateEmployees, showToast]
  );

  // Target Items updates
  const handleUpdateItems = useCallback((newItems: ItemTargetMapping[]) => {
    setItems(newItems);
    saveStoredItems(newItems);
  }, []);

  // Wages rate updates
  const handleChangeHourlyRate = useCallback((rate: number) => {
    setHourlyRate(rate);
    setHourlyRatePref(rate);
  }, []);

  // Helper to fetch other shift's doc for 2-shift combined exports
  const getOtherShiftDoc = useCallback((): ShiftDoc | null => {
    const otherShift: ShiftType = shift === 'DAY' ? 'NIGHT' : 'DAY';
    return loadShiftDoc(date, otherShift, employees, items);
  }, [date, employees, items, shift]);

  const activeWorkerCount = useMemo(() => {
    return currentDoc.rows.filter((r) => r.name || r.code).length;
  }, [currentDoc.rows]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 antialiased font-sans">
      {/* Top Navigation & Applet Controls */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        date={date}
        shift={shift}
        onChangeDate={(d) => {
          setAutoShift(false);
          handleSwitchDateOrShift(d, shift);
        }}
        onChangeShift={(s) => {
          setAutoShift(false);
          handleSwitchDateOrShift(date, s);
        }}
        autoShift={autoShift}
        onToggleAutoShift={(auto) => {
          setAutoShift(auto);
          if (auto) {
            const live = detectShiftFromDate();
            handleSwitchDateOrShift(live.date, live.shift);
          }
        }}
        autoSave={autoSave}
        onToggleAutoSave={setAutoSave}
        saveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        onSaveManual={() => handleSave(currentDoc, false)}
        onOpenAddEmployee={() => setIsAddEmployeeOpen(true)}
        totalActiveWorkers={activeWorkerCount}
        currentUser={currentUser}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        isDateLocked={isCurrentDateLocked}
      />

      {/* Main Tab Panels */}
      <main className="flex-1 pb-10">
        {currentTab === 'daily' && (
          <DailySheet
            currentDoc={currentDoc}
            onChangeDoc={handleDocChange}
            items={items}
            itemMap={itemMap}
            onOpenRowCorrection={(row, index) => setCorrectionTarget({ row, index })}
            onOpenAddEmployee={() => setIsAddEmployeeOpen(true)}
            onSaveManual={() => handleSave(currentDoc, false)}
            canUndo={undoStack.length > 0}
            canRedo={redoStack.length > 0}
            onUndo={handleUndo}
            onRedo={handleRedo}
            getOtherShiftDoc={getOtherShiftDoc}
            currentUser={currentUser}
            isLocked={isCurrentDateLocked}
            registeredEmployees={employees}
          />
        )}

        {currentTab === 'admin' && (
          <AdminPanel
            currentUser={currentUser}
            employees={employees}
            onUpdateEmployees={handleUpdateEmployees}
            onAddNewEmployee={handleAddNewEmployee}
            items={items}
            activeDate={date}
            activeShift={shift}
            onSelectDateAndShift={(d, s) => handleSwitchDateOrShift(d, s)}
            onOpenLoginModal={() => setIsLoginModalOpen(true)}
            showToast={showToast}
            currentDoc={currentDoc}
          />
        )}

        {currentTab === 'wages' && (
          <WagesSheet
            employees={employees}
            savedDocs={savedDocs}
            hourlyRate={hourlyRate}
            onChangeHourlyRate={handleChangeHourlyRate}
          />
        )}

        {currentTab === 'employees' && (
          <EmployeeManager
            employees={employees}
            onUpdateEmployees={handleUpdateEmployees}
            onOpenAddModal={() => setIsAddEmployeeOpen(true)}
            currentUser={currentUser}
          />
        )}

        {currentTab === 'targets' && (
          <TargetMatrixManager items={items} onUpdateItems={handleUpdateItems} />
        )}

        {currentTab === 'analytics' && <ShiftAnalytics currentDoc={currentDoc} />}
      </main>

      {/* Row Correction Modal */}
      {correctionTarget && (
        <RowCorrectionModal
          row={correctionTarget.row}
          rowIndex={correctionTarget.index}
          isOpen={true}
          onClose={() => setCorrectionTarget(null)}
          onSaveRow={(updatedRow, index) => {
            const updatedRows = [...currentDoc.rows];
            updatedRows[index] = updatedRow;
            handleDocChange({ ...currentDoc, rows: updatedRows });
            showToast(`Row #${index + 1} updated successfully`);
          }}
          items={items}
          itemMap={itemMap}
          shift={shift}
        />
      )}

      {/* Add Employee Modal (Admin Only) */}
      <AddEmployeeModal
        isOpen={isAddEmployeeOpen}
        onClose={() => setIsAddEmployeeOpen(false)}
        onAddEmployee={handleAddNewEmployee}
        existingEmployees={employees}
      />

      {/* Login & Role Switcher Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={(user) => {
          setCurrentUser(user);
          saveStoredAuthUser(user);
          showToast(`Active account: ${user.name} (${user.role})`);
        }}
        currentUser={currentUser}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-xl border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
