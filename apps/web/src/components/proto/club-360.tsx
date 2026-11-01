'use client';
import { useTranslations } from 'next-intl';
import { TERRITORIES, type Club } from '@/demo/data';
import { Badge, Card, DemoTag } from './bits';

export function Club360({ club }: { club: Club }) {
  const root = useTranslations();
  const t = useTranslations('proto');
  const territory = TERRITORIES.find((x) => x.id === club.territoryId)?.name;
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">
          {club.name}
          <DemoTag />
        </h1>
        <Badge tone={club.recognition === 'recognised' ? 'good' : 'warn'}>{t(`club.recognition.${club.recognition}`)}</Badge>
        <span className="text-sm text-muted-foreground">
          {t('club.territory')}: {territory}
        </span>
      </header>
      <Card title={t('club.sections')}>
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-1">{root('shell.workspace')}</th>
              <th>{t('club.squads')}</th>
              <th>{t('club.staff')}</th>
              <th>{t('club.obligationsOpen')}</th>
            </tr>
          </thead>
          <tbody>
            {club.sections.map((s) => (
              <tr key={s.sport} className="border-t border-border">
                <td className="py-2">{root(`workspaces.${s.sport}`)}</td>
                <td>{s.squads.join(', ')}</td>
                <td>{s.staff}</td>
                <td>{s.obligationsOpen > 0 ? <Badge tone="warn">{s.obligationsOpen}</Badge> : s.obligationsOpen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title={t('club.documents')}>
        <ul className="space-y-2 text-sm">
          {club.documents.map((d) => (
            <li key={d.title} className="flex justify-between gap-2 border-t border-border pt-2">
              <span>{d.title}</span>
              <Badge tone={d.status === 'accepted' ? 'good' : d.status === 'missing' ? 'bad' : 'warn'}>
                {t(`club.docStatus.${d.status}`)}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
