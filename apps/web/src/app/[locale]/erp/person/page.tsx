'use client';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { D, ErrorText, PageTitle, Panel, Pill, statusTone } from '@/components/erp/ui';
import { Link } from '@/i18n/routing';
import { useApi } from '@/lib/use-api';

interface Person360 {
  person: { id: string; fullName: string; sex: string | null; dateOfBirth: string | null; birthYear: string | null; phone: string | null; email: string | null; identityStatus: string; assistedRegistration: boolean; mergedIntoId: string | null; sensitiveVisible: boolean };
  affiliations: { id: string; orgId: string; orgName: string; sportCode: string; roleType: string; startDate: string; endDate: string | null; status: string }[];
  duplicates: { id: string; score: string; status: string }[];
  submissions: { id: string; definition_code: string; state: string; created_at: string }[];
}

function Body() {
  const t = useTranslations('erp');
  const root = useTranslations();
  const id = useSearchParams().get('id') ?? '';
  const { data, error } = useApi<Person360>(id ? `/people/${id}` : null);
  if (error) return <ErrorText error={error} />;
  if (!data) return null;
  const p = data.person;
  return (
    <div className="space-y-4">
      <PageTitle actions={<Pill tone={statusTone(p.identityStatus)}>{t(`identity.${p.identityStatus}` as never)}</Pill>}>{p.fullName}</PageTitle>
      {p.mergedIntoId ? <Pill tone="bad">{t('person.merged')}</Pill> : null}
      <Panel title={t('person.profile')}>
        <dl className="grid gap-2 text-sm sm:grid-cols-3">
          <div><dt className="text-muted-foreground">{t('fields.dateOfBirth')}</dt><dd>{p.dateOfBirth ? <D iso={p.dateOfBirth} /> : p.birthYear ?? '—'}</dd></div>
          <div><dt className="text-muted-foreground">{t('fields.sex')}</dt><dd>{p.sex ? t(`sex.${p.sex}` as never) : '—'}</dd></div>
          <div><dt className="text-muted-foreground">{t('fields.phone')}</dt><dd>{p.phone ?? '—'}</dd></div>
          <div><dt className="text-muted-foreground">{t('fields.email')}</dt><dd>{p.email ?? '—'}</dd></div>
          <div><dt className="text-muted-foreground">{t('fields.assisted')}</dt><dd>{p.assistedRegistration ? '✓' : '—'}</dd></div>
        </dl>
        {!p.sensitiveVisible ? <p className="mt-2 text-xs text-muted-foreground">{t('person.masked')}</p> : null}
      </Panel>
      <Panel title={t('person.affiliations')}>
        <p className="mb-2 text-xs text-muted-foreground">{t('person.scopeNote')}</p>
        <table className="w-full text-sm">
          <tbody>
            {data.affiliations.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="py-2">{t(`roleTypes.${a.roleType}` as never)}</td>
                <td>{root(`workspaces.${a.sportCode}` as never)}</td>
                <td><Link className="underline" href={`/erp/organisation?id=${a.orgId}`}>{a.orgName}</Link></td>
                <td className="text-xs"><D iso={a.startDate} /> – {a.endDate ? <D iso={a.endDate} /> : '…'}</td>
                <td><Pill tone={statusTone(a.status)}>{t(`affStatus.${a.status}` as never)}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Panel title={t('person.requests')}>
        <ul className="space-y-1 text-sm">
          {data.submissions.map((s) => (
            <li key={s.id}>
              <Link className="underline" href={`/erp/submission?id=${s.id}`}>{t(`workflows.${s.definition_code}` as never)}</Link>{' '}
              <Pill tone={statusTone(s.state)}>{t(`states.${s.state}` as never)}</Pill> · <D iso={s.created_at} />
            </li>
          ))}
        </ul>
        {data.duplicates.some((d) => d.status === 'open') ? <p className="mt-2"><Pill tone="warn">{t('person.openDuplicate')}</Pill></p> : null}
      </Panel>
    </div>
  );
}

export default function PersonPage() {
  return (
    <Suspense>
      <Body />
    </Suspense>
  );
}
