import { Workspace } from '@oromia/contracts';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

type Props = { params: Promise<{ locale: string; workspace: string }> };

/** Workspace home. Real dashboards arrive in M3-T06 (Bureau/federation views) and M5-T05. */
export default async function WorkspaceHome({ params }: Props) {
  const { locale, workspace } = await params;
  const parsed = Workspace.safeParse(workspace);
  if (!parsed.success) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t(`workspaces.${parsed.data}`)}</h1>
      {/* Rule 5: no figures until verified data exists — show "no report received", never 0. */}
      <p className="rounded-lg border border-dashed border-border p-6 text-muted-foreground">{t('home.noData')}</p>
    </div>
  );
}
