'use client';
import { useTranslations } from 'next-intl';
import { useSession } from '@/components/erp/session';
import { D, Empty, ErrorText, PageTitle, Panel, Pill } from '@/components/erp/ui';
import { Link } from '@/i18n/routing';
import { useApi } from '@/lib/use-api';

interface Indicator {
  key: string;
  status: 'ok' | 'not_collected';
  value: number | null;
  denominator: number | null;
  pending?: number;
  overdue?: number;
  source: string;
  verification: string;
}
interface CommandCentre {
  asOf: string;
  indicators: Indicator[];
  bySport: { sport: string; clubs: number; athletes: number; coaches: number; officials: number }[];
}

export default function Dashboard() {
  const t = useTranslations('erp');
  const root = useTranslations();
  const { me, can } = useSession();
  const cc = useApi<CommandCentre>(can('reporting.read') ? '/reports/command-centre' : null);
  const inbox = useApi<{ toAct: unknown[] }>(can('workflow.inbox') ? '/submissions/inbox' : null);

  return (
    <div className="space-y-6">
      <PageTitle>{t('dashboard.welcome', { name: me?.fullName ?? '' })}</PageTitle>
      {can('workflow.inbox') ? (
        <Panel>
          <Link href="/erp/inbox" className="underline">
            {t('dashboard.toAct', { count: inbox.data?.toAct.length ?? 0 })}
          </Link>
        </Panel>
      ) : null}

      {can('reporting.read') ? (
        <>
          <ErrorText error={cc.error} />
          {cc.data ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cc.data.indicators.map((i) => (
                  <Panel key={i.key}>
                    <p className="text-sm text-muted-foreground">{t(`indicators.${i.key}.label` as never)}</p>
                    {i.status === 'not_collected' || i.value === null ? (
                      <p className="mt-2 font-semibold text-accent">{t('dashboard.notCollected')}</p>
                    ) : (
                      <p className="mt-2 text-3xl font-semibold">
                        {i.value}
                        {i.denominator !== null ? <span className="text-base font-normal text-muted-foreground"> / {i.denominator}</span> : null}
                      </p>
                    )}
                    {i.pending ? <p className="text-xs">{t('dashboard.pending', { count: i.pending })}</p> : null}
                    {i.overdue ? <Pill tone="bad">{t('dashboard.overdue', { count: i.overdue })}</Pill> : null}
                    <p className="mt-2 text-xs text-muted-foreground">{t(`indicators.${i.key}.definition` as never)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t('dashboard.source')}: {i.source} · <D iso={cc.data!.asOf} />
                    </p>
                  </Panel>
                ))}
              </div>
              <Panel title={t('dashboard.bySport')}>
                <table className="w-full text-sm">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-1">{t('common.sport')}</th>
                      <th>{t('dashboard.clubs')}</th>
                      <th>{t('roleTypes.athlete')}</th>
                      <th>{t('roleTypes.coach')}</th>
                      <th>{t('roleTypes.official')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cc.data.bySport.map((s) => (
                      <tr key={s.sport} className="border-t border-border">
                        <td className="py-2">{root(`workspaces.${s.sport}` as never)}</td>
                        <td>{s.clubs}</td>
                        <td>{s.athletes}</td>
                        <td>{s.coaches}</td>
                        <td>{s.officials}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            </>
          ) : null}
        </>
      ) : !can('workflow.inbox') ? (
        <Empty>{t('dashboard.nothing')}</Empty>
      ) : null}
    </div>
  );
}
