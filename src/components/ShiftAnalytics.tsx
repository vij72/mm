import React from 'react';
import {
  BarChart3,
  TrendingUp,
  Percent,
  Weight,
  Layers,
  AlertTriangle,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { ShiftDoc } from '../types/press';
import { formatNum, num } from '../utils/calculations';

interface ShiftAnalyticsProps {
  currentDoc: ShiftDoc;
}

export const ShiftAnalytics: React.FC<ShiftAnalyticsProps> = ({ currentDoc }) => {
  const rows = currentDoc.rows.filter((r) => r.name || r.code || r.press || r.good);

  const totalGood = rows.reduce((acc, r) => acc + num(r.good), 0);
  const totalRej = rows.reduce((acc, r) => acc + num(r.rej), 0);
  const totalProduced = totalGood + totalRej;
  const rejectionRate = totalProduced > 0 ? (totalRej / totalProduced) * 100 : 0;

  const totalWeightMT = rows.reduce(
    (acc, r) => acc + (typeof r.wt === 'number' ? r.wt : 0),
    0
  );

  const totalPhysicalHours = rows.reduce(
    (acc, r) => acc + (typeof r.phys === 'number' ? r.phys : 0),
    0
  );

  const totalPayableHours = rows.reduce(
    (acc, r) => acc + (typeof r.pay === 'number' ? r.pay : 0),
    0
  );

  const overallEfficiency =
    totalPhysicalHours > 0 ? (totalPayableHours / totalPhysicalHours) * 100 : 0;

  // Group by press
  const pressProduction: Record<string, { good: number; rej: number; weight: number }> = {};
  rows.forEach((r) => {
    if (!r.press) return;
    if (!pressProduction[r.press]) {
      pressProduction[r.press] = { good: 0, rej: 0, weight: 0 };
    }
    pressProduction[r.press].good += num(r.good);
    pressProduction[r.press].rej += num(r.rej);
    pressProduction[r.press].weight += typeof r.wt === 'number' ? r.wt : 0;
  });

  const sortedPresses = Object.entries(pressProduction).sort((a, b) => b[1].good - a[1].good);

  return (
    <div className="max-w-[1880px] mx-auto p-4 space-y-4">
      {/* Top Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-600" />
            Shift Production KPIs & Machine Efficiency
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time analytics for {currentDoc.shift} shift on {currentDoc.date}.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Good Bricks</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">{formatNum(totalGood)}</div>
          <p className="text-[11px] text-slate-500 mt-1">Total saleable refractory bricks</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Tonnage</span>
            <Weight className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-blue-700">{formatNum(totalWeightMT)} MT</div>
          <p className="text-[11px] text-slate-500 mt-1">Calculated from green unit weights</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Scrap / Rejection</span>
            <AlertTriangle className={`w-4 h-4 ${rejectionRate > 5 ? 'text-amber-500' : 'text-slate-400'}`} />
          </div>
          <div className={`text-2xl font-bold font-mono ${rejectionRate > 5 ? 'text-amber-600' : 'text-slate-900'}`}>
            {formatNum(rejectionRate, 1)}%
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{totalRej} rejected bricks recorded</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Shift Efficiency</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-700">
            {totalPhysicalHours > 0 ? `${formatNum(overallEfficiency, 1)}%` : '—'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {formatNum(totalPayableHours)} payable / {formatNum(totalPhysicalHours)} physical hrs
          </p>
        </div>
      </div>

      {/* Press Machine Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-600" />
          Press Output & Utilization Ranking
        </h3>

        {sortedPresses.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">
            No press production numbers recorded yet for this shift.
          </p>
        ) : (
          <div className="space-y-3">
            {sortedPresses.map(([press, data]) => {
              const maxGood = sortedPresses[0][1].good || 1;
              const barWidth = Math.max(8, (data.good / maxGood) * 100);

              return (
                <div key={press} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{press}</span>
                    <span className="font-mono text-slate-600">
                      <strong>{formatNum(data.good)} bricks</strong> ({formatNum(data.weight)} MT)
                      {data.rej > 0 && (
                        <span className="text-red-500 ml-1.5 font-normal">[{data.rej} rej]</span>
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
