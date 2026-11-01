import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { ResultEntry } from '@/components/proto/result-entry';
import { WorkspaceNav } from '@/components/proto/workspace-nav';
import { EVENTS, findEvent } from '@/demo/data';

export const dynamicParams = false;
export function generateStaticParams() {
  return EVENTS.map((e) => ({ eventId: e.id }));
}

export default async function ResultPage({ params }: { params: Promise<{ locale: string; eventId: string }> }) {
  const { locale, eventId } = await params;
  const event = findEvent(eventId);
  if (!event) notFound();
  setRequestLocale(locale);
  return (
    <>
      <WorkspaceNav workspace={event.sport} />
      <ResultEntry event={event} />
    </>
  );
}
