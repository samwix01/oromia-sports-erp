'use client';
import { useTranslations } from 'next-intl';
import { useMemo, useState, type FormEvent } from 'react';
import { Button, ErrorText, Field, Input, PageTitle, Panel, Pill, Select } from '@/components/erp/ui';
import { useSession } from '@/components/erp/session';
import { Link } from '@/i18n/routing';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';

interface Org { id: string; name: string; sport_code: string | null; type: string; recognition_status: string }

export default function RegisterPerson() {
  const t = useTranslations('erp');
  const root = useTranslations();
  const { me } = useSession();
  const orgs = useApi<Org[]>('/organisations?status=recognised');
  // Only organisations the user is assigned to (or under) are offered; the API re-checks scope.
  const myOrgIds = new Set(me?.assignments.map((a) => a.orgId).filter(Boolean));
  const mySports = new Set(me?.assignments.map((a) => a.sportCode).filter(Boolean));
  const choices = useMemo(
    () => (orgs.data ?? []).filter((o) => ['club', 'academy', 'school'].includes(o.type) && (myOrgIds.has(o.id) || (o.sport_code && mySports.has(o.sport_code)))),
    [orgs.data, me],
  );
  const [f, setF] = useState({ givenName: '', fatherName: '', grandfatherName: '', sex: '', dateOfBirth: '', phone: '', email: '', assisted: false, orgId: '', roleType: 'athlete', startDate: new Date().toISOString().slice(0, 10) });
  const [error, setError] = useState<unknown>(null);
  const [result, setResult] = useState<{ personId: string; submissionId: string; possibleDuplicates: number } | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const org = choices.find((o) => o.id === f.orgId);
    try {
      setResult(
        await api('/people', {
          body: {
            givenName: f.givenName,
            fatherName: f.fatherName || undefined,
            grandfatherName: f.grandfatherName || undefined,
            sex: f.sex || undefined,
            dateOfBirth: f.dateOfBirth || undefined,
            phone: f.phone || undefined,
            email: f.email || undefined,
            assisted: f.assisted,
            affiliation: { orgId: f.orgId, sportCode: org?.sport_code ?? '', roleType: f.roleType, startDate: f.startDate },
          },
        }),
      );
    } catch (err) {
      setError(err);
    }
  }

  if (result)
    return (
      <Panel title={t('register.done')}>
        <p className="text-sm">{t('register.doneBody')}</p>
        {result.possibleDuplicates > 0 ? <p className="mt-2"><Pill tone="warn">{t('register.duplicatesFlagged', { count: result.possibleDuplicates })}</Pill></p> : null}
        <div className="mt-4 flex gap-3 text-sm">
          <Link className="underline" href={`/erp/submission?id=${result.submissionId}`}>{t('register.viewRequest')}</Link>
          <button type="button" className="underline" onClick={() => setResult(null)}>{t('register.another')}</button>
        </div>
      </Panel>
    );

  return (
    <div>
      <PageTitle>{t('nav.registerPerson')}</PageTitle>
      <form onSubmit={submit} className="space-y-4">
        <Panel title={t('register.identity')}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t('fields.givenName')}><Input required value={f.givenName} onChange={set('givenName')} /></Field>
            <Field label={t('fields.fatherName')}><Input value={f.fatherName} onChange={set('fatherName')} /></Field>
            <Field label={t('fields.grandfatherName')}><Input value={f.grandfatherName} onChange={set('grandfatherName')} /></Field>
            <Field label={t('fields.sex')}>
              <Select value={f.sex} onChange={set('sex')}>
                <option value="">—</option>
                <option value="F">{t('sex.F')}</option>
                <option value="M">{t('sex.M')}</option>
              </Select>
            </Field>
            <Field label={t('fields.dateOfBirth')} hint={t('register.gcHint')}><Input type="date" value={f.dateOfBirth} onChange={set('dateOfBirth')} /></Field>
            <Field label={t('fields.phone')}><Input type="tel" placeholder="+2519…" value={f.phone} onChange={set('phone')} /></Field>
            <Field label={t('fields.email')}><Input type="email" value={f.email} onChange={set('email')} /></Field>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.assisted} onChange={(e) => setF({ ...f, assisted: e.target.checked })} />
            {t('fields.assisted')}
          </label>
        </Panel>
        <Panel title={t('register.affiliation')}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label={t('fields.organisation')}>
              <Select required value={f.orgId} onChange={set('orgId')}>
                <option value="">—</option>
                {choices.map((o) => (
                  <option key={o.id} value={o.id}>{o.name} · {o.sport_code ? root(`workspaces.${o.sport_code}` as never) : ''}</option>
                ))}
              </Select>
            </Field>
            <Field label={t('fields.roleType')}>
              <Select value={f.roleType} onChange={set('roleType')}>
                {['athlete', 'coach', 'official', 'staff'].map((r) => <option key={r} value={r}>{t(`roleTypes.${r}` as never)}</option>)}
              </Select>
            </Field>
            <Field label={t('fields.startDate')}><Input type="date" required value={f.startDate} onChange={set('startDate')} /></Field>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t('register.scopeNote')}</p>
        </Panel>
        <ErrorText error={error} />
        <Button type="submit">{t('actions.submit')}</Button>
      </form>
    </div>
  );
}
