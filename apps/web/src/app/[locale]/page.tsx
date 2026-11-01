import { WORKSPACES } from '@oromia/contracts';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/routing';

const PILLARS = ['governance', 'operations', 'development', 'facilities', 'intelligence'] as const;

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold">{t('home.title')}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{t('home.intro')}</p>
        <Link href="/login" className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-primary-foreground">
          {t('shell.signIn')}
        </Link>
      </section>

      <h2 className="text-lg font-semibold">{t('home.prototypeHeading')}</h2>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {WORKSPACES.map((w) => (
          <Link key={w} href={`/${w}`} className="rounded-lg border border-border p-4 hover:bg-muted">
            {t(`workspaces.${w}`)}
          </Link>
        ))}
      </section>

      <section>
        <h2 className="text-lg font-semibold">{t('home.pillarsHeading')}</h2>
        <ol className="mt-2 grid gap-2 sm:grid-cols-5">
          {PILLARS.map((p) => (
            <li key={p} className="rounded-lg bg-muted p-3 text-sm">
              {t(`pillars.${p}`)}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
