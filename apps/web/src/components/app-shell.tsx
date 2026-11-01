'use client';
import { WORKSPACES, type Workspace } from '@oromia/contracts';
import { formatDate, type Locale } from '@oromia/ethiopian-calendar';
import { LOCALES } from '@oromia/i18n';
import { cn } from '@oromia/ui';
import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { useOnlineStatus, usePendingSyncCount } from '@/lib/use-online-status';
import { useCalendar } from './calendar-context';

function todayIso(): string {
  // Display "today" in Addis Ababa time regardless of the device's zone.
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Addis_Ababa' }).format(new Date());
}

export function AppShell({ children }: { children: ReactNode }) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ workspace?: string }>();
  const active = (WORKSPACES as readonly string[]).includes(params.workspace ?? '') ? (params.workspace as Workspace) : null;
  const { calendar, setCalendar } = useCalendar();
  const online = useOnlineStatus();
  const pending = usePendingSyncCount();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <Link href="/" className="mr-auto font-semibold">
            {t('app.name')}
          </Link>

          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t('shell.workspace')}</span>
            <select
              className="rounded-lg border border-border bg-background px-2 py-1"
              value={active ?? ''}
              onChange={(e) => router.push(e.target.value ? `/${e.target.value}` : '/')}
            >
              <option value="">—</option>
              {WORKSPACES.map((w) => (
                <option key={w} value={w}>
                  {t(`workspaces.${w}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t('shell.language')}</span>
            <select
              className="rounded-lg border border-border bg-background px-2 py-1"
              value={locale}
              onChange={(e) => router.replace(pathname, { locale: e.target.value as Locale })}
            >
              {LOCALES.map((l) => (
                <option key={l} value={l}>
                  {t(`languages.${l}`)}
                </option>
              ))}
            </select>
          </label>

          <fieldset className="flex items-center gap-1 text-sm" aria-label={t('shell.calendar')}>
            {(['ethiopian', 'gregorian'] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={calendar === c}
                onClick={() => setCalendar(c)}
                className={cn(
                  'rounded-lg border border-border px-2 py-1',
                  calendar === c && 'bg-primary text-primary-foreground',
                )}
              >
                {t(c === 'ethiopian' ? 'shell.calendarEthiopian' : 'shell.calendarGregorian')}
              </button>
            ))}
          </fieldset>
        </div>

        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 pb-2 text-xs text-muted-foreground">
          <span>
            {t('shell.today')}: {formatDate(todayIso(), calendar, locale)}
          </span>
          <span role="status" aria-live="polite" className="flex items-center gap-1">
            <span className={cn('inline-block h-2 w-2 rounded-full', online ? 'bg-primary' : 'bg-warning')} />
            {online ? t('shell.online') : t('shell.offline')}
            {' · '}
            {t('shell.pendingSync', { count: pending })}
          </span>
        </div>
      </header>

      <div className="bg-warning/15 px-4 py-1 text-center text-xs">{t('app.illustrative')}</div>

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
