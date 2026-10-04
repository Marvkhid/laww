import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Playwright's HTML report bundles a copy of the trace viewer (CodeMirror,
    // a service worker, source maps). It is gitignored but ESLint does not read
    // .gitignore, so a single run added ~3000 findings from generated vendor
    // code and buried the real ones.
    "reports/playwright-html/**",
  ]),
]);

export default eslintConfig;
