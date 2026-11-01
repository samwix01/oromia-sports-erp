import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Club360 } from '@/components/proto/club-360';
import { CLUBS, findClub } from '@/demo/data';

export const dynamicParams = false;
export function generateStaticParams({ params }: { params: { workspace: string } }) {
  // Workspace scope: a federation only sees clubs with a section in its sport.
  return CLUBS.filter((c) => c.sections.some((s) => s.sport === params.workspace)).map((c) => ({ id: c.id }));
}

export default async function ClubPage({ params }: { params: Promise<{ locale: string; workspace: string; id: string }> }) {
  const { locale, workspace, id } = await params;
  const club = findClub(id);
  if (!club || !club.sections.some((s) => s.sport === workspace)) notFound();
  setRequestLocale(locale);
  return <Club360 club={club} />;
}
