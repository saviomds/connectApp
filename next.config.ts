import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Redirect the dev/build cache out of OneDrive to a local drive.
  // NEXT_DIST_DIR is set in .env.local and is never committed.
  // Falls back to the default ".next" when not set (e.g. in CI).
  distDir: process.env.NEXT_DIST_DIR ?? '.next',

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
        pathname: '/storage/**',
      },
    ],
  },
};

export default nextConfig;
