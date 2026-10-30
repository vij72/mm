import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  AlertTriangle,
  Calculator,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import { ItemTargetMapping, PressRow } from '../types/press';
import { PRESSES } from '../data/initialData';
import {
  calcGoodBrickWeightMT,
  calcHoursPayable,
  calcPhysicalHours,
  extractQualityPct,
  lookupTarget,
  num,
} from '../utils/calculations';

interface RowCorrectionModalProps {
  row: PressRow | null;
  rowIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onSaveRow: (updatedRow: PressRow, index: number) => void;
  items: ItemTargetMapping[];
  itemMap: Record<string, Record<string, number>>;
  shift: 'DAY' | 'NIGHT';
}

export const RowCorrectionModal: React.FC<RowCorrectionModalProps> = ({
  row,
  rowIndex,
  isOpen,
  onClose,
  onSaveRow,
  items,
  itemMap,
  shift,
}) => {
  if (!isOpen || !row) return null;

  const [formData, setFormData] = useState<PressRow>({ ...row });

  useEffect(() => {
    setFormData({ ...row });
  }, [row]);

  const updateField = <K extends keyof PressRow>(field: K, value: PressRow[K]) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-recalculate physical hours when timings change
      if (field === 'tin' || field === 'tout') {
        const ph = calcPhysicalHours(
          field === 'tin' ? String(value) : prev.tin,
          field === 'tout' ? String(value) : prev.tout
        );
        updated.phys = ph;
      }

      // Auto-extract quality and target when item or press changes
      if (field === 'item' || field === 'press') {
        const currentItem = field === 'item' ? String(value) : prev.item;
        const currentPress = field === 'press' ? String(value) : prev.press;

        if (field === 'item') {
          const q = extractQualityPct(currentItem);
          if (q) updated.q = q;
        }

        const autoTgt = lookupTarget(itemMap, currentItem, currentPress);
        if (autoTgt != null) {
          updated.tgt = autoTgt;
          updated.tgtAuto = true;
        }
      }

      // Recalculate weight in MT
      if (field === 'gw' || field === 'good') {
        const gw = field === 'gw' ? value : prev.gw;
        const good = field === 'good' ? value : prev.good;
        updated.wt = calcGoodBrickWeightMT(gw as number, good as number);
      }

      // Recalculate hours payable
      if (field === 'tgt' || field === 'good') {
        const tgt = field === 'tgt' ? value : prev.tgt;
        const good = field === 'good' ? value : prev.good;
        updated.pay = calcHoursPayable(tgt as number, good as number, 12);
      }

      return updated;
    });
  };

  const handleFillStandardTimes = () => {
    const [tin, tout] = shift === 'DAY' ? ['06:00', '18:00'] : ['18:00', '06:00'];
    updateField('tin', tin);
    updateField('tout', tout);
  };

  const handleApplyAutoTarget = () => {
    const autoTgt = lookupTarget(itemMap, formData.item, formData.press);
    if (autoTgt != null) {
      updateField('tgt', autoTgt);
      updateField('tgtAuto', true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveRow(formData, rowIndex);
    onClose();
  };

  const suggestedTarget = lookupTarget(itemMap, formData.item, formData.press);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Edit Row #{rowIndex + 1} - Correction Form</h2>
              <p className="text-xs text-slate-300">
                {formData.name || 'Unnamed Employee'} {formData.code ? `(Code: ${formData.code})` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 max-h-[80vh] overflow-y-auto text-slate-800">
          {/* Section 1: Employee Details & Labour Category */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              1. Employee & Role Identification
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Emp Code</label>
                <input
                  type="text"
                  value={formData.code ?? ''}
                  onChange={(e) => updateField('code', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="e.g. 59"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Employee Name</label>
                <input
                  type="text"
                  value={formData.name ?? ''}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="e.g. Mr.SANJAY KUMAR"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Labour Category</label>
              <div className="flex items-center gap-4 text-xs font-medium">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.op)}
                    onChange={(e) => updateField('op', e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Press Operator</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.hp)}
                    onChange={(e) => updateField('hp', e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Helper</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.lb)}
                    onChange={(e) => updateField('lb', e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Labour</span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Press & Shift Timings */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                2. Press Machine & Shift Timings
              </h3>
              <button
                type="button"
                onClick={handleFillStandardTimes}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
              >
                <Clock className="w-3 h-3" /> Fill Standard 12h ({shift})
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Press No.</label>
                <select
                  value={formData.press ?? ''}
                  onChange={(e) => updateField('press', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select Press...</option>
                  {PRESSES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Press Run (Hours)</label>
                <input
                  type="number"
                  step="any"
                  value={formData.run ?? ''}
                  onChange={(e) => updateField('run', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                  placeholder="e.g. 11.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Time In</label>
                <input
                  type="time"
                  value={formData.tin ?? ''}
                  onChange={(e) => updateField('tin', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Time Out</label>
                <input
                  type="time"
                  value={formData.tout ?? ''}
                  onChange={(e) => updateField('tout', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                />
              </div>
            </div>

            <div className="text-xs text-slate-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded flex items-center justify-between">
              <span>
                Calculated Physical Hours:{' '}
                <strong className="font-mono text-blue-700">
                  {formData.phys !== '' && formData.phys != null ? `${formData.phys} hrs` : 'Not recorded'}
                </strong>
              </span>
              <span className="text-[11px] text-slate-500">Auto-handles midnight shift rollover</span>
            </div>
          </div>

          {/* Section 3: Brick Item & Quality Specifications */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              3. Brick Item, Quality & Moisture
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Brick Item Name</label>
                <input
                  type="text"
                  list="item-options-list"
                  value={formData.item ?? ''}
                  onChange={(e) => updateField('item', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="Select or type brick item..."
                />
                <datalist id="item-options-list">
                  {items.map((it, idx) => (
                    <option key={`${it.name}_${idx}`} value={it.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Quality %</label>
                <input
                  type="text"
                  value={formData.q ?? ''}
                  onChange={(e) => updateField('q', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                  placeholder="e.g. 74%"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Green Unit Wt (Kg)</label>
                <input
                  type="number"
                  step="any"
                  value={formData.gw ?? ''}
                  onChange={(e) => updateField('gw', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                  placeholder="e.g. 4.8"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Moisture %</label>
                <input
                  type="number"
                  step="any"
                  value={formData.tm ?? ''}
                  onChange={(e) => updateField('tm', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                  placeholder="e.g. 3.2"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Actual Moisture %</label>
                <input
                  type="number"
                  step="any"
                  value={formData.am ?? ''}
                  onChange={(e) => updateField('am', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                  placeholder="e.g. 3.4"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Target, Production & Wage Conversion */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                4. Production Numbers & Wage Hours
              </h3>
              {suggestedTarget != null && (
                <button
                  type="button"
                  onClick={handleApplyAutoTarget}
                  className="text-[11px] text-emerald-600 hover:text-emerald-800 font-semibold flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" /> Auto Target ({suggestedTarget})
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  12h Target (Nos)
                  {suggestedTarget != null && (
                    <span className="text-[10px] text-emerald-600 ml-1 font-normal">
                      (Matrix: {suggestedTarget})
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  value={formData.tgt ?? ''}
                  onChange={(e) => {
                    updateField('tgt', e.target.value);
                    updateField('tgtAuto', false);
                  }}
                  className={`w-full text-xs px-2.5 py-1.5 rounded border focus:ring-2 bg-white font-mono ${
                    formData.tgtAuto
                      ? 'border-emerald-300 text-emerald-800 bg-emerald-50/50'
                      : 'border-slate-300 focus:ring-blue-500'
                  }`}
                  placeholder="e.g. 750"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Good Bricks (Nos)</label>
                <input
                  type="number"
                  value={formData.good ?? ''}
                  onChange={(e) => updateField('good', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white font-mono font-bold text-slate-900"
                  placeholder="e.g. 780"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rejected Bricks (Nos)</label>
                <input
                  type="number"
                  value={formData.rej ?? ''}
                  onChange={(e) => updateField('rej', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white font-mono text-red-600"
                  placeholder="e.g. 15"
                />
              </div>
            </div>

            {/* Calculated Values Summary */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-100 rounded border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block">Total Good Weight:</span>
                <span className="text-sm font-bold text-slate-800 font-mono">
                  {formData.wt !== '' && formData.wt != null ? `${formData.wt} MT` : '0 MT'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Hours Payable:</span>
                <span className="text-sm font-bold text-emerald-700 font-mono">
                  {formData.pay !== '' && formData.pay != null ? `${formData.pay} hrs` : '0 hrs'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 5: Bulk Density & Remarks */}
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              5. Bulk Density (BD) & Remarks
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target BD</label>
                <input
                  type="number"
                  step="any"
                  value={formData.tbd ?? ''}
                  onChange={(e) => updateField('tbd', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                  placeholder="e.g. 2.45"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Actual BD</label>
                <input
                  type="number"
                  step="any"
                  value={formData.abd ?? ''}
                  onChange={(e) => updateField('abd', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                  placeholder="e.g. 2.47"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={formData.rem ?? ''}
                  onChange={(e) => updateField('rem', e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="Shift notes..."
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
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
              Save Corrections
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
