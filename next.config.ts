import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  turbopack: { root: path.resolve(process.cwd()) },
  distDir: process.env.NEXT_BUILD_DIR ?? '.next',
  poweredByHeader: false,
  agentRules: false,
  async headers() {
    return [
      '/login',
      '/signup',
      '/forgot-password',
      '/confirm-email',
      '/reset-password',
      '/api/:path*',
    ].map((source) => ({
      source,
      headers: [
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'Cache-Control', value: 'private, no-store' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
      ],
    }));
  },
};

export default nextConfig;
