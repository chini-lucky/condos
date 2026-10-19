import { defineConfig } from "@playwright/test";
const port = process.env.CONDOS_E2E_PORT ?? "5283";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${port}/condos/`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}/condos/`,
    reuseExistingServer: false,
  },
});
