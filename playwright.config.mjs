import { defineConfig } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const productionSmoke = process.env.E2E_ENV === "production";
const envFiles = productionSmoke
  ? [".env.test.production.local", ".env.production"]
  : [".env.test.local", ".env.local", ".env.development"];

for (const filename of envFiles) {
  const path = resolve(process.cwd(), filename);
  if (existsSync(path)) {
    loadEnv({ path, quiet: true, override: false });
  }
}

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3005";
const baseHostname = new URL(baseURL).hostname;
const usesLocalServer = ["localhost", "127.0.0.1", "::1"].includes(baseHostname);

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
    baseURL,
    browserName: "chromium",
    channel: "chrome",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
  },
  webServer: usesLocalServer ? [
    {
      command: "node node_modules/next/dist/bin/next dev --turbopack --port 3005",
      url: "http://localhost:3005/api/health",
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ] : undefined,
});
