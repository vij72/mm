export type ShiftType = 'DAY' | 'NIGHT';

export type LabourType = 'operator' | 'helper' | 'labour' | '';

export type Gender = 'M' | 'F' | '';

export type UserRole = 'ADMIN' | 'SUPERVISOR';

export interface AuthUser {
  username: string;
  name: string;
  role: UserRole;
  email?: string;
  loggedInAt: number;
}

export interface Employee {
  code: string;
  name: string;
  section: string; // 'pressDay' | 'pressNight' | 'millDay' | 'millNight' | 'tkl' | 'tkp' | 'odisha' | string
  gender?: Gender;
  defaultLabourType?: LabourType;
  phone?: string;
  notes?: string;
  isActive?: boolean;
  joiningDate?: string;
  dailyRate?: number;
}

export interface PressRow {
  id: string; // unique row id for React keys & history
  code: string;
  name: string;
  op: boolean;
  hp: boolean;
  lb: boolean;
  press: string;
  run: string | number;
  tin: string;
  tout: string;
  phys?: number | ''; // auto calc
  item: string;
  q: string; // Quality %
  gw: string | number; // Green unit weight in kgs
  tm: string | number; // Target moisture
  am: string | number; // Actual moisture
  tgt: string | number; // Target of 12 hours
  tgtAuto?: boolean;
  good: string | number; // Actual good bricks
  rej: string | number; // Green rejected bricks
  wt?: number | ''; // Total good brick weight in MT (or kg)
  pay?: number | ''; // Hours payable
  tbd: string | number; // Target BD
  abd: string | number; // Actual BD
  rem: string; // Remarks
}

export interface ShiftDoc {
  date: string; // YYYY-MM-DD
  shift: ShiftType;
  targetHours: number; // default 12
  rows: PressRow[];
  savedAt?: number;
  notes?: string;
  isLocked?: boolean;
  lockedBy?: string;
  lockedAt?: number;
  lastPunchedBy?: string;
  lastPunchRole?: UserRole;
}

export interface DayWiseSummary {
  date: string;
  dayOfWeek: string;
  dayDoc?: ShiftDoc;
  nightDoc?: ShiftDoc;
  dayActiveRows: number;
  dayGoodNos: number;
  dayWeightMT: number;
  dayPayHours: number;
  nightActiveRows: number;
  nightGoodNos: number;
  nightWeightMT: number;
  nightPayHours: number;
  totalGoodNos: number;
  totalWeightMT: number;
  totalPayHours: number;
  efficiencyPct: number;
  isLocked: boolean;
  lockedBy?: string;
}

export interface ItemTargetMapping {
  name: string;
  targets: Record<string, number>; // pressName -> target count in 12 hrs
  defaultQuality?: string;
  standardWeightKg?: number;
}

