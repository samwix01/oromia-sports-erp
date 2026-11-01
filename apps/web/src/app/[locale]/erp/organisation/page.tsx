'use client';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useSession } from '@/components/erp/session';
import { D, ErrorText, PageTitle, Panel, Pill, statusTone } from '@/components/erp/ui';
import { Link } from '@/i18n/routing';
import { useApi } from '@/lib/use-api';

interface OrgDetail {
  organisation: { id: string; type: string; name: string; short_name: string | null; sport_code: string | null; recognition_status: string; contacts: Record<string, string> };
  children: { id: string; type: string; name: string; recognition_status: string; sport_code: string | null }[];
  submissions: { id: string; definition_code: string; state: string; title: string; created_at: string }[];
  activeMembers: { roleType: string; count: number }[];
}

function Body() {
  const t = useTranslations('erp');
  const root = useTranslations();
  const { can } = useSession();
  const id = useSearchParams().get('id') ?? '';
  const { data, error } = useApi<OrgDetail>(id ? `/organisations/${id}` : null);
  if (error) return <ErrorText error={error} />;
  if (!data) return null;
  const o = data.organisation;
  return (
    <div className="space-y-4">
      <PageTitle actions={<Pill tone={statusTone(o.recognition_status)}>{t(`recognition.${o.recognition_status}` as never)}</Pill>}>{o.name}</PageTitle>
      <Panel>
        <dl className="grid gap-2 text-sm sm:grid-cols-3">
          <div><dt className="text-muted-foreground">{t('fields.type')}</dt><dd>{t(`orgTypes.${o.type}` as never)}</dd></div>
          <div><dt className="text-muted-foreground">{t('fields.sportCode')}</dt><dd>{o.sport_code ? root(`workspaces.${o.sport_code}` as never) : '—'}</dd></div>
          <div><dt className="text-muted-foreground">{t('fields.phone')}</dt><dd>{o.contacts.phone ?? '—'}</dd></div>
        </dl>
      </Panel>
      <Panel title={t('orgs.members')}>
        <div className="flex flex-wrap gap-4 text-sm">
          {data.activeMembers.length ? data.activeMembers.map((m) => <span key={m.roleType}>{t(`roleTypes.${m.roleType}` as never)}: <strong>{m.count}</strong></span>) : <span className="text-muted-foreground">{t('common.noRecords')}</span>}
        </div>
        {can('people.read') ? <Link className="mt-2 inline-block text-sm underline" href="/erp/people">{t('nav.people')}</Link> : null}
      </Panel>
      {data.children.length ? (
        <Panel title={t('orgs.children')}>
          <ul className="space-y-1 text-sm">
            {data.children.map((c) => (
              <li key={c.id}>
                <Link className="underline" href={`/erp/organisation?id=${c.id}`}>{c.name}</Link>{' '}
                <Pill tone={statusTone(c.recognition_status)}>{t(`recognition.${c.recognition_status}` as never)}</Pill>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
      {data.submissions.length ? (
        <Panel title={t('person.requests')}>
          <ul className="space-y-1 text-sm">
            {data.submissions.map((s) => (
              <li key={s.id}>
                <Link className="underline" href={`/erp/submission?id=${s.id}`}>{t(`workflows.${s.definition_code}` as never)}</Link>{' '}
                <Pill tone={statusTone(s.state)}>{t(`states.${s.state}` as never)}</Pill> · <D iso={s.created_at} />
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </div>
  );
}

export default function OrganisationPage() {
  return (
    <Suspense>
      <Body />
    </Suspense>
  );
}
