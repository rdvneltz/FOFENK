// Playwright configuration
module.exports = {
  testDir: './tests',
  timeout: 120000,
  expect: {
    timeout: 10000
  },
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: true, // Headless modda çalıştır
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          slowMo: 300, // Her işlem arasında 300ms bekle
        }
      },
    },
  ],
  webServer: {
    command: 'cd client && npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
};
