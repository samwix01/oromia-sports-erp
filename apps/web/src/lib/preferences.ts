import type { CalendarSystem } from '@oromia/ethiopian-calendar';

export const CALENDAR_STORAGE_KEY = 'oromia.calendar';
export const DEFAULT_CALENDAR: CalendarSystem = 'ethiopian';

export function parseCalendarPref(raw: string | null | undefined): CalendarSystem {
  return raw === 'gregorian' || raw === 'ethiopian' ? raw : DEFAULT_CALENDAR;
}

/** Browser storage is a per-viewer convenience only; it may be unavailable, so never throw. */
export function readCalendarPref(): CalendarSystem {
  try {
    return parseCalendarPref(globalThis.localStorage?.getItem(CALENDAR_STORAGE_KEY));
  } catch {
    return DEFAULT_CALENDAR;
  }
}

export function writeCalendarPref(value: CalendarSystem): void {
  try {
    globalThis.localStorage?.setItem(CALENDAR_STORAGE_KEY, value);
  } catch {
    /* storage blocked — keep in-memory preference only */
  }
}
