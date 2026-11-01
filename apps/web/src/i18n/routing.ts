import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';
import { DEFAULT_LOCALE, LOCALES } from '@oromia/i18n';

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE, // Afaan Oromo first
  localePrefix: 'always',
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
