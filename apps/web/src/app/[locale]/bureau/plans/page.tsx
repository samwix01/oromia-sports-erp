import { setRequestLocale } from 'next-intl/server';
import { PlansInbox } from '@/components/proto/plans-inbox';

export default async function PlansPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PlansInbox />;
}
