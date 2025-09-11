/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  
  experimental: {
    appDir: true,
    optimizeCss: true,
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
  
  images: {
    domains: ['localhost', 'bizbox.app', 'images.unsplash.com', 'via.placeholder.com'],
    formats: ['image/webp', 'image/avif'],
  },
  
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Optimize for production builds
  swcMinify: true,
  
  // Enable build optimizations
  poweredByHeader: false,
  generateEtags: false,
  
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;