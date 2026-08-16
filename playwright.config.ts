import { defineConfig } from "@playwright/test";
import { config } from "dotenv";

config();

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
    },
  },
  use: {
    baseURL: "http://localhost:3000",
  },
});
