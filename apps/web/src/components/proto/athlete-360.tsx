'use client';
import { useTranslations } from 'next-intl';
import { CLUBS, type Person } from '@/demo/data';
import { Badge, Card, DateText, DemoTag } from './bits';

export function Athlete360({ person }: { person: Person }) {
  const root = useTranslations();
  const t = useTranslations('proto');
  const clubName = (id?: string) => (id ? (CLUBS.find((c) => c.id === id)?.name ?? '—') : '—');
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">
          {person.name}
          <DemoTag />
        </h1>
        <Badge tone={person.identity === 'verified' ? 'good' : 'warn'}>{t(`athlete.identity.${person.identity}`)}</Badge>
        <span className="text-sm text-muted-foreground">
          {t('athlete.birthYear')}: {person.birthYear}
        </span>
      </header>

      <Card title={t('athlete.roles')}>
        <p className="mb-2 text-xs text-muted-foreground">{t('athlete.sportScopeNote')}</p>
        <table className="w-full text-sm">
          <tbody>
            {person.roles.map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td className="py-2">{t(`athlete.role.${r.role}`)}</td>
                <td>{root(`workspaces.${r.sport}`)}</td>
                <td>{clubName(r.clubId)}</td>
                <td className="text-xs text-muted-foreground">
                  {t('athlete.from')} <DateText iso={r.from} />
                  {r.to ? (
                    <>
                      {' '}
                      · {t('athlete.to')} <DateText iso={r.to} />
                    </>
                  ) : (
                    <>
                      {' '}
                      · <Badge tone="good">{t('athlete.current')}</Badge>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t('athlete.results')}>
          {person.results.length === 0 ? <p className="text-sm text-muted-foreground">{t('common.noRecords')}</p> : null}
          <ul className="space-y-2 text-sm">
            {person.results.map((r, i) => (
              <li key={i} className="border-t border-border pt-2">
                <div className="flex justify-between gap-2">
                  <span>{r.event}</span>
                  <span className="font-mono">{r.mark}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <DateText iso={r.date} /> ·{' '}
                  <Badge tone={r.status === 'published' ? 'good' : 'neutral'}>{t(`athlete.resultStatus.${r.status}`)}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t('athlete.qualifications')}>
          {person.qualifications.length === 0 ? <p className="text-sm text-muted-foreground">{t('common.noRecords')}</p> : null}
          <ul className="space-y-2 text-sm">
            {person.qualifications.map((q, i) => (
              <li key={i} className="border-t border-border pt-2">
                <div>{q.title}</div>
                <div className="text-xs text-muted-foreground">
                  {root(`workspaces.${q.sport}`)}
                  {q.expires ? (
                    <>
                      {' '}
                      · {t('athlete.expires')} <DateText iso={q.expires} />
                    </>
                  ) : null}{' '}
                  · <Badge tone={q.status === 'verified' ? 'good' : 'warn'}>{t(`athlete.qualStatus.${q.status}`)}</Badge>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t('athlete.externalIds')}>
          {person.externalIds.length === 0 ? <p className="text-sm text-muted-foreground">{t('common.noRecords')}</p> : null}
          <ul className="text-sm">
            {person.externalIds.map((x) => (
              <li key={x.value}>
                {x.scheme}: <span className="font-mono">{x.value}</span>
                {x.verifiedOn ? (
                  <span className="text-xs text-muted-foreground">
                    {' '}
                    · {t('athlete.verifiedOn')} <DateText iso={x.verifiedOn} />
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t('athlete.clearance')}>
          <Badge tone={person.clearance === 'pending' ? 'warn' : 'good'}>{t(`athlete.clearanceStatus.${person.clearance}`)}</Badge>
          <p className="mt-2 text-xs text-muted-foreground">{t('athlete.clearanceNote')}</p>
        </Card>
      </div>
    </div>
  );
}
