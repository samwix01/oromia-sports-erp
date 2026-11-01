'use client';
import type { CalendarSystem } from '@oromia/ethiopian-calendar';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_CALENDAR, readCalendarPref, writeCalendarPref } from '@/lib/preferences';

const Ctx = createContext<{ calendar: CalendarSystem; setCalendar: (c: CalendarSystem) => void }>({
  calendar: DEFAULT_CALENDAR,
  setCalendar: () => undefined,
});

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [calendar, setState] = useState<CalendarSystem>(DEFAULT_CALENDAR);
  useEffect(() => setState(readCalendarPref()), []);
  const setCalendar = (c: CalendarSystem) => {
    setState(c);
    writeCalendarPref(c);
  };
  return <Ctx.Provider value={{ calendar, setCalendar }}>{children}</Ctx.Provider>;
}

export const useCalendar = () => useContext(Ctx);
