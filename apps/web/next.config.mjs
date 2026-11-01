import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@oromia/ui', '@oromia/contracts', '@oromia/ethiopian-calendar'],
};

export default withNextIntl(nextConfig);
