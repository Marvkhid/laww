import { defineConfig, devices } from "@playwright/test";

/**
 * Cross-browser regression suite.
 *
 * Runs every spec in Chromium, Firefox and WebKit. The target is the declared
 * `browserslist` range in package.json (Chrome/Edge 111+, Firefox 128+,
 * Safari 16.4+), so a failure here is a real supported-browser defect rather
 * than an exotic-engine curiosity.
 *
 * Point it at production with:
 *   E2E_BASE_URL=https://www.nglawdigestblog.com npx playwright test
 * and at a local build with:
 *   E2E_BASE_URL=http://localhost:3000 npx playwright test
 */
const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";
const isProd = baseURL.startsWith("https://");

/**
 * Specs that run in Node once, not once per browser engine: engine-independent
 * work (direct-to-Storage upload logic), pure policy modules with no DOM
 * (article slug allocation) and static guard rails that read the source tree
 * (request-body limits).
 */
const NODE_ONLY_SPECS =
  /admin-upload\.spec\.ts|body-limits\.spec\.ts|slug-allocation\.spec\.ts|admin-boundary\.spec\.ts|platform-wall\.spec\.ts/;

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ["list"],
    ["html", { outputFolder: "reports/playwright-html", open: "never" }],
    ["json", { outputFile: "reports/playwright-results.json" }],
  ],
  // Generous: a cold Turbopack compile on a first hit is not a defect.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    // Never let a spec pass because it never actually looked at the page.
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: NODE_ONLY_SPECS,
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
      testIgnore: NODE_ONLY_SPECS,
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      testIgnore: NODE_ONLY_SPECS,
    },
    // Engine-independent specs: they exercise admin modules directly in Node
    // against a local fake storage endpoint, so running them once per browser
    // would only repeat identical work.
    { name: "node", testMatch: NODE_ONLY_SPECS },
  ],
  // Only spin up a server when nobody is already serving the app.
  ...(process.env.E2E_BASE_URL
    ? {}
    : {
        webServer: {
          command: "npm run start",
          url: baseURL,
          reuseExistingServer: true,
          timeout: 180_000,
        },
      }),
  metadata: { isProd },
});
