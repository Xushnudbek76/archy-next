import js from '@eslint/js';
import nextVitals from 'eslint-config-next/core-web-vitals';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      '**/.next/**',
      '**/coverage/**',
      '**/next-env.d.ts',
      '**/.next-*/**',
      '**/.superpowers/**',
      '**/test-results/**',
      '**/playwright-report/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...nextVitals.map((config) => ({ ...config, files: ['**/*.{ts,tsx}'] })),
  { settings: { next: { rootDir: '.' } } },
];
