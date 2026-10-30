import {
  AuthUser,
  DayWiseSummary,
  Employee,
  ItemTargetMapping,
  PressRow,
  ShiftDoc,
  ShiftType,
} from '../types/press';
import { INITIAL_EMPLOYEES, INITIAL_ITEMS, RAW_ROSTERS, SHIFT_DEFAULTS } from '../data/initialData';
import { buildItemMap, extractQualityPct, lookupTarget } from './calculations';

const PREFIX = 'presspro:';

// Safe memory storage fallback when localStorage is restricted or in an iframe sandbox
const memoryStore = new Map<string, string>();

const safeStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(key);
        if (val !== null) return val;
      }
    } catch {
      // Storage restricted, fallback to memory
    }
    return memoryStore.get(key) ?? null;
  },

  setItem(key: string, val: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, val);
      }
    } catch {
      // Storage restricted, fallback to memory
    }
    memoryStore.set(key, val);
  },

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Storage restricted
    }
    memoryStore.delete(key);
  },

  getAllKeys(): string[] {
    const keys = new Set<string>();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        for (let i = 0; i < window.localStorage.length; i++) {
          const k = window.localStorage.key(i);
          if (k) keys.add(k);
        }
      }
    } catch {
      // Storage restricted
    }
    memoryStore.forEach((_, k) => keys.add(k));
    return Array.from(keys);
  },
};

export function getStoredEmployees(): Employee[] {
  try {
    const raw = safeStorage.getItem(`${PREFIX}employees`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Return initial employees
  }
  saveStoredEmployees(INITIAL_EMPLOYEES);
  return INITIAL_EMPLOYEES;
}

export function saveStoredEmployees(employees: Employee[]): void {
  try {
    safeStorage.setItem(`${PREFIX}employees`, JSON.stringify(employees));
  } catch {
    // Ignore
  }
}

export function getStoredItems(): ItemTargetMapping[] {
  try {
    const raw = safeStorage.getItem(`${PREFIX}items`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Return initial items
  }
  saveStoredItems(INITIAL_ITEMS);
  return INITIAL_ITEMS;
}

export function saveStoredItems(items: ItemTargetMapping[]): void {
  try {
    safeStorage.setItem(`${PREFIX}items`, JSON.stringify(items));
  } catch {
    // Ignore
  }
}

export function getShiftKey(date: string, shift: ShiftType): string {
  return `${date}__${shift}`;
}

export function sanitizeRow(r: Partial<PressRow> | null | undefined, idx: number): PressRow {
  const safe = r || {};
  return {
    id: safe.id || `row_${idx}_${Math.random().toString(36).slice(2, 7)}`,
    code: safe.code != null ? String(safe.code) : '',
    name: safe.name != null ? String(safe.name) : '',
    op: Boolean(safe.op),
    hp: Boolean(safe.hp),
    lb: Boolean(safe.lb),
    press: safe.press != null ? String(safe.press) : '',
    run: safe.run != null ? safe.run : '',
    tin: safe.tin != null ? String(safe.tin) : '',
    tout: safe.tout != null ? String(safe.tout) : '',
    phys: typeof safe.phys === 'number' || safe.phys === '' ? safe.phys : '',
    item: safe.item != null ? String(safe.item) : '',
    q: safe.q != null ? String(safe.q) : '',
    gw: safe.gw != null ? safe.gw : '',
    tm: safe.tm != null ? safe.tm : '',
    am: safe.am != null ? safe.am : '',
    tgt: safe.tgt != null ? safe.tgt : '',
    tgtAuto: Boolean(safe.tgtAuto),
    good: safe.good != null ? safe.good : '',
    rej: safe.rej != null ? safe.rej : '',
    wt: typeof safe.wt === 'number' || safe.wt === '' ? safe.wt : '',
    pay: typeof safe.pay === 'number' || safe.pay === '' ? safe.pay : '',
    tbd: safe.tbd != null ? safe.tbd : '',
    abd: safe.abd != null ? safe.abd : '',
    rem: safe.rem != null ? String(safe.rem) : '',
  };
}

export function createBlankRow(
  code = '',
  name = '',
  defaultPress = '',
  defaultItem = '',
  rowIdx = 0
): PressRow {
  return {
    id: `row_${Date.now()}_${rowIdx}_${Math.random().toString(36).slice(2, 7)}`,
    code,
    name,
    op: false,
    hp: false,
    lb: false,
    press: defaultPress,
    run: '',
    tin: '',
    tout: '',
    phys: '',
    item: defaultItem,
    q: defaultItem ? extractQualityPct(defaultItem) : '',
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
}

export function generateFreshShiftDoc(
  date: string,
  shift: ShiftType,
  allEmployees: Employee[],
  items: ItemTargetMapping[]
): ShiftDoc {
  const itemMap = buildItemMap(items);
  const rosterKey = shift === 'DAY' ? 'pressDay' : 'pressNight';
  let shiftEmps = allEmployees.filter((e) => e.section === rosterKey && e.isActive !== false);

  if (shiftEmps.length === 0) {
    const rawList = RAW_ROSTERS[rosterKey] || [];
    shiftEmps = rawList.map(([code, name]) => ({
      code,
      name,
      section: rosterKey,
      gender: /^\s*mrs\.?/i.test(name) ? 'F' : 'M',
      defaultLabourType: 'operator',
      isActive: true,
    }));
  }

  const rows: PressRow[] = shiftEmps.map((emp, i) => {
    const row = createBlankRow(emp.code, emp.name, '', '', i);
    if (emp.defaultLabourType === 'operator') row.op = true;
    else if (emp.defaultLabourType === 'helper') row.hp = true;
    else if (emp.defaultLabourType === 'labour') row.lb = true;
    return row;
  });

  const minRows = shift === 'DAY' ? 45 : 22;
  while (rows.length < minRows) {
    rows.push(createBlankRow('', '', '', '', rows.length));
  }

  const def = SHIFT_DEFAULTS[shift];
  if (def && rows[0]) {
    rows[0].press = def.press;
    rows[0].item = def.item;
    rows[0].q = extractQualityPct(def.item);
    const tgt = lookupTarget(itemMap, def.item, def.press);
    if (tgt != null) {
      rows[0].tgt = tgt;
      rows[0].tgtAuto = true;
    }
  }

  return {
    date,
    shift,
    targetHours: 12,
    rows,
    savedAt: undefined,
  };
}

export function loadShiftDoc(
  date: string,
  shift: ShiftType,
  allEmployees: Employee[],
  items: ItemTargetMapping[]
): ShiftDoc {
  const key = `${PREFIX}sheet:${getShiftKey(date, shift)}`;
  try {
    const raw = safeStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.rows)) {
        return {
          ...parsed,
          rows: parsed.rows.map((r: Partial<PressRow>, idx: number) => sanitizeRow(r, idx)),
        };
      }
    }
  } catch {
    // Fallback
  }

  return generateFreshShiftDoc(date, shift, allEmployees, items);
}

export function saveShiftDoc(doc: ShiftDoc): void {
  const key = `${PREFIX}sheet:${getShiftKey(doc.date, doc.shift)}`;
  const record: ShiftDoc = {
    ...doc,
    rows: doc.rows.map((r, idx) => sanitizeRow(r, idx)),
    savedAt: Date.now(),
  };
  try {
    safeStorage.setItem(key, JSON.stringify(record));
  } catch {
    // Ignore
  }
}

export function getAllSavedShiftDocs(): ShiftDoc[] {
  const docs: ShiftDoc[] = [];
  try {
    const allKeys = safeStorage.getAllKeys();
    for (const key of allKeys) {
      if (key && key.startsWith(`${PREFIX}sheet:`)) {
        const raw = safeStorage.getItem(key);
        if (raw) {
          const doc = JSON.parse(raw);
          if (doc && doc.date && doc.shift && Array.isArray(doc.rows)) {
            docs.push({
              ...doc,
              rows: doc.rows.map((r: Partial<PressRow>, idx: number) => sanitizeRow(r, idx)),
            });
          }
        }
      }
    }
  } catch {
    // Return empty array on failure
  }
  return docs.sort((a, b) => (a.date > b.date ? 1 : -1));
}

export function getHourlyRatePref(): number {
  try {
    const val = safeStorage.getItem(`${PREFIX}wages_rate`);
    if (val) return parseFloat(val) || 0;
  } catch {
    // fallback
  }
  return 0;
}

export function setHourlyRatePref(rate: number): void {
  try {
    safeStorage.setItem(`${PREFIX}wages_rate`, String(rate));
  } catch {
    // ignore
  }
}

// -------------------------------------------------------------
// Authentication & User Session Storage
// -------------------------------------------------------------

export const DEFAULT_ADMIN_USER: AuthUser = {
  username: 'admin',
  name: 'Head Administrator',
  role: 'ADMIN',
  email: 'kv525411@gmail.com',
  loggedInAt: Date.now(),
};

export const DEFAULT_SUPERVISOR_USER: AuthUser = {
  username: 'supervisor',
  name: 'Shift Supervisor',
  role: 'SUPERVISOR',
  loggedInAt: Date.now(),
};

export function getStoredAuthUser(): AuthUser | null {
  try {
    const raw = safeStorage.getItem(`${PREFIX}auth_user`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.role === 'ADMIN' || parsed.role === 'SUPERVISOR')) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_ADMIN_USER;
}

export function saveStoredAuthUser(user: AuthUser | null): void {
  try {
    if (!user) {
      safeStorage.removeItem(`${PREFIX}auth_user`);
    } else {
      safeStorage.setItem(`${PREFIX}auth_user`, JSON.stringify(user));
    }
  } catch {
    // ignore
  }
}

export function getStoredCredentials(): { adminPin: string; supervisorPin: string } {
  try {
    const raw = safeStorage.getItem(`${PREFIX}credentials`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        adminPin: parsed.adminPin || '9999',
        supervisorPin: parsed.supervisorPin || '1234',
      };
    }
  } catch {
    // ignore
  }
  return { adminPin: '9999', supervisorPin: '1234' };
}

export function saveStoredCredentials(creds: { adminPin: string; supervisorPin: string }): void {
  try {
    safeStorage.setItem(`${PREFIX}credentials`, JSON.stringify(creds));
  } catch {
    // ignore
  }
}

// -------------------------------------------------------------
// Day-Wise Locking & Day Data Operations
// -------------------------------------------------------------

export function isDayLocked(date: string): boolean {
  try {
    return safeStorage.getItem(`${PREFIX}locked_day:${date}`) === 'true';
  } catch {
    return false;
  }
}

export function setDayLocked(date: string, locked: boolean, lockedBy = 'Admin'): void {
  try {
    if (locked) {
      safeStorage.setItem(`${PREFIX}locked_day:${date}`, 'true');
      safeStorage.setItem(`${PREFIX}locked_day_by:${date}`, lockedBy);
    } else {
      safeStorage.removeItem(`${PREFIX}locked_day:${date}`);
      safeStorage.removeItem(`${PREFIX}locked_day_by:${date}`);
    }
  } catch {
    // ignore
  }
}

export function getDayLockedBy(date: string): string | null {
  try {
    return safeStorage.getItem(`${PREFIX}locked_day_by:${date}`);
  } catch {
    return null;
  }
}

export function deleteShiftDoc(date: string, shift: ShiftType): void {
  try {
    safeStorage.removeItem(`${PREFIX}sheet:${getShiftKey(date, shift)}`);
  } catch {
    // ignore
  }
}

/**
 * Consolidates all dates in the system into rich DayWiseSummary objects
 * for Admin Panel Day-Wise Data Management
 */
export function getAllDayWiseSummaries(
  allEmployees: Employee[],
  items: ItemTargetMapping[]
): DayWiseSummary[] {
  const savedDocs = getAllSavedShiftDocs();
  const dateSet = new Set<string>();

  savedDocs.forEach((d) => {
    if (d.date) dateSet.add(d.date);
  });

  const today = new Date().toISOString().slice(0, 10);
  dateSet.add(today);

  const sortedDates = Array.from(dateSet).sort((a, b) => (a > b ? -1 : 1));

  return sortedDates.map((date) => {
    const dayDoc = loadShiftDoc(date, 'DAY', allEmployees, items);
    const nightDoc = loadShiftDoc(date, 'NIGHT', allEmployees, items);

    const calcShiftStats = (doc?: ShiftDoc) => {
      if (!doc || !doc.rows) return { active: 0, good: 0, wt: 0, pay: 0 };
      let active = 0;
      let good = 0;
      let wt = 0;
      let pay = 0;
      doc.rows.forEach((r) => {
        if (r.name || r.code || r.press || r.good) {
          active++;
          const g = parseFloat(String(r.good)) || 0;
          good += g;
          if (typeof r.wt === 'number') wt += r.wt;
          if (typeof r.pay === 'number') pay += r.pay;
        }
      });
      return { active, good, wt, pay };
    };

    const dayStats = calcShiftStats(dayDoc);
    const nightStats = calcShiftStats(nightDoc);

    const totalGoodNos = dayStats.good + nightStats.good;
    const totalWeightMT = dayStats.wt + nightStats.wt;
    const totalPayHours = dayStats.pay + nightStats.pay;

    const [y, m, d] = date.split('-').map(Number);
    const dObj = new Date(y, m - 1, d);
    const dayOfWeek = dObj.toLocaleDateString('en-US', { weekday: 'short' });

    const locked = isDayLocked(date);
    const lockedBy = getDayLockedBy(date) || undefined;

    const totalExpectedHours = (dayStats.active + nightStats.active) * 12;
    const efficiencyPct =
      totalExpectedHours > 0 ? Math.min(150, Math.round((totalPayHours / totalExpectedHours) * 100)) : 0;

    return {
      date,
      dayOfWeek,
      dayDoc: dayDoc.savedAt ? dayDoc : undefined,
      nightDoc: nightDoc.savedAt ? nightDoc : undefined,
      dayActiveRows: dayStats.active,
      dayGoodNos: dayStats.good,
      dayWeightMT: Number(dayStats.wt.toFixed(2)),
      dayPayHours: Number(dayStats.pay.toFixed(2)),
      nightActiveRows: nightStats.active,
      nightGoodNos: nightStats.good,
      nightWeightMT: Number(nightStats.wt.toFixed(2)),
      nightPayHours: Number(nightStats.pay.toFixed(2)),
      totalGoodNos,
      totalWeightMT: Number(totalWeightMT.toFixed(2)),
      totalPayHours: Number(totalPayHours.toFixed(2)),
      efficiencyPct,
      isLocked: locked,
      lockedBy,
    };
  });
}
