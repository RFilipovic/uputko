import { defineConfig, devices } from "@playwright/test";

/** E2E: golden path + emergency path (CLAUDE.md §2.6). Uses the real model (cents per run). */
export default defineConfig({
  testDir: "./e2e",
  timeout: 240_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  outputDir: "./test-results",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "hr-HR",
    timezoneId: "Europe/Zagreb",
    trace: "retain-on-failure",
    // E2E_SLOWMO=400 slows every action down so people can watch a headed run.
    launchOptions: { slowMo: Number(process.env.E2E_SLOWMO ?? 0) },
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "pnpm dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 120_000 },
});
