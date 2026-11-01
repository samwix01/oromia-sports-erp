import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { WorkspaceNav } from '@/components/proto/workspace-nav';
import { SPORTS, type Sport } from '@/demo/data';

// Federation workspaces. The Bureau workspace has its own static route (../bureau).
export const dynamicParams = false;
export function generateStaticParams() {
  return SPORTS.map((workspace) => ({ workspace }));
}

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string; workspace: string }>;
}) {
  const { locale, workspace } = await params;
  if (!SPORTS.includes(workspace as Sport)) notFound();
  setRequestLocale(locale);
  return (
    <>
      <WorkspaceNav workspace={workspace as Sport} />
      {children}
    </>
  );
}
