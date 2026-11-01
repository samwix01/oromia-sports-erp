'use client';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { useSession } from '@/components/erp/session';
import { Button, ErrorText, Field, Input, PageTitle, Panel, Pill, Select } from '@/components/erp/ui';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';

interface User { id: string; email: string; fullName: string; status: string; mfaEnabled: boolean; assignments: { id: string; roleKey: string; orgName: string | null; sportCode: string | null; validTo: string | null }[] }
interface Org { id: string; name: string; type: string; sport_code: string | null }

const ROLES = ['club.admin', 'fed.registrar', 'fed.secretariat', 'bureau.reviewer', 'bureau.executive', 'territory.coordinator', 'data.steward', 'platform.admin'];

export default function Users() {
  const t = useTranslations('erp');
  const root = useTranslations();
  const { can } = useSession();
  const users = useApi<User[]>('/users');
  const orgs = useApi<Org[]>('/organisations?status=recognised');
  const [f, setF] = useState({ email: '', fullName: '', temporaryPassword: '', roleKey: 'club.admin', orgId: '' });
  const [error, setError] = useState<unknown>(null);
  const [created, setCreated] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreated(false);
    const org = orgs.data?.find((o) => o.id === f.orgId);
    try {
      await api('/users', {
        body: { email: f.email, fullName: f.fullName, temporaryPassword: f.temporaryPassword, assignments: [{ roleKey: f.roleKey, orgId: f.orgId || null, sportCode: org?.sport_code ?? null }] },
      });
      setCreated(true);
      setF({ ...f, email: '', fullName: '', temporaryPassword: '' });
      await users.reload();
    } catch (err) {
      setError(err);
    }
  }

  async function revoke(id: string) {
    try {
      await api(`/users/assignments/${id}`, { method: 'DELETE' });
      await users.reload();
    } catch (err) {
      setError(err);
    }
  }

  return (
    <div className="space-y-4">
      <PageTitle>{t('nav.users')}</PageTitle>
      <ErrorText error={users.error} />
      <Panel>
        <table className="w-full text-sm">
          <tbody>
            {users.data?.map((u) => (
              <tr key={u.id} className="border-t border-border align-top">
                <td className="py-2">
                  <div className="font-medium">{u.fullName}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </td>
                <td>
                  {u.assignments.map((a) => (
                    <div key={a.id} className="text-xs">
                      {t(`roles.${a.roleKey}` as never)}
                      {a.orgName ? ` · ${a.orgName}` : ''}
                      {a.sportCode ? ` · ${root(`workspaces.${a.sportCode}` as never)}` : ''}
                      {a.validTo ? <> · <Pill tone="neutral">{t('users.ended')}</Pill></> : can('iam.user.manage') ? (
                        <button type="button" className="ml-2 text-accent underline" onClick={() => revoke(a.id)}>{t('users.revoke')}</button>
                      ) : null}
                    </div>
                  ))}
                </td>
                <td className="text-right">{u.mfaEnabled ? <Pill tone="good">{t('users.mfa')}</Pill> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      {can('iam.user.manage') ? (
        <Panel title={t('users.create')}>
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            <Field label={t('fields.fullName')}><Input required value={f.fullName} onChange={set('fullName')} /></Field>
            <Field label={t('fields.email')}><Input type="email" required value={f.email} onChange={set('email')} /></Field>
            <Field label={t('users.tempPassword')} hint={t('users.passwordRule')}><Input type="text" required minLength={12} value={f.temporaryPassword} onChange={set('temporaryPassword')} /></Field>
            <Field label={t('users.role')}>
              <Select value={f.roleKey} onChange={set('roleKey')}>
                {ROLES.map((r) => <option key={r} value={r}>{t(`roles.${r}` as never)}</option>)}
              </Select>
            </Field>
            <Field label={t('fields.organisation')}>
              <Select value={f.orgId} onChange={set('orgId')}>
                <option value="">{t('users.regionWide')}</option>
                {orgs.data?.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <ErrorText error={error} />
              {created ? <p className="text-sm text-primary">{t('users.created')}</p> : null}
              <Button type="submit" className="mt-2">{t('users.create')}</Button>
              <p className="mt-2 text-xs text-muted-foreground">{t('users.grantNote')}</p>
            </div>
          </form>
        </Panel>
      ) : null}
    </div>
  );
}
