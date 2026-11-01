import { getTranslations, setRequestLocale } from 'next-intl/server';
import { EntryReview } from '@/components/proto/entry-review';

export default async function EntriesPage({ params }: { params: Promise<{ locale: string; workspace: string }> }) {
  const { locale, workspace } = await params;
  setRequestLocale(locale);
  if (workspace === 'football') return <EntryReview />;
  const t = await getTranslations('proto');
  return <p className="rounded-lg border border-dashed border-border p-6 text-muted-foreground">{t('fed.notBuilt')}</p>;
}
