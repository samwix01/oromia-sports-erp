'use client';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { useSession } from '@/components/erp/session';
import { Button, ErrorText, Field, Input, PageTitle, Panel, Select } from '@/components/erp/ui';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';

interface Territory { id: string; code: string; name_i18n: Record<string, string>; level: string }

export default function RegisterOrganisation() {
  const t = useTranslations('erp');
  const root = useTranslations();
  const { me } = useSession();
  const territories = useApi<Territory[]>('/territories');
  const sports = [...new Set(me?.assignments.map((a) => a.sportCode).filter((s): s is string => !!s))];
  const [f, setF] = useState({ type: 'club', name: '', shortName: '', sportCode: sports[0] ?? '', territoryId: '', phone: '', email: '' });
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState<{ organisationId: string; submissionId: string } | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const loc = me?.locale ?? 'en';

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      setDone(
        await api('/organisations', {
          body: {
            type: f.type,
            name: f.name,
            shortName: f.shortName || undefined,
            sportCode: f.sportCode,
            territoryId: f.territoryId || null,
            contacts: { ...(f.phone ? { phone: f.phone } : {}), ...(f.email ? { email: f.email } : {}) },
          },
        }),
      );
    } catch (err) {
      setError(err);
    }
  }

  if (done)
    return (
      <Panel title={t('orgs.submitted')}>
        <p className="text-sm">{t('orgs.submittedBody')}</p>
        <Link className="mt-3 inline-block text-sm underline" href={`/erp/submission?id=${done.submissionId}`}>{t('register.viewRequest')}</Link>
      </Panel>
    );

  return (
    <div>
      <PageTitle>{t('nav.registerOrganisation')}</PageTitle>
      <form onSubmit={submit} className="space-y-4">
        <Panel>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('fields.type')}>
              <Select value={f.type} onChange={set('type')}>
                {['club', 'academy', 'school'].map((x) => <option key={x} value={x}>{t(`orgTypes.${x}` as never)}</option>)}
              </Select>
            </Field>
            <Field label={t('fields.sportCode')}>
              <Select required value={f.sportCode} onChange={set('sportCode')}>
                <option value="">—</option>
                {(sports.length ? sports : ['football', 'athletics', 'volleyball', 'cycling']).map((s) => <option key={s} value={s}>{root(`workspaces.${s}` as never)}</option>)}
              </Select>
            </Field>
            <Field label={t('fields.name')}><Input required minLength={2} value={f.name} onChange={set('name')} /></Field>
            <Field label={t('fields.shortName')}><Input value={f.shortName} onChange={set('shortName')} /></Field>
            <Field label={t('fields.territoryId')}>
              <Select value={f.territoryId} onChange={set('territoryId')}>
                <option value="">—</option>
                {territories.data?.map((x) => <option key={x.id} value={x.id}>{x.name_i18n[loc] ?? x.name_i18n.en ?? x.code}</option>)}
              </Select>
            </Field>
            <Field label={t('fields.phone')}><Input type="tel" value={f.phone} onChange={set('phone')} /></Field>
            <Field label={t('fields.email')}><Input type="email" value={f.email} onChange={set('email')} /></Field>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t('orgs.recognitionNote')}</p>
        </Panel>
        <ErrorText error={error} />
        <Button type="submit">{t('actions.submit')}</Button>
      </form>
    </div>
  );
}
