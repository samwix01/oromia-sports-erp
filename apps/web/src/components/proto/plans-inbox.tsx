'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PLAN_SUBMISSIONS } from '@/demo/data';
import { Badge, Card, DateText, DemoTag, NotSaved } from './bits';

/** Sum decimal strings exactly (cents as integers) — money is never a float. */
function sumEtb(values: string[]): string {
  const cents = values.reduce((acc, v) => {
    const [whole = '0', frac = ''] = v.split('.');
    return acc + BigInt(whole) * 100n + BigInt((frac + '00').slice(0, 2));
  }, 0n);
  const s = cents.toString().padStart(3, '0');
  return `${s.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${s.slice(-2)}`;
}

export function PlansInbox() {
  const root = useTranslations();
  const t = useTranslations('proto');
  const [outcome, setOutcome] = useState<Record<string, { kind: 'approved' | 'returned'; reason?: string }>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const act = (id: string, kind: 'approved' | 'returned') => {
    const reason = (drafts[id] ?? '').trim();
    if (kind === 'returned' && !reason) return setErrors({ ...errors, [id]: true });
    setErrors({ ...errors, [id]: false });
    setOutcome({ ...outcome, [id]: { kind, reason: reason || undefined } });
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">
          {t('plans.title')}
          <DemoTag />
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t('plans.intro')}</p>
      </header>
      <NotSaved />
      {PLAN_SUBMISSIONS.map((p) => {
        const o = outcome[p.id];
        return (
          <Card key={p.id} title={root(`workspaces.${p.federation}`)}>
            <p className="text-sm text-muted-foreground">
              {t('plans.fiscalYear')}: {t('plans.fiscalYearLabel', { year: p.fiscalYear })} · {t('common.version')} {p.version} ·{' '}
              {t('plans.submittedOn')} <DateText iso={p.submittedOn} />
            </p>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr>
                  <th>{t('plans.activities')}</th>
                  <th className="text-right">{t('plans.budget')}</th>
                </tr>
              </thead>
              <tbody>
                {p.activities.map((a) => (
                  <tr key={a.title} className="border-t border-border">
                    <td className="py-1">{a.title}</td>
                    <td className="text-right font-mono">{sumEtb([a.budget])}</td>
                  </tr>
                ))}
                <tr className="border-t border-border font-semibold">
                  <td className="py-1">{t('common.total')}</td>
                  <td className="text-right font-mono">{sumEtb(p.activities.map((a) => a.budget))}</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted-foreground">{t('plans.financeNote')}</p>
            <div className="mt-3">
              {o ? (
                <div>
                  <Badge tone={o.kind === 'approved' ? 'good' : 'warn'}>{t(`plans.${o.kind}`)}</Badge>
                  {o.reason ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('common.reason')}: {o.reason}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    aria-label={t('common.reason')}
                    className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                    placeholder={t('common.reason')}
                    value={drafts[p.id] ?? ''}
                    onChange={(e) => setDrafts({ ...drafts, [p.id]: e.target.value })}
                  />
                  {errors[p.id] ? <p className="text-xs text-accent">{t('common.reasonRequired')}</p> : null}
                  <div className="flex gap-2">
                    <button type="button" className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground" onClick={() => act(p.id, 'approved')}>
                      {t('common.approve')}
                    </button>
                    <button type="button" className="rounded-lg border border-border px-3 py-1.5 text-sm" onClick={() => act(p.id, 'returned')}>
                      {t('common.return')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
