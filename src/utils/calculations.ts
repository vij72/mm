import { ItemTargetMapping, ShiftType } from '../types/press';

export function num(v: unknown): number {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return isNaN(n) ? 0 : n;
}

export function formatNum(v: number | string | null | undefined, decimals = 2): string {
  if (v === '' || v == null) return '';
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (isNaN(n)) return String(v);
  if (Number.isInteger(n)) return n.toString();
  return Number(n.toFixed(decimals)).toString();
}

/**
 * Calculates physical hours worked between time in and time out.
 * Handles overnight shift wraparound (e.g. 18:00 to 06:00 = 12.00 hours).
 */
export function calcPhysicalHours(tin: string, tout: string): number | '' {
  if (!tin || !tout) return '';
  const p1 = tin.split(':');
  const p2 = tout.split(':');
  if (p1.length < 2 || p2.length < 2) return '';
  const h1 = parseInt(p1[0], 10);
  const m1 = parseInt(p1[1], 10);
  const h2 = parseInt(p2[0], 10);
  const m2 = parseInt(p2[1], 10);
  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return '';

  let diffMin = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (diffMin < 0) {
    diffMin += 1440; // overnight 24hr wraparound
  }
  return Number((diffMin / 60).toFixed(2));
}

/**
 * Auto-extracts quality percentage (e.g. "74%", "47-52%", "80%") from item name.
 */
export function extractQualityPct(name: string): string {
  if (!name) return '';
  const match = /(\d{2,3}(?:-\d{2})?)\s*%/.exec(name);
  return match ? `${match[1]}%` : '';
}

/**
 * Normalizes item names for loose comparison (whitespace and case insensitive).
 */
export function normalizeKey(text: string): string {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Builds a fast lookup map from item name to target dictionary.
 */
export function buildItemMap(items: ItemTargetMapping[]): Record<string, Record<string, number>> {
  const map: Record<string, Record<string, number>> = {};
  for (const item of items) {
    map[normalizeKey(item.name)] = item.targets;
  }
  return map;
}

/**
 * Looks up the 12-hour target count for an item on a given press.
 */
export function lookupTarget(
  itemMap: Record<string, Record<string, number>>,
  itemName: string,
  pressName: string
): number | null {
  if (!itemName || !pressName) return null;
  const targets = itemMap[normalizeKey(itemName)];
  if (!targets) return null;
  const val = targets[pressName.trim()];
  return val != null ? val : null;
}

/**
 * Total Good Brick Weight in MT (Metric Tons).
 * Formula: (Green Unit Weight in Kgs * Actual Good Bricks) / 1000
 */
export function calcGoodBrickWeightMT(gwKg: number | string, goodCount: number | string): number | '' {
  const w = num(gwKg);
  const g = num(goodCount);
  if (w <= 0 || g <= 0) return '';
  return Number(((w * g) / 1000).toFixed(3));
}

/**
 * Piece-rate conversion: Hours payable based on target output.
 * Formula: (Shift Target Hours / 12h Target) * Good Bricks
 */
export function calcHoursPayable(
  target12h: number | string,
  goodCount: number | string,
  shiftHours = 12
): number | '' {
  const tgt = num(target12h);
  const good = num(goodCount);
  if (tgt <= 0 || good <= 0) return '';
  return Number(((shiftHours / tgt) * good).toFixed(2));
}

/**
 * Production Efficiency % = (Actual Good Bricks / Expected Bricks for Physical Hours) * 100
 */
export function calcEfficiencyPct(
  goodCount: number | string,
  target12h: number | string,
  physicalHours: number | string | '',
  shiftHours = 12
): number | null {
  const good = num(goodCount);
  const tgt = num(target12h);
  const phys = typeof physicalHours === 'number' ? physicalHours : num(physicalHours);
  if (tgt <= 0 || phys <= 0 || good <= 0) return null;
  const expected = (tgt / shiftHours) * phys;
  if (expected <= 0) return null;
  return Number(((good / expected) * 100).toFixed(1));
}

/**
 * Rejection Rate % = (Rejected Bricks / (Good Bricks + Rejected Bricks)) * 100
 */
export function calcRejectionRate(goodCount: number | string, rejCount: number | string): number | null {
  const good = num(goodCount);
  const rej = num(rejCount);
  const total = good + rej;
  if (total <= 0) return null;
  return Number(((rej / total) * 100).toFixed(1));
}

/**
 * Detects current shift and calendar date based on standard factory hours:
 * DAY: 06:00 to 18:00
 * NIGHT: 18:00 to 06:00 (if 00:00 to 05:59, date belongs to previous calendar day shift)
 */
export function detectShiftFromDate(now: Date = new Date()): { date: string; shift: ShiftType } {
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = now.getHours();
  if (h >= 6 && h < 18) {
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    return { date: dateStr, shift: 'DAY' };
  } else {
    const d = new Date(now);
    if (h < 6) {
      d.setDate(d.getDate() - 1);
    }
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    return { date: dateStr, shift: 'NIGHT' };
  }
}

/**
 * Formats YYYY-MM-DD to DD-MM-YYYY
 */
export function formatDmy(isoDate: string): string {
  if (!isoDate || !isoDate.includes('-')) return isoDate || '';
  const [y, m, d] = isoDate.split('-');
  return `${d}-${m}-${y}`;
}
