import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// STATIC_EXPORT=1 builds the fictional-data demo as static files (GitHub Pages).
// NEXT_BASE_PATH is the URL prefix the demo is served under, e.g. /oromia-sports-erp.
const isExport = process.env.STATIC_EXPORT === '1';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@oromia/ui', '@oromia/contracts', '@oromia/ethiopian-calendar'],
  ...(isExport ? { output: 'export', trailingSlash: true } : {}),
  ...(process.env.NEXT_BASE_PATH ? { basePath: process.env.NEXT_BASE_PATH } : {}),
};

export default withNextIntl(nextConfig);
