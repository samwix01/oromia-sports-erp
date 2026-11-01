import { WORKSPACES, Workspace } from '@oromia/contracts';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { WorkspaceNav } from '@/components/proto/workspace-nav';

export const dynamicParams = false;
export function generateStaticParams() {
  return WORKSPACES.map((workspace) => ({ workspace }));
}

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string; workspace: string }>;
}) {
  const { locale, workspace } = await params;
  const parsed = Workspace.safeParse(workspace);
  if (!parsed.success) notFound();
  setRequestLocale(locale);
  return (
    <>
      <WorkspaceNav workspace={parsed.data} />
      {children}
    </>
  );
}
