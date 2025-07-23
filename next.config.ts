import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
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

export default nextConfig;
