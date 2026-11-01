import { setRequestLocale } from 'next-intl/server';
import { CommandCentre } from '@/components/proto/command-centre';
import { FederationHome } from '@/components/proto/federation-home';
import type { Sport } from '@/demo/data';

type Props = { params: Promise<{ locale: string; workspace: string }> };

/** Bureau → regional command centre; federation → its scoped home. Data is FICTIONAL (M0-T06). */
export default async function WorkspaceHome({ params }: Props) {
  const { locale, workspace } = await params;
  setRequestLocale(locale);
  return workspace === 'bureau' ? <CommandCentre /> : <FederationHome sport={workspace as Sport} />;
}
