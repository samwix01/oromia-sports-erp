import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { PlansInbox } from '@/components/proto/plans-inbox';

export const dynamicParams = false;
export function generateStaticParams({ params }: { params: { workspace: string } }) {
  return params.workspace === 'bureau' ? [{}] : [];
}

export default async function PlansPage({ params }: { params: Promise<{ locale: string; workspace: string }> }) {
  const { locale, workspace } = await params;
  if (workspace !== 'bureau') notFound();
  setRequestLocale(locale);
  return <PlansInbox />;
}
