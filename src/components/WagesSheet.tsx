import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  DollarSign,
  Users,
  CheckSquare,
} from 'lucide-react';
import { Employee, ShiftDoc } from '../types/press';
import { formatDmy, formatNum, num } from '../utils/calculations';
import { exportWagesToExcel, WagesExportData } from '../utils/exportExcel';

interface WagesSheetProps {
  employees: Employee[];
  savedDocs: ShiftDoc[];
  hourlyRate: number;
  onChangeHourlyRate: (rate: number) => void;
}

export const WagesSheet: React.FC<WagesSheetProps> = ({
  employees,
  savedDocs,
  hourlyRate,
  onChangeHourlyRate,
}) => {
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const defaultTo = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const defaultFrom = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`;

  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(defaultTo);
  const [metric, setMetric] = useState<'pay' | 'phys' | 'good'>('pay');
  const [shiftFilter, setShiftFilter] = useState<'ALL' | 'DAY' | 'NIGHT'>('ALL');
  const [onlyActive, setOnlyActive] = useState(false);

  // Generate date array
  const dateList = useMemo(() => {
    const list: string[] = [];
    if (!fromDate || !toDate || fromDate > toDate) return list;
    const start = new Date(fromDate + 'T00:00:00');
    const end = new Date(toDate + 'T00:00:00');
    let curr = new Date(start);
    while (curr <= end && list.length < 62) {
      list.push(`${curr.getFullYear()}-${pad(curr.getMonth() + 1)}-${pad(curr.getDate())}`);
      curr.setDate(curr.getDate() + 1);
    }
    return list;
  }, [fromDate, toDate]);

  // Aggregate worker records
  const wagesData = useMemo(() => {
    // Map of unique employee key -> aggregated row
    const empMap = new Map<
      string,
      {
        code: string;
        name: string;
        type: string;
        gender: string;
        dayValues: Record<string, number>;
      }
    >();

    // Seed from employees
    employees.forEach((emp) => {
      const key = emp.code ? `C_${emp.code}` : `N_${emp.name.toLowerCase()}`;
      empMap.set(key, {
        code: emp.code,
        name: emp.name,
        type: emp.defaultLabourType ? emp.defaultLabourType.toUpperCase() : 'OPERATOR',
        gender: emp.gender || (emp.name.toLowerCase().includes('mrs') ? 'F' : 'M'),
        dayValues: {},
      });
    });

    // Process all matching savedDocs
    savedDocs.forEach((doc) => {
      if (shiftFilter !== 'ALL' && doc.shift !== shiftFilter) return;
      if (doc.date < fromDate || doc.date > toDate) return;

      doc.rows.forEach((r) => {
        if (!r.name && !r.code) return;
        const key = r.code ? `C_${r.code}` : `N_${r.name.toLowerCase()}`;
        if (!empMap.has(key)) {
          empMap.set(key, {
            code: r.code,
            name: r.name,
            type: r.op ? 'OPERATOR' : r.hp ? 'HELPER' : r.lb ? 'LABOUR' : '',
            gender: /^\s*mrs\.?/i.test(r.name) ? 'F' : 'M',
            dayValues: {},
          });
        }

        const entry = empMap.get(key)!;
        if (!entry.type) {
          entry.type = r.op ? 'OPERATOR' : r.hp ? 'HELPER' : r.lb ? 'LABOUR' : '';
        }

        let val = 0;
        if (metric === 'pay') {
          val = typeof r.pay === 'number' ? r.pay : num(r.pay);
        } else if (metric === 'phys') {
          val = typeof r.phys === 'number' ? r.phys : num(r.phys);
        } else if (metric === 'good') {
          val = num(r.good);
        }

        if (val > 0) {
          entry.dayValues[doc.date] = (entry.dayValues[doc.date] || 0) + val;
        }
      });
    });

    // Build final list with totals
    let list = Array.from(empMap.values()).map((emp) => {
      const total = dateList.reduce((acc, d) => acc + (emp.dayValues[d] || 0), 0);
      const daysWorked = dateList.filter((d) => (emp.dayValues[d] || 0) > 0).length;
      return {
        ...emp,
        total,
        daysWorked,
        amount: total * hourlyRate,
      };
    });

    if (onlyActive) {
      list = list.filter((e) => e.total > 0 || e.daysWorked > 0);
    }

    return list;
  }, [employees, savedDocs, fromDate, toDate, shiftFilter, metric, dateList, hourlyRate, onlyActive]);

  // Totals
  const colTotals = useMemo(() => {
    return dateList.map((d) =>
      wagesData.reduce((acc, emp) => acc + (emp.dayValues[d] || 0), 0)
    );
  }, [dateList, wagesData]);

  const grandTotal = useMemo(
    () => wagesData.reduce((acc, emp) => acc + emp.total, 0),
    [wagesData]
  );
  const grandDaysWorked = useMemo(
    () => wagesData.reduce((acc, emp) => acc + emp.daysWorked, 0),
    [wagesData]
  );
  const grandAmount = useMemo(() => grandTotal * hourlyRate, [grandTotal, hourlyRate]);

  const metricLabel =
    metric === 'pay'
      ? 'HOURS PAYABLE'
      : metric === 'phys'
      ? 'PHYSICAL HOURS'
      : 'GOOD BRICKS MADE';

  const handleExportExcel = () => {
    const exportData: WagesExportData = {
      fromDate,
      toDate,
      shift: shiftFilter,
      metricLabel,
      dates: dateList,
      rate: hourlyRate,
      rows: wagesData,
    };
    exportWagesToExcel(
      exportData,
      `WAGES_SHEET_${formatDmy(fromDate)}_TO_${formatDmy(toDate)}.xlsx`
    );
  };

  return (
    <div className="max-w-[1880px] mx-auto p-4 space-y-4">
      {/* Top Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            Wages & Attendance Multi-Day Accounting Sheet
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cross-shift wages report converted from Good Bricks or Physical Hours with customized wage rate calculations.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportExcel}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-sm transition active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          Download Excel (.xlsx)
        </button>
      </div>

      {/* Controls Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-wrap items-end gap-3.5 text-xs text-slate-700">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Display Metric</label>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
          >
            <option value="pay">Hours Payable (Piece Rate from Bricks)</option>
            <option value="phys">Physical Hours (Time In - Time Out)</option>
            <option value="good">Good Bricks Made (Nos)</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Shift</label>
          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value as any)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
          >
            <option value="ALL">Day + Night (All)</option>
            <option value="DAY">Day Shift Only</option>
            <option value="NIGHT">Night Shift Only</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Wage Rate / Hr</label>
          <div className="relative">
            <span className="absolute left-2.5 top-1.5 text-slate-400 font-mono">₹</span>
            <input
              type="number"
              min="0"
              step="any"
              value={hourlyRate || ''}
              onChange={(e) => onChangeHourlyRate(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="pl-6 pr-2.5 py-1.5 w-24 rounded-lg border border-slate-300 bg-white font-mono"
            />
          </div>
        </div>

        <label className="flex items-center gap-1.5 cursor-pointer pb-1.5">
          <input
            type="checkbox"
            checked={onlyActive}
            onChange={(e) => setOnlyActive(e.target.checked)}
            className="rounded text-emerald-600 focus:ring-emerald-500"
          />
          <span className="font-medium text-slate-700">Only Active Workers</span>
        </label>
      </div>

      {/* Wages Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Workers Listed
          </span>
          <span className="text-xl font-bold text-slate-900 font-mono">{wagesData.length}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total {metricLabel}
          </span>
          <span className="text-xl font-bold text-emerald-600 font-mono">
            {formatNum(grandTotal)}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Mandays Worked
          </span>
          <span className="text-xl font-bold text-blue-600 font-mono">{grandDaysWorked}</span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Estimated Total Payout
          </span>
          <span className="text-xl font-bold text-purple-600 font-mono">
            {hourlyRate > 0 ? `₹${formatNum(grandAmount)}` : 'Set Rate'}
          </span>
        </div>
      </div>

      {/* Main Aggregated Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto max-h-[72vh]">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="sticky top-0 z-20 bg-emerald-800 text-white font-semibold text-[11px]">
              <tr>
                <th className="py-2.5 px-2 border-r border-emerald-700 w-12 text-center">#</th>
                <th className="py-2.5 px-3 border-r border-emerald-700 w-16">Emp Code</th>
                <th className="py-2.5 px-3 border-r border-emerald-700 min-w-[200px]">Employee Name</th>
                <th className="py-2.5 px-2 border-r border-emerald-700 w-20">Type</th>
                <th className="py-2.5 px-2 border-r border-emerald-700 w-12 text-center">M/F</th>

                {dateList.map((d) => (
                  <th
                    key={d}
                    className="py-2 px-2 border-r border-emerald-700 text-right font-mono min-w-[55px]"
                  >
                    {d.slice(8)}/{d.slice(5, 7)}
                  </th>
                ))}

                <th className="py-2.5 px-3 border-r border-emerald-700 text-right font-mono bg-emerald-900 min-w-[80px]">
                  TOTAL
                </th>
                <th className="py-2.5 px-3 border-r border-emerald-700 text-right font-mono bg-emerald-900 min-w-[70px]">
                  DAYS
                </th>
                {hourlyRate > 0 && (
                  <th className="py-2.5 px-3 text-right font-mono bg-emerald-950 min-w-[90px]">
                    AMOUNT (₹)
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {wagesData.map((emp, idx) => (
                <tr key={`${emp.code}_${emp.name}_${idx}`} className="hover:bg-slate-50 transition">
                  <td className="py-2 px-2 border-r border-slate-200 text-center text-slate-400">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 font-bold text-slate-900">
                    {emp.code}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 font-sans font-medium text-slate-800">
                    {emp.name}
                  </td>
                  <td className="py-2 px-2 border-r border-slate-200 text-slate-600 font-sans text-[11px]">
                    {emp.type}
                  </td>
                  <td className="py-2 px-2 border-r border-slate-200 text-center font-bold text-slate-700">
                    {emp.gender}
                  </td>

                  {dateList.map((d) => {
                    const val = emp.dayValues[d];
                    return (
                      <td
                        key={d}
                        className={`py-2 px-2 border-r border-slate-200 text-right ${
                          val ? 'font-bold text-slate-900 bg-emerald-50/40' : 'text-slate-300'
                        }`}
                      >
                        {val ? formatNum(val) : '—'}
                      </td>
                    );
                  })}

                  <td className="py-2 px-3 border-r border-slate-200 text-right font-bold text-emerald-800 bg-slate-50">
                    {formatNum(emp.total)}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-200 text-right font-bold text-blue-800 bg-slate-50">
                    {emp.daysWorked}
                  </td>
                  {hourlyRate > 0 && (
                    <td className="py-2 px-3 text-right font-bold text-purple-800 bg-purple-50/40">
                      ₹{formatNum(emp.amount)}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {/* Sticky Totals Footer */}
            <tfoot className="sticky bottom-0 z-20 bg-emerald-100 text-slate-900 font-bold border-t-2 border-emerald-400 font-mono">
              <tr>
                <td colSpan={5} className="py-2.5 px-3 font-sans text-left">
                  TOTALS ({wagesData.length} Workers)
                </td>
                {colTotals.map((tot, idx) => (
                  <td key={dateList[idx]} className="py-2.5 px-2 text-right border-r border-emerald-200">
                    {tot > 0 ? formatNum(tot) : '—'}
                  </td>
                ))}
                <td className="py-2.5 px-3 text-right border-r border-emerald-300 text-emerald-900">
                  {formatNum(grandTotal)}
                </td>
                <td className="py-2.5 px-3 text-right border-r border-emerald-300 text-blue-900">
                  {grandDaysWorked}
                </td>
                {hourlyRate > 0 && (
                  <td className="py-2.5 px-3 text-right text-purple-900">
                    ₹{formatNum(grandAmount)}
                  </td>
                )}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
