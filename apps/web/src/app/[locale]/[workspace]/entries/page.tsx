import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { EntryReview } from '@/components/proto/entry-review';
import { SPORTS, type Sport } from '@/demo/data';

export const dynamicParams = false;
export function generateStaticParams({ params }: { params: { workspace: string } }) {
  return SPORTS.includes(params.workspace as Sport) ? [{}] : [];
}

export default async function EntriesPage({ params }: { params: Promise<{ locale: string; workspace: string }> }) {
  const { locale, workspace } = await params;
  if (!SPORTS.includes(workspace as Sport)) notFound();
  setRequestLocale(locale);
  if (workspace === 'football') return <EntryReview />;
  const t = await getTranslations('proto');
  return <p className="rounded-lg border border-dashed border-border p-6 text-muted-foreground">{t('fed.notBuilt')}</p>;
}
