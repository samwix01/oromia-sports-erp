'use client';
import { formatDate, type Locale } from '@oromia/ethiopian-calendar';
import { cn } from '@oromia/ui';
import { useLocale, useTranslations } from 'next-intl';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { ApiError } from '@/lib/api';
import { useCalendar } from '../calendar-context';

export function D({ iso }: { iso: string | null | undefined }) {
  const { calendar } = useCalendar();
  const locale = useLocale() as Locale;
  if (!iso) return <span>—</span>;
  return <time dateTime={iso}>{formatDate(iso.slice(0, 10), calendar, locale)}</time>;
}

export function PageTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold">{children}</h1>
      {actions}
    </div>
  );
}

export function Panel({ title, children, className }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-lg border border-border p-4', className)}>
      {title ? <h2 className="mb-3 font-semibold">{title}</h2> : null}
      {children}
    </section>
  );
}

const TONES = { good: 'bg-primary/15 text-primary', warn: 'bg-warning/20', bad: 'bg-accent/15 text-accent', neutral: 'bg-muted text-muted-foreground' } as const;
export function Pill({ tone = 'neutral', children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={cn('inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium', TONES[tone])}>{children}</span>;
}

export const statusTone = (s: string): keyof typeof TONES =>
  ['recognised', 'verified', 'active', 'approved', 'ok', 'different_people'].includes(s)
    ? 'good'
    : ['rejected', 'disputed', 'suspended', 'dissolved', 'overdue'].includes(s)
      ? 'bad'
      : ['pending', 'submitted', 'in_review', 'returned', 'requested', 'open', 'held', 'unverified'].includes(s)
        ? 'warn'
        : 'neutral';

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn('w-full rounded-lg border border-border bg-background px-3 py-2', props.className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn('w-full rounded-lg border border-border bg-background px-3 py-2', props.className)} />;
}

export function Button({ variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  return (
    <button
      {...props}
      className={cn(
        'rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50',
        variant === 'primary' && 'bg-primary text-primary-foreground',
        variant === 'secondary' && 'border border-border',
        variant === 'danger' && 'border border-accent text-accent',
        props.className,
      )}
    />
  );
}

export const ERROR_CODES = [
  'request_failed', 'not_authenticated', 'forbidden', 'invalid_credentials', 'account_locked', 'totp_required', 'totp_invalid',
  'validation_failed', 'reason_required', 'cannot_act_on_step', 'only_submitter', 'invalid_state', 'duplicate_unresolved',
  'person_merged_reject_registration', 'affiliation_overlap', 'organisation_not_recognised', 'sport_not_offered_by_organisation',
  'no_federation_for_sport', 'email_taken', 'weak_password', 'cannot_grant_role', 'invalid_current_password', 'already_decided',
  'not_found', 'cannot_revoke_own_assignment',
] as const;

/** Shows a translated API error (erp.errors.<code>), falling back to a generic message. */
export function ErrorText({ error }: { error: unknown }) {
  const t = useTranslations('erp.errors');
  if (!error) return null;
  const code = error instanceof ApiError ? error.code : 'request_failed';
  return (
    <p role="alert" className="text-sm text-accent">
      {(ERROR_CODES as readonly string[]).includes(code) ? t(code) : t('request_failed')}
      {error instanceof ApiError && error.detail ? ` (${error.detail})` : ''}
    </p>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{children}</p>;
}
