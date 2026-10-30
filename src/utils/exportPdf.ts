import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ShiftDoc } from '../types/press';
import { formatDmy, formatNum, num } from './calculations';

export function exportDailySheetToPdf(docs: ShiftDoc[], filename: string): void {
  // Use A3 landscape for rich 25-column sheet readability
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a3',
  });

  docs.forEach((shiftDoc, docIdx) => {
    if (docIdx > 0) {
      doc.addPage();
    }

    const banner = `PRESS SECTION DAILY DATA SHEET   |   DATE: ${formatDmy(shiftDoc.date)}   |   SHIFT: ${shiftDoc.shift}`;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(31, 78, 120);
    doc.text(banner, 24, 28);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(90, 100, 115);
    const workerCount = shiftDoc.rows.filter((r) => r.name || r.code).length;
    doc.text(
      `Total Active Workers: ${workerCount}   |   Shift Timing: ${shiftDoc.shift === 'DAY' ? '06:00 - 18:00' : '18:00 - 06:00'}   |   Base Shift Hours: ${shiftDoc.targetHours}h`,
      24,
      44
    );

    const headers = [
      '#',
      'Code',
      'Employee Name',
      'Op',
      'Hp',
      'Lb',
      'M/F',
      'Press No',
      'Run (h)',
      'In',
      'Out',
      'Phys (h)',
      'Brick Item Name',
      'Q %',
      'GW (kg)',
      'Target',
      'Good',
      'Rej',
      'Wt (MT)',
      'Pay (h)',
      'T.BD',
      'A.BD',
      'Remarks',
    ];

    const bodyRows = shiftDoc.rows.map((r, i) => {
      const g = /^\s*mrs\.?/i.test(r.name) ? 'F' : /^\s*mr\.?/i.test(r.name) ? 'M' : '';
      return [
        i + 1,
        r.code,
        r.name,
        r.op ? '✓' : '',
        r.hp ? '✓' : '',
        r.lb ? '✓' : '',
        g,
        r.press,
        formatNum(r.run),
        r.tin,
        r.tout,
        formatNum(r.phys),
        r.item,
        r.q,
        formatNum(r.gw),
        formatNum(r.tgt),
        formatNum(r.good),
        formatNum(r.rej),
        formatNum(r.wt),
        formatNum(r.pay),
        formatNum(r.tbd),
        formatNum(r.abd),
        r.rem || '',
      ];
    });

    // Compute totals
    const opCount = shiftDoc.rows.filter((r) => r.op).length;
    const hpCount = shiftDoc.rows.filter((r) => r.hp).length;
    const lbCount = shiftDoc.rows.filter((r) => r.lb).length;
    const totRun = shiftDoc.rows.reduce((acc, r) => acc + num(r.run), 0);
    const totPhys = shiftDoc.rows.reduce((acc, r) => acc + (typeof r.phys === 'number' ? r.phys : 0), 0);
    const totTgt = shiftDoc.rows.reduce((acc, r) => acc + num(r.tgt), 0);
    const totGood = shiftDoc.rows.reduce((acc, r) => acc + num(r.good), 0);
    const totRej = shiftDoc.rows.reduce((acc, r) => acc + num(r.rej), 0);
    const totWt = shiftDoc.rows.reduce((acc, r) => acc + (typeof r.wt === 'number' ? r.wt : 0), 0);
    const totPay = shiftDoc.rows.reduce((acc, r) => acc + (typeof r.pay === 'number' ? r.pay : 0), 0);

    const totalsRow = [
      'TOTAL',
      '',
      `${workerCount} Workers`,
      String(opCount),
      String(hpCount),
      String(lbCount),
      '',
      '',
      formatNum(totRun),
      '',
      '',
      formatNum(totPhys),
      '',
      '',
      '',
      formatNum(totTgt),
      formatNum(totGood),
      formatNum(totRej),
      formatNum(totWt),
      formatNum(totPay),
      '',
      '',
      '',
    ];
    bodyRows.push(totalsRow);

    autoTable(doc, {
      head: [headers],
      body: bodyRows,
      startY: 55,
      theme: 'grid',
      margin: { left: 20, right: 20 },
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        lineColor: [210, 218, 228],
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [31, 78, 120],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index === bodyRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [225, 238, 250];
        }
      },
    });
  });

  doc.save(filename);
}
