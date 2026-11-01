import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

type Locale = (typeof routing.locales)[number];

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = routing.locales.includes(requested as Locale) ? (requested as Locale) : routing.defaultLocale;
  const messages = (await import(`@oromia/i18n/messages/${locale}.json`)).default;
  // Fallback chain om → en (02-architecture §7): fill any gap from English.
  const fallback = locale === 'en' ? {} : (await import('@oromia/i18n/messages/en.json')).default;
  return { locale, messages: deepMerge(fallback, messages), timeZone: 'Africa/Addis_Ababa' };
});

function deepMerge(base: Record<string, unknown>, over: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(over)) {
    const b = out[k];
    out[k] =
      v && typeof v === 'object' && b && typeof b === 'object'
        ? deepMerge(b as Record<string, unknown>, v as Record<string, unknown>)
        : v;
  }
  return out;
}
