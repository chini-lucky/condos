import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:5283/condos/", trace: "retain-on-failure" },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 5283 --strictPort",
    url: "http://127.0.0.1:5283/condos/",
    reuseExistingServer: !process.env.CI,
  },
});
