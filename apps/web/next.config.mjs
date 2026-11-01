import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// STATIC_EXPORT=1 builds the fictional-data prototype as static files (no API).
// Otherwise the web app runs as a server and proxies /api/v1/* to the API service, so the
// session cookie stays same-origin. API_HOSTPORT comes from Render's private network ("host:port").
const isExport = process.env.STATIC_EXPORT === '1';
const apiOrigin = process.env.API_INTERNAL_URL ?? (process.env.API_HOSTPORT ? `http://${process.env.API_HOSTPORT}` : 'http://localhost:4000');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@oromia/ui', '@oromia/contracts', '@oromia/ethiopian-calendar'],
  ...(isExport
    ? { output: 'export', trailingSlash: true }
    : {
        async rewrites() {
          return [{ source: '/api/v1/:path*', destination: `${apiOrigin}/api/v1/:path*` }];
        },
        async headers() {
          return [
            {
              source: '/:path*',
              headers: [
                { key: 'X-Frame-Options', value: 'DENY' },
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                { key: 'X-Robots-Tag', value: 'noindex' },
              ],
            },
          ];
        },
      }),
  ...(process.env.NEXT_BASE_PATH ? { basePath: process.env.NEXT_BASE_PATH } : {}),
};

export default withNextIntl(nextConfig);
