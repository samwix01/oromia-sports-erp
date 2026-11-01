'use client';
import { formatDate, type Locale } from '@oromia/ethiopian-calendar';
import { cn } from '@oromia/ui';
import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useCalendar } from '../calendar-context';

/** Renders a stored ISO date in the viewer's chosen calendar. */
export function DateText({ iso }: { iso: string }) {
  const { calendar } = useCalendar();
  const locale = useLocale() as Locale;
  return <time dateTime={iso}>{formatDate(iso, calendar, locale)}</time>;
}

export function DemoTag() {
  const t = useTranslations('proto');
  return (
    <span className="ml-2 rounded bg-warning/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
      {t('demoTag')}
    </span>
  );
}

const TONES = {
  good: 'bg-primary/15 text-primary',
  warn: 'bg-warning/20',
  bad: 'bg-accent/15 text-accent',
  neutral: 'bg-muted text-muted-foreground',
} as const;

export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={cn('inline-block rounded px-2 py-0.5 text-xs font-medium', TONES[tone])}>{children}</span>;
}

export function Card({ title, children, className }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-lg border border-border p-4', className)}>
      {title ? <h2 className="mb-3 font-semibold">{title}</h2> : null}
      {children}
    </section>
  );
}

export function NotSaved() {
  const t = useTranslations('proto');
  return <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">{t('notSaved')}</p>;
}
