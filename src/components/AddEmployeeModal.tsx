import React, { useState, useEffect } from 'react';
import { X, UserPlus, Check, Sparkles } from 'lucide-react';
import { Employee, Gender, LabourType } from '../types/press';

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEmployee: (emp: Employee, addToActiveSheet: boolean) => void;
  existingEmployees: Employee[];
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  isOpen,
  onClose,
  onAddEmployee,
  existingEmployees,
}) => {
  if (!isOpen) return null;

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [section, setSection] = useState('pressDay');
  const [customSection, setCustomSection] = useState('');
  const [gender, setGender] = useState<Gender>('M');
  const [defaultLabourType, setDefaultLabourType] = useState<LabourType>('operator');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [addToActiveSheet, setAddToActiveSheet] = useState(true);

  // Suggest next code
  useEffect(() => {
    const numericCodes = existingEmployees
      .map((e) => parseInt(e.code, 10))
      .filter((n) => !isNaN(n));
    const nextNum = numericCodes.length > 0 ? Math.max(...numericCodes) + 1 : 1;
    setCode(String(nextNum));
  }, [existingEmployees]);

  // Auto-detect gender from name prefix
  const handleNameChange = (val: string) => {
    setName(val);
    if (/^\s*mrs\.?/i.test(val)) {
      setGender('F');
    } else if (/^\s*mr\.?/i.test(val)) {
      setGender('M');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalSection = section === 'custom' ? customSection.trim() || 'General' : section;

    const newEmp: Employee = {
      code: code.trim(),
      name: name.trim(),
      section: finalSection,
      gender,
      defaultLabourType,
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
      isActive: true,
    };

    onAddEmployee(newEmp, addToActiveSheet);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Add New Employee</h2>
              <p className="text-xs text-slate-400">Create employee and register to factory roster</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-slate-800">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Emp Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="e.g. 521"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Employee Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Mr. AMIT KUMAR or Mrs. SUMAN DEVI"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department / Section
              </label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="pressDay">Press Section (Day Shift)</option>
                <option value="pressNight">Press Section (Night Shift)</option>
                <option value="millDay">Mill Section (Day)</option>
                <option value="millNight">Mill Section (Night)</option>
                <option value="tkl">TKL Group</option>
                <option value="tkp">TKP Group</option>
                <option value="odisha">Odisha Contractor</option>
                <option value="custom">Other / Custom Section...</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Labour Role
              </label>
              <select
                value={defaultLabourType}
                onChange={(e) => setDefaultLabourType(e.target.value as LabourType)}
                className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="operator">Press Operator</option>
                <option value="helper">Helper</option>
                <option value="labour">General Labour</option>
              </select>
            </div>
          </div>

          {section === 'custom' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Custom Section Name
              </label>
              <input
                type="text"
                value={customSection}
                onChange={(e) => setCustomSection(e.target.value)}
                className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Kiln Section, Quality Control"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
              <div className="flex items-center gap-4 text-xs pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="M"
                    checked={gender === 'M'}
                    onChange={() => setGender('M')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Male (M)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="F"
                    checked={gender === 'F'}
                    onChange={() => setGender('F')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Female (F)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Remarks</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Experienced with 630T ESP & Hydraulic presses"
            />
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-blue-900">
              <input
                type="checkbox"
                checked={addToActiveSheet}
                onChange={(e) => setAddToActiveSheet(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>Directly add as a working row in current daily production sheet</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition flex items-center gap-1.5 active:scale-95"
            >
              <Check className="w-4 h-4" />
              Save Employee
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
