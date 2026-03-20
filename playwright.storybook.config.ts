import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'storybook.spec.ts',
  outputDir: './e2e-results-storybook',
  use: {
    baseURL: 'http://localhost:6006',
    video: 'on',
    screenshot: 'on',
    trace: 'on',
  },
  webServer: {
    command: 'npx http-server storybook-static -p 6006 -s',
    url: 'http://localhost:6006',
    reuseExistingServer: !process.env.CI,
    timeout: 15000,
  },
  reporter: [
    ['html', { open: 'never', outputFolder: 'e2e-report-storybook' }],
    ['list'],
    ['json', { outputFile: 'e2e-results-storybook/results.json' }],
  ],
});
