import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e-results',
  use: {
    baseURL: 'http://localhost:3000',
    video: 'on',
    screenshot: 'on',
    trace: 'on',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  reporter: [
    ['html', { open: 'never', outputFolder: 'e2e-report' }],
    ['list'],
    ['json', { outputFile: 'e2e-results/results.json' }],
  ],
});
