'use client';
import { useTranslations } from 'next-intl';
import { ACTION_QUEUE, FEDERATION_REPORTING, INDICATORS } from '@/demo/data';
import { Badge, Card, DateText, DemoTag } from './bits';

export function CommandCentre() {
  const t = useTranslations('proto');
  const root = useTranslations();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">
          {t('cc.title')}
          <DemoTag />
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t('cc.intro')}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {INDICATORS.map((i) => (
          <Card key={i.key}>
            <p className="text-sm text-muted-foreground">{t(`cc.indicators.${i.key}.label`)}</p>
            {i.value === null ? (
              // Rule 5: missing is not zero.
              <p className="mt-2 text-lg font-semibold text-accent">{t('cc.noReport')}</p>
            ) : (
              <p className="mt-2 text-3xl font-semibold">
                {i.value}
                {i.denominator !== null ? (
                  <span className="text-base font-normal text-muted-foreground">
                    {' '}
                    {t('common.of')} {i.denominator}
                  </span>
                ) : null}
              </p>
            )}
            {i.value !== null && i.denominator === null ? (
              <p className="text-xs text-muted-foreground">{t('cc.denominatorUnknown')}</p>
            ) : null}
            <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
              <dd>{t(`cc.indicators.${i.key}.definition`)}</dd>
              <dd>
                {t('common.coverage')}: {i.coveragePct}%
              </dd>
              <dd>
                {t('common.verification')}: {t(`verification.${i.verification}`)}
              </dd>
              <dd>
                {t('common.source')}: {i.source} · {t('common.asOf')} <DateText iso={i.asOf} />
              </dd>
            </dl>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t('cc.federationReporting')}>
          <table className="w-full text-sm">
            <tbody>
              {FEDERATION_REPORTING.map((f) => (
                <tr key={f.sport} className="border-t border-border">
                  <td className="py-2">{root(`workspaces.${f.sport}`)}</td>
                  <td>
                    <Badge tone={f.monthly === 'accepted' ? 'good' : f.monthly === 'overdue' ? 'bad' : 'warn'}>
                      {t(`cc.monthly.${f.monthly}`)}
                    </Badge>
                  </td>
                  <td className="text-right text-muted-foreground">
                    {t('cc.openActions')}: {f.openActions}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card title={t('cc.actionQueue')}>
          <ul className="space-y-2 text-sm">
            {ACTION_QUEUE.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 border-t border-border pt-2">
                <span>
                  <Badge tone={a.kind === 'overdue_report' ? 'bad' : 'warn'}>{t(`cc.actionKinds.${a.kind}`)}</Badge>
                  <span className="ml-2">{a.subject}</span>
                </span>
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {t('cc.due')} <DateText iso={a.due} />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
