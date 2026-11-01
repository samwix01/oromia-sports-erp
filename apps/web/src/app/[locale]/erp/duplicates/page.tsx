'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button, D, Empty, ErrorText, Input, PageTitle, Panel, Pill } from '@/components/erp/ui';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';

interface Dup {
  id: string;
  score: string;
  signals: { nameSimilarity: number; dobMatch: string; phoneMatch: boolean };
  a_id: string; a_name: string; a_birth_year: number | null; a_status: string; a_created: string;
  b_id: string; b_name: string; b_birth_year: number | null; b_status: string; b_created: string;
}

function Row({ d, onDone }: { d: Dup; onDone: () => void }) {
  const t = useTranslations('erp');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<unknown>(null);
  async function decide(decision: string) {
    setError(null);
    try {
      await api(`/duplicates/${d.id}/decide`, { body: { decision, reason } });
      onDone();
    } catch (e) {
      setError(e);
    }
  }
  return (
    <Panel>
      <div className="grid gap-3 sm:grid-cols-2">
        {(['a', 'b'] as const).map((side) => (
          <div key={side} className="rounded-lg bg-muted p-3 text-sm">
            <Link className="font-medium underline" href={`/erp/person?id=${d[`${side}_id`]}`}>{d[`${side}_name`]}</Link>
            <div className="text-xs text-muted-foreground">
              {d[`${side}_birth_year`] ?? '—'} · {t(`identity.${d[`${side}_status`]}` as never)} · <D iso={d[`${side}_created`]} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs">
        <Pill tone="warn">{t('duplicates.score', { score: Math.round(Number(d.score) * 100) })}</Pill>{' '}
        {t('duplicates.signals', { name: Math.round(d.signals.nameSimilarity * 100), dob: t(`duplicates.dob.${d.signals.dobMatch}` as never), phone: d.signals.phoneMatch ? '✓' : '—' })}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input className="max-w-md" placeholder={t('common.reason')} value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button disabled={reason.trim().length < 3} onClick={() => decide('same_person')}>{t('duplicates.same')}</Button>
        <Button variant="secondary" disabled={reason.trim().length < 3} onClick={() => decide('different_people')}>{t('duplicates.different')}</Button>
        <Button variant="secondary" disabled={reason.trim().length < 3} onClick={() => decide('held')}>{t('duplicates.hold')}</Button>
      </div>
      <ErrorText error={error} />
    </Panel>
  );
}

export default function Duplicates() {
  const t = useTranslations('erp');
  const { data, error, reload } = useApi<Dup[]>('/duplicates');
  return (
    <div className="space-y-4">
      <PageTitle>{t('nav.duplicates')}</PageTitle>
      <p className="text-sm text-muted-foreground">{t('duplicates.intro')}</p>
      <ErrorText error={error} />
      {data && !data.length ? <Empty>{t('duplicates.none')}</Empty> : null}
      {data?.map((d) => <Row key={d.id} d={d} onDone={reload} />)}
    </div>
  );
}
