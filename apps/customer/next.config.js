/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
    serverComponentsExternalPackages: [],
  },
  
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    domains: [
      'localhost',
      'bizbox.com',
      'bizboxapp.com',
      // Add tenant domains dynamically
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    minimumCacheTTL: 60,
    unoptimized: false,
  },
  
  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)'
          }
        ]
      },
      // Static assets caching
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      // API routes caching
      {
        source: '/api/((?!auth|webhook).)*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=300'
          }
        ]
      }
    ];
  },
  
  // Rewrites for tenant routing
  async rewrites() {
    return {
      beforeFiles: [
        // API routes should not be rewritten
        {
          source: '/api/:path*',
          destination: '/api/:path*',
        },
        // Static files should not be rewritten
        {
          source: '/_next/:path*',
          destination: '/_next/:path*',
        },
        {
          source: '/favicon.ico',
          destination: '/favicon.ico',
        },
        {
          source: '/robots.txt',
          destination: '/robots.txt',
        },
        {
          source: '/sitemap.xml',
          destination: '/sitemap.xml',
        },
      ],
      afterFiles: [
        // Rewrite tenant domains to catch-all route
        {
          source: '/:path*',
          destination: '/:path*',
          has: [
            {
              type: 'host',
              value: '(?<tenant>.*)\\.bizbox\\.(com|co\\.uk|app)',
            },
          ],
        },
      ],
    };
  },
  
  // Redirects for SEO
  async redirects() {
    return [
      // Redirect www to non-www for tenant subdomains
      {
        source: '/:path*',
        destination: 'https://:tenant.bizbox.com/:path*',
        permanent: true,
        has: [
          {
            type: 'host',
            value: 'www\\.(?<tenant>.*)\\.bizbox\\.com',
          },
        ],
      },
    ];
  },
  
  // Webpack configuration for performance
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Bundle analyzer in development
    if (!dev && !isServer) {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      if (process.env.ANALYZE === 'true') {
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            reportFilename: './bundle-analyzer-report.html',
            openAnalyzer: false,
          })
        );
      }
    }
    
    // Optimize production builds
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
            // UI components chunk
            ui: {
              name: 'ui',
              test: /[\\/]components[\\/]/,
              chunks: 'all',
              priority: 30,
            },
          },
        },
      };
    }
    
    // Tree shaking for unused exports
    config.optimization.usedExports = true;
    config.optimization.sideEffects = false;
    
    return config;
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Output configuration
  output: 'standalone',
  
  // Disable source maps in production for security
  productionBrowserSourceMaps: false,
  
  // Enable SWC minification
  swcMinify: true,
  
  // Compiler options
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Custom server configuration
  serverRuntimeConfig: {
    // Will only be available on the server side
    mySecret: 'secret',
    secondSecret: process.env.SECOND_SECRET,
  },
  
  publicRuntimeConfig: {
    // Will be available on both server and client
    staticFolder: '/static',
  },
  
  // Experimental features for performance
  experimental: {
    // Enable modern JavaScript features
    esmExternals: 'loose',
    
    // Server components
    serverComponentsExternalPackages: [
      '@prisma/client',
      'bcryptjs',
    ],
    
    // Edge runtime for API routes
    runtime: 'nodejs',
    
    // Optimize fonts
    optimizeFonts: true,
    
    // Optimize CSS
    optimizeCss: true,
    
    // Enable ISR
    isrMemoryCacheSize: 0, // Disable in-memory cache for ISR in favor of external cache
    
    // Large page data
    largePageDataBytes: 128 * 100, // 12.8KB
    
    // Bundle pages externally for edge runtime
    externalDir: true,
  },
  
  // Custom page extensions
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'],
  
  // Disable X-Powered-By header
  poweredByHeader: false,
  
  // Trailing slash configuration
  trailingSlash: false,
  
  // Asset prefix for CDN
  assetPrefix: process.env.NODE_ENV === 'production' ? process.env.CDN_URL : '',
  
  // Base path for subdirectories
  basePath: '',
  
  // Internationalization (if needed)
  i18n: {
    locales: ['en-GB', 'en-US', 'fr', 'de', 'es'],
    defaultLocale: 'en-GB',
    domains: [
      {
        domain: 'bizbox.com',
        defaultLocale: 'en-GB',
      },
      {
        domain: 'bizbox.fr',
        defaultLocale: 'fr',
      },
    ],
  },
  
  // Custom build ID
  generateBuildId: async () => {
    // Use git commit hash or timestamp
    return process.env.VERCEL_GIT_COMMIT_SHA || 
           process.env.BUILD_ID || 
           new Date().toISOString();
  },
  
  // TypeScript configuration
  typescript: {
    // Dangerously allow production builds to successfully complete even if
    // your project has TypeScript errors.
    ignoreBuildErrors: false,
  },
  
  // ESLint configuration  
  eslint: {
    // Dangerously allow production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;