import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { Noto_Sans, Noto_Sans_Ethiopic } from 'next/font/google';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell';
import { CalendarProvider } from '@/components/calendar-context';
import { routing } from '@/i18n/routing';
import '../globals.css';

const latin = Noto_Sans({ subsets: ['latin'], variable: '--font-latin', display: 'swap' });
const ethiopic = Noto_Sans_Ethiopic({ subsets: ['ethiopic'], variable: '--font-ethiopic', display: 'swap' });

type Props = { children: ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Omit<Props, 'children'>) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return { title: t('app.name'), description: t('app.tagline') };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!(routing.locales as readonly string[]).includes(locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${latin.variable} ${ethiopic.variable}`}>
      <body style={{ fontFamily: 'var(--font-latin), var(--font-ethiopic), system-ui, sans-serif' }}>
        <NextIntlClientProvider messages={messages}>
          <CalendarProvider>
            <AppShell>{children}</AppShell>
          </CalendarProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
