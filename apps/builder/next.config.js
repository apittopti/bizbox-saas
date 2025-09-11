/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  
  experimental: {
    appDir: true,
    optimizeCss: true,
  },
  
  images: {
    domains: ['bizbox.co.uk', 'images.unsplash.com', 'via.placeholder.com', 'picsum.photos'],
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