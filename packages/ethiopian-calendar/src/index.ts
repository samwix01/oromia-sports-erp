/**
 * Ethiopian (Amete Mihret) ↔ Gregorian calendar conversion, formatting and
 * Ethiopian fiscal-year helpers.
 *
 * Storage rule (CLAUDE.md): dates are always stored as Gregorian ISO dates.
 * This package is for display and for period/fiscal-year keys only.
 *
 * Conversion goes through the Julian Day Number (JDN):
 *  - Gregorian ↔ JDN: Fliegel & Van Flandern (1968).
 *  - Ethiopian ↔ JDN: Amete Mihret epoch, JDN 1723856.
 */
import { MONTH_NAMES, type Locale } from './months.js';

export { MONTH_NAMES, type Locale } from './months.js';

export interface GregorianDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

export interface EthiopianDate {
  year: number;
  month: number; // 1-13 (13 = Pagume)
  day: number; // 1-30 (Pagume: 1-5, or 1-6 in a leap year)
}

const ETHIOPIAN_EPOCH_JDN = 1723856;

const div = (a: number, b: number): number => Math.floor(a / b);
const mod = (a: number, b: number): number => ((a % b) + b) % b;

// ---------------------------------------------------------------------------
// Gregorian
// ---------------------------------------------------------------------------

export function isGregorianLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function gregorianToJdn({ year, month, day }: GregorianDate): number {
  const a = div(14 - month, 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + div(153 * m + 2, 5) + 365 * y + div(y, 4) - div(y, 100) + div(y, 400) - 32045;
}

export function jdnToGregorian(jdn: number): GregorianDate {
  const a = jdn + 32044;
  const b = div(4 * a + 3, 146097);
  const c = a - div(146097 * b, 4);
  const d = div(4 * c + 3, 1461);
  const e = c - div(1461 * d, 4);
  const m = div(5 * e + 2, 153);
  return {
    day: e - div(153 * m + 2, 5) + 1,
    month: m + 3 - 12 * div(m, 10),
    year: 100 * b + d - 4800 + div(m, 10),
  };
}

export function isValidGregorian(d: GregorianDate): boolean {
  if (!Number.isInteger(d.year) || !Number.isInteger(d.month) || !Number.isInteger(d.day)) return false;
  if (d.month < 1 || d.month > 12 || d.day < 1) return false;
  const days = [31, isGregorianLeapYear(d.year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return d.day <= (days[d.month - 1] ?? 0);
}

// ---------------------------------------------------------------------------
// Ethiopian
// ---------------------------------------------------------------------------

/** An Ethiopian year is leap (Pagume has 6 days) when year mod 4 === 3. */
export function isEthiopianLeapYear(year: number): boolean {
  return mod(year, 4) === 3;
}

export function daysInEthiopianMonth(year: number, month: number): number {
  if (month < 1 || month > 13) throw new RangeError(`Invalid Ethiopian month: ${month}`);
  if (month < 13) return 30;
  return isEthiopianLeapYear(year) ? 6 : 5;
}

export function isValidEthiopian(d: EthiopianDate): boolean {
  if (!Number.isInteger(d.year) || !Number.isInteger(d.month) || !Number.isInteger(d.day)) return false;
  if (d.month < 1 || d.month > 13 || d.day < 1) return false;
  return d.day <= daysInEthiopianMonth(d.year, d.month);
}

export function ethiopianToJdn({ year, month, day }: EthiopianDate): number {
  return ETHIOPIAN_EPOCH_JDN + 365 + 365 * (year - 1) + div(year, 4) + 30 * month + day - 31;
}

export function jdnToEthiopian(jdn: number): EthiopianDate {
  const r = mod(jdn - ETHIOPIAN_EPOCH_JDN, 1461);
  const n = mod(r, 365) + 365 * div(r, 1460);
  return {
    year: 4 * div(jdn - ETHIOPIAN_EPOCH_JDN, 1461) + div(r, 365) - div(r, 1460),
    month: div(n, 30) + 1,
    day: mod(n, 30) + 1,
  };
}

// ---------------------------------------------------------------------------
// Conversion
// ---------------------------------------------------------------------------

export function toEthiopian(g: GregorianDate): EthiopianDate {
  if (!isValidGregorian(g)) throw new RangeError(`Invalid Gregorian date: ${JSON.stringify(g)}`);
  return jdnToEthiopian(gregorianToJdn(g));
}

export function toGregorian(e: EthiopianDate): GregorianDate {
  if (!isValidEthiopian(e)) throw new RangeError(`Invalid Ethiopian date: ${JSON.stringify(e)}`);
  return jdnToGregorian(ethiopianToJdn(e));
}

/** Parse an ISO date (YYYY-MM-DD, or a full ISO timestamp — the date part is used). */
export function parseIsoDate(iso: string): GregorianDate {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) throw new RangeError(`Not an ISO date: ${iso}`);
  const g = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  if (!isValidGregorian(g)) throw new RangeError(`Invalid Gregorian date: ${iso}`);
  return g;
}

export function toIsoDate(g: GregorianDate): string {
  const p = (n: number, w: number) => String(n).padStart(w, '0');
  return `${p(g.year, 4)}-${p(g.month, 2)}-${p(g.day, 2)}`;
}

export function isoToEthiopian(iso: string): EthiopianDate {
  return toEthiopian(parseIsoDate(iso));
}

export function ethiopianToIso(e: EthiopianDate): string {
  return toIsoDate(toGregorian(e));
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export type CalendarSystem = 'ethiopian' | 'gregorian';

/** Suffix shown after Ethiopian years so the two calendars are never confused. */
const EC_SUFFIX: Record<Locale, string> = { en: 'EC', om: 'A.L.I', am: 'ዓ.ም' };

export function formatEthiopian(e: EthiopianDate, locale: Locale = 'om'): string {
  const name = MONTH_NAMES[locale][e.month - 1];
  return `${name} ${e.day}, ${e.year} ${EC_SUFFIX[locale]}`;
}

/** Format a stored ISO date for display in the user's preferred calendar. */
export function formatDate(iso: string, calendar: CalendarSystem, locale: Locale = 'om'): string {
  if (calendar === 'ethiopian') return formatEthiopian(isoToEthiopian(iso), locale);
  return toIsoDate(parseIsoDate(iso));
}

// ---------------------------------------------------------------------------
// Fiscal year
// ---------------------------------------------------------------------------

export interface FiscalYearConfig {
  /**
   * Ethiopian month and day on which the fiscal year starts.
   * DECISION: OD-09 — default Hamle 1 (month 11, day 1); confirm with Bureau finance.
   */
  startMonth: number;
  startDay: number;
}

export const DEFAULT_FISCAL_YEAR: FiscalYearConfig = { startMonth: 11, startDay: 1 };

/**
 * Ethiopian fiscal year label for a Gregorian ISO date.
 * The year is named after the Ethiopian year in which it ends, e.g. the year starting
 * Hamle 1, 2016 EC (8 July 2024) is "2017 EFY".
 */
export function fiscalYearOf(iso: string, cfg: FiscalYearConfig = DEFAULT_FISCAL_YEAR): number {
  const e = isoToEthiopian(iso);
  const onOrAfterStart =
    e.month > cfg.startMonth || (e.month === cfg.startMonth && e.day >= cfg.startDay);
  return onOrAfterStart ? e.year + 1 : e.year;
}

/** First and last Gregorian ISO dates of an Ethiopian fiscal year. */
export function fiscalYearRange(
  fiscalYear: number,
  cfg: FiscalYearConfig = DEFAULT_FISCAL_YEAR,
): { start: string; end: string } {
  const startJdn = ethiopianToJdn({ year: fiscalYear - 1, month: cfg.startMonth, day: cfg.startDay });
  const nextStartJdn = ethiopianToJdn({ year: fiscalYear, month: cfg.startMonth, day: cfg.startDay });
  return {
    start: toIsoDate(jdnToGregorian(startJdn)),
    end: toIsoDate(jdnToGregorian(nextStartJdn - 1)),
  };
}

/** Ethiopian-month reporting period key, e.g. "2019-03" for Hidar 2019 EC. */
export function ethiopianPeriodKey(iso: string): string {
  const e = isoToEthiopian(iso);
  return `${e.year}-${String(e.month).padStart(2, '0')}`;
}
