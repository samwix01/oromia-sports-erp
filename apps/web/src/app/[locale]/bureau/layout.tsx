import { setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { WorkspaceNav } from '@/components/proto/workspace-nav';

export default async function BureauLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <WorkspaceNav workspace="bureau" />
      {children}
    </>
  );
}
