'use client';
import { useTranslations } from 'next-intl';
import { D, Empty, ErrorText, PageTitle, Panel, Pill, statusTone } from '@/components/erp/ui';
import { Link } from '@/i18n/routing';
import { useApi } from '@/lib/use-api';

export interface Submission {
  id: string;
  definition_code: string;
  title: string;
  state: string;
  current_step: string | null;
  sport_code: string | null;
  version_seq: number;
  created_at: string;
  updated_at: string;
}

function List({ rows }: { rows: Submission[] }) {
  const t = useTranslations('erp');
  if (!rows.length) return <Empty>{t('common.noRecords')}</Empty>;
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-muted-foreground">
        <tr>
          <th className="py-1">{t('inbox.request')}</th>
          <th>{t('inbox.subject')}</th>
          <th>{t('common.status')}</th>
          <th>{t('inbox.updated')}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((s) => (
          <tr key={s.id} className="border-t border-border">
            <td className="py-2">{t(`workflows.${s.definition_code}` as never)}</td>
            <td>
              <Link className="underline" href={`/erp/submission?id=${s.id}`}>
                {s.title}
              </Link>
            </td>
            <td>
              <Pill tone={statusTone(s.state)}>{t(`states.${s.state}` as never)}</Pill>
            </td>
            <td>
              <D iso={s.updated_at} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Inbox() {
  const t = useTranslations('erp.inbox');
  const { data, error } = useApi<{ toAct: Submission[]; mine: Submission[] }>('/submissions/inbox');
  return (
    <div className="space-y-6">
      <PageTitle>{t('title')}</PageTitle>
      <ErrorText error={error} />
      <Panel title={t('toAct')}>{data ? <List rows={data.toAct} /> : null}</Panel>
      <Panel title={t('mine')}>{data ? <List rows={data.mine} /> : null}</Panel>
    </div>
  );
}
