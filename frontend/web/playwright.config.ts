import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración Playwright para E2E del web companion BarGAIN.
 * Flujos UI: auth, business portal (requieren servidor Vite corriendo).
 * Flujos API: optimizer, OCR (solo necesitan el backend, no el frontend Vite).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Tests comparten BD — ejecutar secuencialmente
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Levantar el servidor de desarrollo Vite antes de los tests UI
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
