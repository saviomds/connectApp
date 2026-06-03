import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Tell bundler to only compile what's actually imported from these large packages
    // (lucide-react has 1000+ icons; framer-motion is huge — without this hint
    //  Turbopack walks the entire package, which kills compile time + RAM)
    optimizePackageImports: ['framer-motion', 'lucide-react'],
  },
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
