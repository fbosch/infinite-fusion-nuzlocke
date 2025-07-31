import type { NextConfig } from 'next';
import withBundleAnalyzer from '@next/bundle-analyzer';

const nextConfig: NextConfig = {
  // Enable Turbopack for faster development builds
  turbopack: {
    // Use default Turbopack configuration
    // Can add custom rules, resolveAlias, resolveExtensions here if needed
    rules: {
      '*.svg': {
        loaders: [
          {
            loader: '@svgr/webpack',
            options: {
              icon: true,
            },
          },
        ],
        as: '*.js',
      },
    },
  },

  // Note: Webpack config removed to avoid conflicts with Turbopack
  // Turbopack handles all optimization automatically and much better than custom webpack configs
  // The previous webpack optimizations included:
  // - Global object fix for window chunks issue (not needed with Turbopack)
  // - Custom chunk splitting (Turbopack handles this automatically and more efficiently)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
        pathname: '/PokeAPI/sprites/**',
      },
      {
        protocol: 'https',
        hostname: 'ifd-spaces.sfo2.cdn.digitaloceanspaces.com',
        pathname: '/custom/**',
      },
      {
        protocol: 'https',
        hostname: 'ifd-spaces.sfo2.cdn.digitaloceanspaces.com',
        pathname: '/generated/**',
      },
    ],
  },
};

export default withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })(
  nextConfig
);
