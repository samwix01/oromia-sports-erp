import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Athlete360 } from '@/components/proto/athlete-360';
import { PEOPLE, findPerson } from '@/demo/data';

export const dynamicParams = false;
export function generateStaticParams({ params }: { params: { workspace: string } }) {
  return PEOPLE.filter((p) => p.roles.some((r) => r.sport === params.workspace)).map((p) => ({ id: p.id }));
}

export default async function PersonPage({ params }: { params: Promise<{ locale: string; workspace: string; id: string }> }) {
  const { locale, workspace, id } = await params;
  const person = findPerson(id);
  if (!person || !person.roles.some((r) => r.sport === workspace)) notFound();
  setRequestLocale(locale);
  return <Athlete360 person={person} />;
}
