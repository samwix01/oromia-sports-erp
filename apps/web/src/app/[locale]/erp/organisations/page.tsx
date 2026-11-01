'use client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useSession } from '@/components/erp/session';
import { Empty, ErrorText, PageTitle, Panel, Pill, Select, statusTone } from '@/components/erp/ui';
import { Link } from '@/i18n/routing';
import { useApi } from '@/lib/use-api';

interface Org { id: string; type: string; name: string; sport_code: string | null; recognition_status: string; parent_name: string | null; territory_name: Record<string, string> | null }

export default function Organisations() {
  const t = useTranslations('erp');
  const root = useTranslations();
  const { me, can } = useSession();
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const qs = new URLSearchParams({ ...(type ? { type } : {}), ...(status ? { status } : {}) }).toString();
  const { data, error } = useApi<Org[]>(`/organisations${qs ? `?${qs}` : ''}`);
  const loc = me?.locale ?? 'en';
  return (
    <div className="space-y-4">
      <PageTitle actions={can('institutions.organisation.submit') ? <Link href="/erp/organisations/new" className="rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">{t('nav.registerOrganisation')}</Link> : null}>
        {t('nav.organisations')}
      </PageTitle>
      <div className="flex flex-wrap gap-3">
        <Select className="w-auto" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">{t('orgs.allTypes')}</option>
          {['bureau', 'federation', 'club', 'academy', 'school'].map((x) => <option key={x} value={x}>{t(`orgTypes.${x}` as never)}</option>)}
        </Select>
        <Select className="w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">{t('orgs.allStatuses')}</option>
          {['recognised', 'pending', 'rejected', 'suspended'].map((x) => <option key={x} value={x}>{t(`recognition.${x}` as never)}</option>)}
        </Select>
      </div>
      <ErrorText error={error} />
      <Panel>
        {data && !data.length ? <Empty>{t('common.noRecords')}</Empty> : null}
        <table className="w-full text-sm">
          <tbody>
            {data?.map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="py-2"><Link className="underline" href={`/erp/organisation?id=${o.id}`}>{o.name}</Link></td>
                <td>{t(`orgTypes.${o.type}` as never)}</td>
                <td>{o.sport_code ? root(`workspaces.${o.sport_code}` as never) : '—'}</td>
                <td className="text-muted-foreground">{o.territory_name?.[loc] ?? o.territory_name?.en ?? '—'}</td>
                <td className="text-right"><Pill tone={statusTone(o.recognition_status)}>{t(`recognition.${o.recognition_status}` as never)}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
