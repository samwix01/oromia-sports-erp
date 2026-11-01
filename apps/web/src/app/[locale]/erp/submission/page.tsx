'use client';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useSession } from '@/components/erp/session';
import { Button, D, ErrorText, Field, Input, PageTitle, Panel, Pill, statusTone } from '@/components/erp/ui';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';

interface Detail {
  submission: { id: string; definition_code: string; title: string; state: string; current_step: string | null; payload: Record<string, unknown>; version_seq: number; submitted_by: string; subject_id: string };
  canAct: boolean;
  log: { step: string; action: string; reason: string | null; at: string; actor_name: string | null; actor_roles: string[] }[];
  versions: { seq: number; payload: Record<string, unknown>; created_at: string }[];
}

const EDITABLE: Record<string, string[]> = {
  person_registration: ['givenName', 'fatherName', 'grandfatherName', 'dateOfBirth', 'phone'],
  org_recognition: ['name', 'shortName'],
};

function Body() {
  const t = useTranslations('erp');
  const id = useSearchParams().get('id') ?? '';
  const { me } = useSession();
  const { data, error, reload } = useApi<Detail>(id ? `/submissions/${id}` : null);
  const [reason, setReason] = useState('');
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  if (error) return <ErrorText error={error} />;
  if (!data) return null;
  const s = data.submission;
  const isSubmitter = s.submitted_by === me?.userId;

  async function act(action: string, payload?: Record<string, unknown>) {
    setBusy(true);
    setActionError(null);
    try {
      await api(`/submissions/${id}/actions`, { body: { action, reason: reason || undefined, payload } });
      setReason('');
      await reload();
    } catch (e) {
      setActionError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle actions={<Pill tone={statusTone(s.state)}>{t(`states.${s.state}` as never)}</Pill>}>
        {t(`workflows.${s.definition_code}` as never)}: {s.title}
      </PageTitle>

      <Panel title={t('submission.details', { version: s.version_seq })}>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {Object.entries(s.payload)
            .filter(([, v]) => v !== null && v !== undefined && v !== '' && typeof v !== 'object')
            .map(([k, v]) => (
              <div key={k}>
                <dt className="text-muted-foreground">{t(`fields.${k}` as never)}</dt>
                <dd>{String(v)}</dd>
              </div>
            ))}
        </dl>
      </Panel>

      {data.canAct ? (
        <Panel title={t('submission.decide')}>
          <div className="space-y-3">
            <Field label={t('common.reason')} hint={t('submission.reasonHint')}>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <ErrorText error={actionError} />
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => act('approve')}>{t('actions.approve')}</Button>
              <Button variant="secondary" disabled={busy} onClick={() => act('return')}>{t('actions.return')}</Button>
              <Button variant="danger" disabled={busy} onClick={() => act('reject')}>{t('actions.reject')}</Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('submission.segregation')}</p>
          </div>
        </Panel>
      ) : null}

      {isSubmitter && s.state === 'returned' ? (
        <Panel title={t('submission.resubmitTitle')}>
          <div className="grid gap-3 sm:grid-cols-2">
            {(EDITABLE[s.definition_code] ?? []).map((k) => (
              <Field key={k} label={t(`fields.${k}` as never)}>
                <Input defaultValue={String(s.payload[k] ?? '')} onChange={(e) => setEdits({ ...edits, [k]: e.target.value })} />
              </Field>
            ))}
          </div>
          <ErrorText error={actionError} />
          <div className="mt-3 flex gap-2">
            <Button disabled={busy} onClick={() => act('resubmit', edits)}>{t('actions.resubmit')}</Button>
            <Button variant="secondary" disabled={busy} onClick={() => act('withdraw')}>{t('actions.withdraw')}</Button>
          </div>
        </Panel>
      ) : null}

      <Panel title={t('submission.history')}>
        <ol className="space-y-2 text-sm">
          {data.log.map((l, i) => (
            <li key={i} className="border-t border-border pt-2">
              <span className="font-medium">{t(`actionLog.${l.action}` as never)}</span> · {l.actor_name ?? '—'} · <D iso={l.at} />
              {l.reason ? <div className="text-xs text-muted-foreground">{t('common.reason')}: {l.reason}</div> : null}
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}

export default function SubmissionPage() {
  return (
    <Suspense>
      <Body />
    </Suspense>
  );
}
