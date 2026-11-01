import { setRequestLocale } from 'next-intl/server';
import { CommandCentre } from '@/components/proto/command-centre';

export default async function BureauHome({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <CommandCentre />;
}
