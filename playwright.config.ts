import { defineConfig } from "@playwright/test";

// Web E2E on the static web export (dist/). CI builds the export, then runs these tests against the
// live project with the E2E account. docs/testing.md has the steps.
const PORT = 8090;

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    storageState: "e2e/.auth/session.json",
    viewport: { width: 412, height: 915 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: `node e2e/serve.mjs dist ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
});
