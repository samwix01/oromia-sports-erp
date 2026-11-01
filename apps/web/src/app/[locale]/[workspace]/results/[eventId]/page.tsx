import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ResultEntry } from '@/components/proto/result-entry';
import { EVENTS, findEvent } from '@/demo/data';

export const dynamicParams = false;
export function generateStaticParams({ params }: { params: { workspace: string } }) {
  return EVENTS.filter((e) => e.sport === params.workspace).map((e) => ({ eventId: e.id }));
}

export default async function ResultPage({ params }: { params: Promise<{ locale: string; workspace: string; eventId: string }> }) {
  const { locale, workspace, eventId } = await params;
  const event = findEvent(eventId);
  if (!event || event.sport !== workspace) notFound();
  setRequestLocale(locale);
  return <ResultEntry event={event} />;
}
