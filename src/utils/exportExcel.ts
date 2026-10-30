import * as XLSX from 'xlsx';
import { ShiftDoc } from '../types/press';
import { formatDmy, num } from './calculations';

function colLetter(indexZero: number): string {
  let s = '';
  let i = indexZero + 1;
  while (i > 0) {
    const m = (i - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

export function exportDailySheetToExcel(docs: ShiftDoc[], filename: string): void {
  const wb = XLSX.utils.book_new();

  for (const doc of docs) {
    const sheetName = `PRESS ${doc.shift}`;
    const banner = `DATE: ${formatDmy(doc.date)}      SHIFT: ${doc.shift}      PRESS SECTION DAILY DATA SHEET`;

    const headers = [
      'SL. NO',
      'EMP CODE',
      'EMPLOYEE NAME',
      'PRESS OPERATOR',
      'HELPER',
      'LABOUR',
      'M',
      'F',
      'PRESS NO.',
      'PRESS RUNNING HOURS',
      'TIME IN PRESS SHOP',
      'TIME OUT',
      'PHYSICAL HOURS IN PRESS SHOP',
      'NAME OF BRICKS',
      'QUALITY Al TO 3 PER%',
      'GREEN UNIT WEIGHT IN KGS',
      'TARGET MOISTURE',
      'ACTUAL MOISTURE',
      'TARGET OF 12 HOURS NO OF BRICKS',
      'ACTUAL GOOD SALEABLE BRICKS MADE NOS',
      'GREEN REJECTED BRICKS MADE NOS',
      'TOTAL GOOD BRICK WEIGHT MADE IN MT',
      'HOURS PAYABLES CONVERTED FROM GOOD BRICKS MADE',
      'TARGET BD',
      'ACTUAL BD',
      'REMARKS',
    ];

    const aoa: (string | number | object)[][] = [
      [banner],
      headers,
    ];

    const firstRowIndex = 3; // 1-indexed row where data begins

    doc.rows.forEach((r, idx) => {
      const isM = /^\s*mr\.?(?!s)/i.test(r.name) ? 'M' : '';
      const isF = /^\s*mrs\.?/i.test(r.name) ? 'F' : '';

      const rowData: (string | number | object)[] = [
        idx + 1,
        r.code || '',
        r.name || '',
        r.op ? 'YES' : '',
        r.hp ? 'YES' : '',
        r.lb ? 'YES' : '',
        isM,
        isF,
        r.press || '',
        num(r.run) || '',
        r.tin || '',
        r.tout || '',
        r.phys !== '' && r.phys != null ? num(r.phys) : '',
        r.item || '',
        r.q || '',
        num(r.gw) || '',
        num(r.tm) || '',
        num(r.am) || '',
        num(r.tgt) || '',
        num(r.good) || '',
        num(r.rej) || '',
        r.wt !== '' && r.wt != null ? num(r.wt) : '',
        r.pay !== '' && r.pay != null ? num(r.pay) : '',
        num(r.tbd) || '',
        num(r.abd) || '',
        r.rem || '',
      ];

      aoa.push(rowData);
    });

    const lastRowIndex = firstRowIndex + doc.rows.length - 1;

    // Totals row
    const totalsRow: (string | number | object)[] = [
      'TOTALS',
      '',
      '',
      { f: `COUNTIF(D${firstRowIndex}:D${lastRowIndex},"YES")` },
      { f: `COUNTIF(E${firstRowIndex}:E${lastRowIndex},"YES")` },
      { f: `COUNTIF(F${firstRowIndex}:F${lastRowIndex},"YES")` },
      '',
      '',
      { f: `COUNTA(I${firstRowIndex}:I${lastRowIndex})` },
      { f: `SUM(J${firstRowIndex}:J${lastRowIndex})` },
      '',
      '',
      { f: `SUM(M${firstRowIndex}:M${lastRowIndex})` },
      { f: `COUNTA(N${firstRowIndex}:N${lastRowIndex})` },
      '',
      { f: `SUM(P${firstRowIndex}:P${lastRowIndex})` },
      { f: `AVERAGE(Q${firstRowIndex}:Q${lastRowIndex})` },
      { f: `AVERAGE(R${firstRowIndex}:R${lastRowIndex})` },
      { f: `SUM(S${firstRowIndex}:S${lastRowIndex})` },
      { f: `SUM(T${firstRowIndex}:T${lastRowIndex})` },
      { f: `SUM(U${firstRowIndex}:U${lastRowIndex})` },
      { f: `SUM(V${firstRowIndex}:V${lastRowIndex})` },
      { f: `SUM(W${firstRowIndex}:W${lastRowIndex})` },
      '',
      '',
      '',
    ];
    aoa.push(totalsRow);

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Apply column widths
    ws['!cols'] = [
      { wch: 8 },  // SL NO
      { wch: 10 }, // EMP CODE
      { wch: 28 }, // EMPLOYEE NAME
      { wch: 12 }, // OP
      { wch: 10 }, // HP
      { wch: 10 }, // LB
      { wch: 6 },  // M
      { wch: 6 },  // F
      { wch: 15 }, // PRESS NO
      { wch: 12 }, // RUN HRS
      { wch: 10 }, // TIME IN
      { wch: 10 }, // TIME OUT
      { wch: 14 }, // PHYS HRS
      { wch: 32 }, // ITEM NAME
      { wch: 12 }, // Q %
      { wch: 14 }, // GW KG
      { wch: 10 }, // TM
      { wch: 10 }, // AM
      { wch: 14 }, // TGT
      { wch: 14 }, // GOOD
      { wch: 12 }, // REJ
      { wch: 14 }, // WT MT
      { wch: 14 }, // PAY HRS
      { wch: 10 }, // TBD
      { wch: 10 }, // ABD
      { wch: 20 }, // REMARKS
    ];

    // Merges
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 25 } }, // Banner
      { s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: 2 } }, // Totals label
    ];

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  XLSX.writeFile(wb, filename);
}

export interface WagesExportData {
  fromDate: string;
  toDate: string;
  shift: string;
  metricLabel: string;
  dates: string[];
  rate: number;
  rows: {
    code: string;
    name: string;
    type: string;
    gender: string;
    dayValues: Record<string, number>;
    total: number;
    daysWorked: number;
    amount?: number;
  }[];
}

export function exportWagesToExcel(data: WagesExportData, filename: string): void {
  const wb = XLSX.utils.book_new();
  const banner = `WAGES SHEET   FROM ${formatDmy(data.fromDate)}   TO ${formatDmy(data.toDate)}   (${data.metricLabel}${data.shift !== 'ALL' ? `, ${data.shift} SHIFT` : ''})`;

  const head = [
    'SL. NO',
    'EMP CODE',
    'EMPLOYEE NAME',
    'TYPE OF LABOUR',
    'GENDER',
    ...data.dates.map(formatDmy),
    'TOTAL',
    'DAYS WORKED',
  ];

  const withRate = data.rate > 0;
  if (withRate) {
    head.push('RATE PER HOUR', 'AMOUNT');
  }

  const aoa: (string | number | object)[][] = [[banner], head];
  const firstRow = 3;

  data.rows.forEach((r, idx) => {
    const rowNum = firstRow + idx;
    const row: (string | number | object)[] = [
      idx + 1,
      r.code,
      r.name,
      r.type,
      r.gender,
      ...data.dates.map((d) => (r.dayValues[d] ? Number(r.dayValues[d].toFixed(2)) : '')),
      Number(r.total.toFixed(2)),
      r.daysWorked,
    ];

    if (withRate) {
      row.push(data.rate, Number((r.total * data.rate).toFixed(2)));
    }
    aoa.push(row);
  });

  // Totals
  const totalRow: (string | number | object)[] = [
    'TOTALS',
    '',
    '',
    '',
    '',
  ];

  data.dates.forEach((d) => {
    const sum = data.rows.reduce((acc, r) => acc + (r.dayValues[d] || 0), 0);
    totalRow.push(sum > 0 ? Number(sum.toFixed(2)) : '');
  });

  const grandTotal = data.rows.reduce((acc, r) => acc + r.total, 0);
  const grandDays = data.rows.reduce((acc, r) => acc + r.daysWorked, 0);
  totalRow.push(Number(grandTotal.toFixed(2)), grandDays);

  if (withRate) {
    totalRow.push('', Number((grandTotal * data.rate).toFixed(2)));
  }
  aoa.push(totalRow);

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  ws['!cols'] = [
    { wch: 8 },
    { wch: 12 },
    { wch: 28 },
    { wch: 15 },
    { wch: 8 },
    ...data.dates.map(() => ({ wch: 12 })),
    { wch: 12 },
    { wch: 14 },
    ...(withRate ? [{ wch: 14 }, { wch: 16 }] : []),
  ];

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: head.length - 1 } },
    { s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: 4 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'WAGES SHEET');
  XLSX.writeFile(wb, filename);
}
