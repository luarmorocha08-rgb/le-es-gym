import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3200);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;
// E2E_AI_MOCK=1: sobe um servidor que imita a API da Anthropic e aponta o app para ele
const aiMock = Boolean(process.env.E2E_AI_MOCK);
const mockPort = Number(process.env.MOCK_ANTHROPIC_PORT ?? 3299);
// E2E_BLOB_MOCK=1: imita o armazenamento de arquivos (Vercel Blob)
const blobMock = Boolean(process.env.E2E_BLOB_MOCK);
const blobPort = Number(process.env.MOCK_BLOB_PORT ?? 3298);

const appServer = {
  command: `npm run build && npm run start -- -p ${port}`,
  url: baseURL,
  reuseExistingServer: !process.env.CI,
  timeout: 240_000,
  env: {
    // a suíte cria dezenas de contas do mesmo IP; limites por e-mail seguem valendo
    RATE_LIMIT_IP_MULTIPLIER: "50",
    ...(aiMock ? { ANTHROPIC_API_KEY: "e2e-mock", ANTHROPIC_BASE_URL: `http://127.0.0.1:${mockPort}` } : {}),
    ...(blobMock
      ? {
          BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_e2estore_somenteparatestese2e",
          VERCEL_BLOB_API_URL: `http://localhost:${blobPort}`,
          NEXT_PUBLIC_VERCEL_BLOB_API_URL: `http://localhost:${blobPort}`,
        }
      : {}),
  },
};
const mockServer = {
  command: "node e2e/mock-anthropic.mjs",
  url: `http://127.0.0.1:${mockPort}`,
  reuseExistingServer: !process.env.CI,
};
const blobServer = {
  command: "node e2e/mock-blob.mjs",
  url: `http://127.0.0.1:${blobPort}/__requests`,
  reuseExistingServer: !process.env.CI,
};
const servers = [...(aiMock ? [mockServer] : []), ...(blobMock ? [blobServer] : [])];

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
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /admin-panel|media-upload/ },
    // fluxo de conta roda só no desktop (cria usuários reais no banco de teste)
    { name: "mobile", use: { ...devices["Pixel 7"] }, testIgnore: /account-flow|student-portal|trainer-portal|ai-|admin-panel|media-upload|a11y|offline-workout|pwa-seo|security/ },
    // altera o site público (horários, aviso e mídias): roda depois dos demais
    { name: "admin", use: { ...devices["Desktop Chrome"] }, testMatch: /admin-panel|media-upload/, dependencies: ["desktop", "mobile"] },
  ],
  webServer: process.env.E2E_BASE_URL ? servers : [...servers, appServer],
});
