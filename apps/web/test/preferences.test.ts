import { describe, expect, it } from 'vitest';
import { parseCalendarPref, readCalendarPref } from '../src/lib/preferences';

describe('calendar preference', () => {
  it('defaults to Ethiopian for unknown values', () => {
    expect(parseCalendarPref(null)).toBe('ethiopian');
    expect(parseCalendarPref('julian')).toBe('ethiopian');
    expect(parseCalendarPref('gregorian')).toBe('gregorian');
  });

  it('never throws when storage is unavailable', () => {
    expect(readCalendarPref()).toBe('ethiopian');
  });
});
