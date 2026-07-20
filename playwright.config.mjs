import { defineConfig } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env.local"), quiet: true });

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  reporter: [["list"]],
  outputDir: "C:/tmp/exchange-lens-playwright-results",
  use: {
    baseURL: "http://localhost:3005",
    browserName: "chromium",
    channel: "chrome",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
  },
  webServer: [
    {
      command: "node node_modules/next/dist/bin/next dev --turbopack --port 3005",
      url: "http://localhost:3005/dashboard",
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});
