import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3130',
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    ...(process.env.REAL_API
      ? []
      : [
          {
            command: 'node e2e/fixture-server.mjs',
            url: 'http://127.0.0.1:3137/v1/health/live',
          },
        ]),
    {
      command:
        'npm run build && npm run start -- --hostname 127.0.0.1 --port 3130',
      url: 'http://127.0.0.1:3130/api/auth/csrf',
      env: {
        API_BASE_URL: 'http://127.0.0.1:3137',
        APP_ORIGIN: 'http://127.0.0.1:3130',
        NEXT_BUILD_DIR: '.next-auth',
      },
      timeout: 120000,
    },
  ],
});
