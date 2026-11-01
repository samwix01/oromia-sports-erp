'use client';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { CLUBS, EVENTS, PEOPLE, type Sport } from '@/demo/data';
import { Badge, Card, DateText, DemoTag } from './bits';

export function FederationHome({ sport }: { sport: Sport }) {
  const root = useTranslations();
  const t = useTranslations('proto');
  // Workspace scope: only this sport's sections, roles and events are listed.
  const clubs = CLUBS.filter((c) => c.sections.some((s) => s.sport === sport));
  const people = PEOPLE.filter((p) => p.roles.some((r) => r.sport === sport && !r.to));
  const events = EVENTS.filter((e) => e.sport === sport);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">
          {root(`workspaces.${sport}`)}
          <DemoTag />
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('fed.intro')}</p>
      </header>
      {sport === 'volleyball' || sport === 'cycling' ? (
        <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">{t('fed.notBuilt')}</p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t('fed.clubs')}>
          <ul className="space-y-2 text-sm">
            {clubs.length === 0 ? <li className="text-muted-foreground">{t('common.noRecords')}</li> : null}
            {clubs.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2">
                <Link className="underline" href={`/${sport}/clubs/${c.id}`}>
                  {c.name}
                </Link>
                <Badge tone={c.recognition === 'recognised' ? 'good' : 'warn'}>{t(`club.recognition.${c.recognition}`)}</Badge>
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t('fed.people')}>
          <ul className="space-y-2 text-sm">
            {people.length === 0 ? <li className="text-muted-foreground">{t('common.noRecords')}</li> : null}
            {people.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <Link className="underline" href={`/${sport}/people/${p.id}`}>
                  {p.name}
                </Link>
                <Badge tone={p.identity === 'verified' ? 'good' : 'warn'}>{t(`athlete.identity.${p.identity}`)}</Badge>
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t('fed.events')}>
          <ul className="space-y-2 text-sm">
            {events.length === 0 ? <li className="text-muted-foreground">{t('common.noRecords')}</li> : null}
            {events.map((e) => (
              <li key={e.id}>
                <Link className="underline" href={`/${sport}/results/${e.id}`}>
                  {e.title}
                </Link>
                <div className="text-xs text-muted-foreground">
                  <DateText iso={e.date} /> · {e.venue}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
