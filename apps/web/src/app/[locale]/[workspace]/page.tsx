import { setRequestLocale } from 'next-intl/server';
import { FederationHome } from '@/components/proto/federation-home';
import type { Sport } from '@/demo/data';

/** Federation home, scoped to its sport. Data is FICTIONAL (M0-T06). */
export default async function WorkspaceHome({ params }: { params: Promise<{ locale: string; workspace: string }> }) {
  const { locale, workspace } = await params;
  setRequestLocale(locale);
  return <FederationHome sport={workspace as Sport} />;
}
