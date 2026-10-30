import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calcPhysicalHours,
  extractQualityPct,
  lookupTarget,
  buildItemMap,
  calcGoodBrickWeightMT,
  calcHoursPayable,
  calcEfficiencyPct,
  calcRejectionRate,
  detectShiftFromDate,
  formatDmy,
} from './calculations';

test('calcPhysicalHours: handles day shift (06:00 to 18:00)', () => {
  const result = calcPhysicalHours('06:00', '18:00');
  assert.equal(result, 12);
});

test('calcPhysicalHours: handles night shift wraparound (18:00 to 06:00)', () => {
  const result = calcPhysicalHours('18:00', '06:00');
  assert.equal(result, 12);
});

test('calcPhysicalHours: handles partial shift (08:30 to 17:00)', () => {
  const result = calcPhysicalHours('08:30', '17:00');
  assert.equal(result, 8.5);
});

test('calcPhysicalHours: returns empty for missing input', () => {
  assert.equal(calcPhysicalHours('', '18:00'), '');
  assert.equal(calcPhysicalHours('06:00', ''), '');
});

test('extractQualityPct: extracts percentage from item names', () => {
  assert.equal(extractQualityPct('ROOFSET BRICK 70% (MK-1)'), '70%');
  assert.equal(extractQualityPct('Star wire 47-52% (200T/R)'), '47-52%');
  assert.equal(extractQualityPct('L&T 300 TR 80%'), '80%');
  assert.equal(extractQualityPct('Plain Brick'), '');
});

test('lookupTarget: finds target for item and press', () => {
  const map = buildItemMap([
    { name: 'HITECH(IS-8)', targets: { '30 T 1 HYD': 825, '30 T 2 HYD': 750 } },
    { name: 'KCSSL 55% (255 SLEEVE)', targets: { '400 T HYD': 240, '150 T 1 HYD': 342 } },
  ]);

  assert.equal(lookupTarget(map, 'HITECH(IS-8)', '30 T 1 HYD'), 825);
  assert.equal(lookupTarget(map, 'hitech(is-8)', '30 T 2 HYD'), 750);
  assert.equal(lookupTarget(map, 'KCSSL 55% (255 SLEEVE)', '400 T HYD'), 240);
  assert.equal(lookupTarget(map, 'KCSSL 55% (255 SLEEVE)', 'Unknown Press'), null);
  assert.equal(lookupTarget(map, 'Unknown Item', '30 T 1 HYD'), null);
});

test('calcGoodBrickWeightMT: calculates correct metric tons', () => {
  // 5 kg per brick * 600 bricks = 3000 kg = 3.0 MT
  assert.equal(calcGoodBrickWeightMT(5, 600), 3.0);
  // 12.5 kg * 800 bricks = 10,000 kg = 10 MT
  assert.equal(calcGoodBrickWeightMT('12.5', '800'), 10.0);
  assert.equal(calcGoodBrickWeightMT(0, 500), '');
});

test('calcHoursPayable: converts good bricks to hours payable', () => {
  // Target is 600 bricks for 12 hours. Made 600 bricks -> 12 hours
  assert.equal(calcHoursPayable(600, 600, 12), 12);
  // Target is 600 bricks for 12 hours. Made 300 bricks -> 6 hours
  assert.equal(calcHoursPayable(600, 300, 12), 6);
  // Target is 750. Made 900 -> 14.4 hours
  assert.equal(calcHoursPayable(750, 900, 12), 14.4);
});

test('calcEfficiencyPct: calculates production efficiency against physical hours', () => {
  // Target 600 in 12h = 50 bricks/hr. Worked 12 hours, made 600 bricks -> 100%
  assert.equal(calcEfficiencyPct(600, 600, 12), 100.0);
  // Worked 6 hours, made 300 bricks (expected 300) -> 100%
  assert.equal(calcEfficiencyPct(300, 600, 6), 100.0);
  // Worked 12 hours, made 660 bricks -> 110%
  assert.equal(calcEfficiencyPct(660, 600, 12), 110.0);
});

test('calcRejectionRate: calculates green rejection percentage', () => {
  // 950 good, 50 rejected -> 50 / 1000 = 5%
  assert.equal(calcRejectionRate(950, 50), 5.0);
  assert.equal(calcRejectionRate(100, 0), 0.0);
});

test('formatDmy: formats ISO date to DD-MM-YYYY', () => {
  assert.equal(formatDmy('2026-10-29'), '29-10-2026');
});
