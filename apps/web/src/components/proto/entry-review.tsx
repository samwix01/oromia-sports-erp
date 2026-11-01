'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { FOOTBALL_ENTRY } from '@/demo/data';
import { Badge, Card, DemoTag, NotSaved } from './bits';

type Decision = { outcome: 'allowed' | 'refused'; reason: string };

export function EntryReview() {
  const t = useTranslations('proto');
  const entry = FOOTBALL_ENTRY;
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [accepted, setAccepted] = useState(false);

  const flagged = entry.members.filter((m) => m.checks.some((c) => c.outcome !== 'pass'));
  const allDecided = flagged.every((m) => decisions[m.personId]);

  // Rule 4: the system flags; a person decides, always with a reason.
  const decide = (personId: string, outcome: Decision['outcome']) => {
    const reason = (drafts[personId] ?? '').trim();
    if (!reason) return setErrors({ ...errors, [personId]: true });
    setErrors({ ...errors, [personId]: false });
    setDecisions({ ...decisions, [personId]: { outcome, reason } });
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">
          {t('entries.title')}
          <DemoTag />
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t('entries.intro')}</p>
      </header>
      <NotSaved />
      <Card>
        <dl className="mb-4 grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">{t('entries.competition')}</dt>
            <dd>{entry.competition}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('entries.club')}</dt>
            <dd>{entry.club}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('entries.category')}</dt>
            <dd>{entry.category}</dd>
          </div>
        </dl>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-1">{t('entries.shirt')}</th>
                <th>{t('entries.member')}</th>
                <th>{t('entries.checks')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {entry.members.map((m) => {
                const isFlagged = m.checks.some((c) => c.outcome !== 'pass');
                const d = decisions[m.personId];
                return (
                  <tr key={m.personId} className="border-t border-border align-top" data-testid={`member-${m.personId}`}>
                    <td className="py-2">{m.shirt}</td>
                    <td>{m.displayName}</td>
                    <td className="space-y-1">
                      {m.checks.map((c) => (
                        <div key={c.rule}>
                          <Badge tone={c.outcome === 'pass' ? 'good' : c.outcome === 'fail' ? 'bad' : 'warn'}>
                            {t(`entries.outcome.${c.outcome}`)}
                          </Badge>{' '}
                          <span className="text-xs">{t(`entries.rules.${c.rule}`)}</span>
                        </div>
                      ))}
                    </td>
                    <td className="min-w-64">
                      {!isFlagged ? null : d ? (
                        <div>
                          <Badge tone={d.outcome === 'allowed' ? 'good' : 'bad'}>{t(`entries.${d.outcome}`)}</Badge>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {t('common.reason')}: {d.reason}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <input
                            aria-label={t('common.reason')}
                            className="w-full rounded border border-border bg-background px-2 py-1"
                            placeholder={t('common.reason')}
                            value={drafts[m.personId] ?? ''}
                            onChange={(e) => setDrafts({ ...drafts, [m.personId]: e.target.value })}
                          />
                          {errors[m.personId] ? <p className="text-xs text-accent">{t('common.reasonRequired')}</p> : null}
                          <div className="flex gap-2">
                            <button type="button" className="rounded border border-border px-2 py-1" onClick={() => decide(m.personId, 'allowed')}>
                              {t('entries.allow')}
                            </button>
                            <button type="button" className="rounded border border-border px-2 py-1" onClick={() => decide(m.personId, 'refused')}>
                              {t('entries.refuse')}
                            </button>
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center gap-3">
          {accepted ? (
            <Badge tone="good">{t('entries.entryAccepted')}</Badge>
          ) : (
            <>
              <button
                type="button"
                disabled={!allDecided}
                onClick={() => setAccepted(true)}
                className="rounded-lg bg-primary px-3 py-1.5 text-primary-foreground disabled:opacity-50"
              >
                {t('entries.acceptEntry')}
              </button>
              {!allDecided ? <span className="text-xs text-muted-foreground">{t('entries.decideAllFirst')}</span> : null}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
