import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import {
  daysInEthiopianMonth,
  ethiopianPeriodKey,
  ethiopianToIso,
  fiscalYearOf,
  fiscalYearRange,
  formatDate,
  gregorianToJdn,
  isEthiopianLeapYear,
  isoToEthiopian,
  jdnToGregorian,
  toEthiopian,
  toGregorian,
} from '../src/index.js';

// Fixed public dates (holidays / New Year) used as reference points.
const FIXTURES: Array<[iso: string, y: number, m: number, d: number, note: string]> = [
  ['2023-09-12', 2016, 1, 1, 'Enkutatash after a leap year'],
  ['2023-09-11', 2015, 13, 6, 'Pagume 6 in leap year 2015'],
  ['2026-09-11', 2019, 1, 1, 'Enkutatash 2019'],
  ['2026-11-01', 2019, 2, 22, 'Tikimt 22, 2019'],
  ['2025-01-07', 2017, 4, 29, 'Genna (Tahsas 29)'],
  ['2025-03-02', 2017, 6, 23, 'Adwa Victory Day (Yekatit 23)'],
  ['2024-07-08', 2016, 11, 1, 'Hamle 1 — fiscal year start'],
  ['2000-09-11', 1993, 1, 1, 'Enkutatash 1993'],
  ['2007-09-12', 2000, 1, 1, 'Ethiopian Millennium'],
];

describe('known dates', () => {
  it.each(FIXTURES)('%s ↔ %i-%i-%i (%s)', (iso, year, month, day) => {
    expect(isoToEthiopian(iso)).toEqual({ year, month, day });
    expect(ethiopianToIso({ year, month, day })).toBe(iso);
  });
});

describe('leap years', () => {
  it('Pagume has 6 days when year mod 4 === 3', () => {
    expect(isEthiopianLeapYear(2015)).toBe(true);
    expect(daysInEthiopianMonth(2015, 13)).toBe(6);
    expect(daysInEthiopianMonth(2016, 13)).toBe(5);
    expect(() => toGregorian({ year: 2016, month: 13, day: 6 })).toThrow(RangeError);
  });

  it('rejects invalid Gregorian dates', () => {
    expect(() => toEthiopian({ year: 2025, month: 2, day: 29 })).toThrow(RangeError);
    expect(() => toEthiopian({ year: 2024, month: 2, day: 29 })).not.toThrow();
  });
});

describe('round-trip properties (1900–2100 GC)', () => {
  const lo = gregorianToJdn({ year: 1900, month: 1, day: 1 });
  const hi = gregorianToJdn({ year: 2100, month: 12, day: 31 });

  it('GC → EC → GC is identity', () => {
    fc.assert(
      fc.property(fc.integer({ min: lo, max: hi }), (jdn) => {
        const g = jdnToGregorian(jdn);
        expect(toGregorian(toEthiopian(g))).toEqual(g);
      }),
      { numRuns: 5000 },
    );
  });

  it('consecutive days stay consecutive in EC', () => {
    fc.assert(
      fc.property(fc.integer({ min: lo, max: hi - 1 }), (jdn) => {
        const a = toEthiopian(jdnToGregorian(jdn));
        const b = toEthiopian(jdnToGregorian(jdn + 1));
        const lastDay = a.day === daysInEthiopianMonth(a.year, a.month);
        if (!lastDay) expect(b).toEqual({ ...a, day: a.day + 1 });
        else if (a.month < 13) expect(b).toEqual({ year: a.year, month: a.month + 1, day: 1 });
        else expect(b).toEqual({ year: a.year + 1, month: 1, day: 1 });
      }),
      { numRuns: 5000 },
    );
  });
});

describe('fiscal year (default Hamle 1)', () => {
  it('names the year after the EC year in which it ends', () => {
    expect(fiscalYearOf('2024-07-07')).toBe(2016);
    expect(fiscalYearOf('2024-07-08')).toBe(2017);
    expect(fiscalYearOf('2025-07-07')).toBe(2017);
  });

  it('computes the Gregorian range', () => {
    expect(fiscalYearRange(2017)).toEqual({ start: '2024-07-08', end: '2025-07-07' });
  });

  it('supports a configured start', () => {
    expect(fiscalYearOf('2026-09-11', { startMonth: 1, startDay: 1 })).toBe(2020);
  });
});

describe('formatting', () => {
  it('formats in each locale with an EC marker', () => {
    expect(formatDate('2026-09-11', 'ethiopian', 'en')).toBe('Meskerem 1, 2019 EC');
    expect(formatDate('2026-09-11', 'ethiopian', 'om')).toBe('Fulbaana 1, 2019 A.L.I');
    expect(formatDate('2026-09-11', 'ethiopian', 'am')).toBe('መስከረም 1, 2019 ዓ.ም');
    expect(formatDate('2026-09-11T08:00:00Z', 'gregorian')).toBe('2026-09-11');
  });

  it('builds Ethiopian monthly period keys', () => {
    expect(ethiopianPeriodKey('2026-11-01')).toBe('2019-02');
  });
});
