import { defineConfig } from "@playwright/test";
import { config } from "dotenv";

config();

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL must be set to run the Playwright suite — see docs/superpowers/specs/0002-authentication-design.md",
  );
}

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: testDatabaseUrl,
    },
  },
  use: {
    baseURL: "http://localhost:3000",
  },
});
