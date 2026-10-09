import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  turbopack: { root: path.resolve(process.cwd()) },
  poweredByHeader: false,
  agentRules: false,
};

export default nextConfig;
