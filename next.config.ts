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
              svgoConfig: {
                plugins: [
                  {
                    name: 'preset-default',
                    params: {
                      overrides: {
                        removeViewBox: false,
                      },
                    },
                  },
                ],
              },
            },
          },
        ],
        as: '*.js',
      },
    },
  },

  // Webpack configuration for production builds (Turbopack only works in dev)
  webpack(config, { isServer }) {
    // Handle SVG files with SVGR for production builds
    config.module.rules.push({
      test: /\.svg$/,
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            icon: true,
            svgoConfig: {
              plugins: [
                {
                  name: 'preset-default',
                  params: {
                    overrides: {
                      removeViewBox: false,
                    },
                  },
                },
              ],
            },
          },
        },
      ],
    });

    return config;
  },
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
