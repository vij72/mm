import React, { useState } from 'react';
import {
  Settings2,
  Search,
  PlusCircle,
  Download,
  RotateCcw,
  Check,
  Edit,
  Save,
} from 'lucide-react';
import { ItemTargetMapping } from '../types/press';
import { INITIAL_ITEMS, PRESSES } from '../data/initialData';

interface TargetMatrixManagerProps {
  items: ItemTargetMapping[];
  onUpdateItems: (items: ItemTargetMapping[]) => void;
}

export const TargetMatrixManager: React.FC<TargetMatrixManagerProps> = ({
  items,
  onUpdateItems,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPressFilter, setSelectedPressFilter] = useState('ALL');
  const [editingCell, setEditingCell] = useState<{ itemIndex: number; press: string } | null>(null);
  const [cellVal, setCellVal] = useState<string>('');
  const [isAddingNewItem, setIsAddingNewItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPress, setNewItemPress] = useState(PRESSES[0]);
  const [newItemTarget, setNewItemTarget] = useState('500');

  const filteredItems = items.filter((it) => {
    const matchesSearch = !searchTerm || it.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPress =
      selectedPressFilter === 'ALL' ||
      (it.targets[selectedPressFilter] != null && it.targets[selectedPressFilter] > 0);
    return matchesSearch && matchesPress;
  });

  const handleStartEdit = (itemIndex: number, press: string, currentVal: number | undefined) => {
    setEditingCell({ itemIndex, press });
    setCellVal(currentVal != null ? String(currentVal) : '');
  };

  const handleSaveCell = () => {
    if (!editingCell) return;
    const { itemIndex, press } = editingCell;
    const updated = [...items];
    const item = { ...updated[itemIndex] };
    item.targets = { ...item.targets };

    const parsed = parseInt(cellVal, 10);
    if (!isNaN(parsed) && parsed > 0) {
      item.targets[press] = parsed;
    } else {
      delete item.targets[press];
    }

    updated[itemIndex] = item;
    onUpdateItems(updated);
    setEditingCell(null);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all Target Press Data back to factory original values (135 items)?')) {
      onUpdateItems(INITIAL_ITEMS);
    }
  };

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const targetNum = parseInt(newItemTarget, 10) || 500;
    const newItem: ItemTargetMapping = {
      name: newItemName.trim(),
      targets: {
        [newItemPress]: targetNum,
      },
    };

    onUpdateItems([newItem, ...items]);
    setNewItemName('');
    setIsAddingNewItem(false);
  };

  const exportMatrixCsv = () => {
    const headers = ['SL. NO', 'ITEM NAME BRICKS TO BE MADE IN PRESS', ...PRESSES];
    const rows = items.map((it, i) => [
      i + 1,
      `"${it.name}"`,
      ...PRESSES.map((p) => it.targets[p] || ''),
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = `TARGET_PRESS_DATA_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="max-w-[1880px] mx-auto p-4 space-y-4">
      {/* Header Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-amber-600" />
            Target Press Data Matrix (12 Hours Target Reference)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Master database mapping 135 Brick Product Items against 21 Press Capacities (from 30T to 630T).
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={exportMatrixCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            title="Reset to factory dataset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={() => setIsAddingNewItem(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white shadow-sm transition active:scale-95"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Add New Brick Item
          </button>
        </div>
      </div>

      {/* Add New Item Dialog */}
      {isAddingNewItem && (
        <form
          onSubmit={handleAddNewItem}
          className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex flex-wrap items-end gap-3 text-xs"
        >
          <div className="flex-1 min-w-[220px]">
            <label className="block font-semibold text-slate-800 mb-1">New Item Name / Code</label>
            <input
              type="text"
              required
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="e.g. HIGH ALUMINA 80% (SPECIAL 250)"
              className="w-full px-2.5 py-1.5 rounded border border-amber-300 bg-white"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-800 mb-1">Initial Press</label>
            <select
              value={newItemPress}
              onChange={(e) => setNewItemPress(e.target.value)}
              className="px-2.5 py-1.5 rounded border border-amber-300 bg-white"
            >
              {PRESSES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-800 mb-1">12h Target (Nos)</label>
            <input
              type="number"
              value={newItemTarget}
              onChange={(e) => setNewItemTarget(e.target.value)}
              className="w-28 px-2.5 py-1.5 rounded border border-amber-300 bg-white font-mono"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-1.5 bg-amber-600 text-white font-semibold rounded hover:bg-amber-500 transition"
            >
              Save Item
            </button>
            <button
              type="button"
              onClick={() => setIsAddingNewItem(false)}
              className="px-3 py-1.5 bg-slate-200 text-slate-700 font-semibold rounded hover:bg-slate-300 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-500">Filter by Press:</span>
            <select
              value={selectedPressFilter}
              onChange={(e) => setSelectedPressFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded border border-slate-300 bg-white"
            >
              <option value="ALL">All 21 Presses</option>
              {PRESSES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by brick item name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-amber-500 bg-white"
            />
          </div>
        </div>

        {/* Matrix Table */}
        <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[70vh]">
          <table className="w-full border-collapse text-xs text-slate-700">
            <thead className="sticky top-0 z-10 bg-slate-800 text-white font-semibold text-[11px]">
              <tr>
                <th className="py-2.5 px-2 border-r border-slate-700 w-12 text-center">#</th>
                <th className="py-2.5 px-3 border-r border-slate-700 text-left min-w-[240px] sticky left-0 z-20 bg-slate-800">
                  Item Name / Brick Specification
                </th>
                {PRESSES.map((p) => (
                  <th
                    key={p}
                    className={`py-2 px-2 border-r border-slate-700 text-center whitespace-nowrap min-w-[90px] ${
                      selectedPressFilter === p ? 'bg-amber-700' : ''
                    }`}
                  >
                    {p}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {filteredItems.map((item, itemIdx) => (
                <tr key={`${item.name}_${itemIdx}`} className="hover:bg-slate-50 transition">
                  <td className="py-2 px-2 border-r border-slate-200 text-center text-slate-400">
                    {itemIdx + 1}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 font-sans font-medium text-slate-900 sticky left-0 z-1 bg-white hover:bg-slate-50">
                    {item.name}
                  </td>
                  {PRESSES.map((press) => {
                    const isCellEditing =
                      editingCell?.itemIndex === itemIdx && editingCell?.press === press;
                    const val = item.targets[press];

                    if (isCellEditing) {
                      return (
                        <td key={press} className="py-1 px-1 border-r border-slate-200 bg-amber-100">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              autoFocus
                              value={cellVal}
                              onChange={(e) => setCellVal(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveCell();
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              className="w-16 px-1 py-0.5 text-xs bg-white border border-amber-400 rounded text-center font-bold"
                            />
                            <button
                              type="button"
                              onClick={handleSaveCell}
                              className="p-1 text-emerald-700 hover:bg-emerald-200 rounded"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={press}
                        onClick={() => handleStartEdit(itemIdx, press, val)}
                        className={`py-2 px-2 border-r border-slate-200 text-center cursor-pointer hover:bg-amber-50 transition ${
                          val != null
                            ? 'font-bold text-slate-900 bg-emerald-50/40'
                            : 'text-slate-300'
                        }`}
                        title="Click to edit target"
                      >
                        {val != null ? val : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-400 italic">
          * Click any target cell to edit its value directly. Press Enter or the check button to save.
        </p>
      </div>
    </div>
  );
};
