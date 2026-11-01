'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Empty, ErrorText, Input, PageTitle, Panel, Pill, statusTone } from '@/components/erp/ui';
import { Link } from '@/i18n/routing';
import { useApi } from '@/lib/use-api';

interface PersonListItem {
  id: string;
  fullName: string;
  birthYear: string | null;
  identityStatus: string;
  roles: { sport: string; role: string; status: string; org: string }[];
}

export default function People() {
  const t = useTranslations('erp');
  const root = useTranslations();
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const { data, error } = useApi<PersonListItem[]>(`/people${query ? `?q=${encodeURIComponent(query)}` : ''}`);
  return (
    <div className="space-y-4">
      <PageTitle actions={<Link href="/erp/people/new" className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">{t('nav.registerPerson')}</Link>}>
        {t('nav.people')}
      </PageTitle>
      <form onSubmit={(e) => { e.preventDefault(); setQuery(q); }}>
        <Input placeholder={t('common.search')} value={q} onChange={(e) => setQ(e.target.value)} />
      </form>
      <ErrorText error={error} />
      <Panel>
        {data && !data.length ? <Empty>{t('common.noRecords')}</Empty> : null}
        <table className="w-full text-sm">
          <tbody>
            {data?.map((p) => (
              <tr key={p.id} className="border-t border-border align-top">
                <td className="py-2">
                  <Link className="underline" href={`/erp/person?id=${p.id}`}>{p.fullName}</Link>
                  <div className="text-xs text-muted-foreground">{p.birthYear ?? '—'}</div>
                </td>
                <td>
                  {p.roles.map((r, i) => (
                    <div key={i} className="text-xs">
                      {t(`roleTypes.${r.role}` as never)} · {root(`workspaces.${r.sport}` as never)} · {r.org}{' '}
                      <Pill tone={statusTone(r.status)}>{t(`affStatus.${r.status}` as never)}</Pill>
                    </div>
                  ))}
                </td>
                <td className="text-right">
                  <Pill tone={statusTone(p.identityStatus)}>{t(`identity.${p.identityStatus}` as never)}</Pill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
