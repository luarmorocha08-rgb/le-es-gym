import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3200);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;
// E2E_AI_MOCK=1: sobe um servidor que imita a API da Anthropic e aponta o app para ele
const aiMock = Boolean(process.env.E2E_AI_MOCK);
const mockPort = Number(process.env.MOCK_ANTHROPIC_PORT ?? 3299);

const appServer = {
  command: `npm run build && npm run start -- -p ${port}`,
  url: baseURL,
  reuseExistingServer: !process.env.CI,
  timeout: 240_000,
  env: aiMock ? { ANTHROPIC_API_KEY: "e2e-mock", ANTHROPIC_BASE_URL: `http://127.0.0.1:${mockPort}` } : undefined,
};
const mockServer = {
  command: "node e2e/mock-anthropic.mjs",
  url: `http://127.0.0.1:${mockPort}`,
  reuseExistingServer: !process.env.CI,
};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // fluxo de conta roda só no desktop (cria usuários reais no banco de teste)
    { name: "mobile", use: { ...devices["Pixel 7"] }, testIgnore: /account-flow|student-portal|trainer-portal|ai-/ },
  ],
  webServer: process.env.E2E_BASE_URL
    ? aiMock
      ? [mockServer]
      : undefined
    : aiMock
      ? [mockServer, appServer]
      : appServer,
});
