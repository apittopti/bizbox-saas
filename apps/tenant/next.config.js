/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  transpilePackages: [
    '@bizbox/shared-ui',
    '@bizbox/shared-types',
    '@bizbox/shared-utils',
    '@bizbox/shared-hooks',
    '@bizbox/core-auth',
    '@bizbox/core-api',
    '@bizbox/plugin-booking',
    '@bizbox/plugin-ecommerce',
    '@bizbox/plugin-media-manager',
    '@bizbox/plugin-payments',
  ],
}

module.exports = nextConfig