# NG Law Digest — Cross-Browser Compatibility & Reliability Audit

Target: https://nglawdigestblog.com/ · Repository: `C:\Users\MARVEL\Desktop\laww` (branch `main`, uncommitted)
Build under test: local **production** build (`next build` + `next start`) on `http://localhost:3100`
Date of test run: 2026-10-04

---

## 1. Root cause of each confirmed issue

### RC-1 — Scroll-reveal animations strand the page invisible when the client bundle never boots (primary Firefox suspect)
**Confirmed by reproduction.** `Reveal`, `ImageReveal`, `StaggerReveal` and `CoverHeroMotion` server-render their
wrapped content at **`opacity: 0`** as an inline style and rely on a client-side `IntersectionObserver`
callback to fade it in. That hidden state is baked into the server HTML, so the entire first paint depends on
the JS bundle booting.

Reproduced deterministically by blocking `/_next/static/**` (the exact effect of Firefox Enhanced Tracking
Protection, a privacy extension, a stale hashed chunk after a deploy, or a hydration exception):

| Page | Before fix |
|---|---|
| `/` | **4 of 17 in-view reveal blocks never became visible, and the `<h1>` stayed invisible** |
| `/articles/the-headline` | article body / cover content stayed at `opacity: 0` |

This is the single most plausible explanation for "the site does not display correctly in Firefox": Firefox ETP
blocks third-party subresources by default, and there was no CSS or JS safety net for the case where the bundle
(or a chunk) does not arrive. There was no `@media (scripting: none)` rule, no watchdog, and no fallback for a
missing `IntersectionObserver`.

### RC-2 — No declared browser-support range
`package.json` had **no `browserslist`** field, so nothing pinned the build/transpile target and no engine could be
held to a contract. (Fix declares Chrome/Edge ≥ 111, Firefox ≥ 128, Safari/iOS ≥ 16.4.)

### RC-3 — Unbounded Supabase reads behind `<Suspense>` could spin forever
Supabase's `fetch` has no timeout. `BreakingLegalUpdates` (and other read paths) sit directly behind Suspense
skeletons in the root layout, so a stalled connection left the skeleton **pending indefinitely** — no success, no
error, no retry.

### RC-4 — Remote artwork could vanish or collapse the layout
Editorial and advert artwork is served from Supabase Storage — the one asset class a privacy setting, extension,
offline moment or storage outage can remove. A measured case: the advert slot on `/events` rendered
**1104 × 0** before decode, i.e. a hole in the layout. A bare `<img>` also shows only a broken-image glyph on
failure, and a request that fails *before* React attaches `onError` was silently lost (reproduced in Chromium and
WebKit).

### RC-5 — No-JavaScript state was an infinite animated spinner
React's streamed Suspense content is swapped in by inline scripts. With scripting disabled those never run, so the
page sat on its `animate-pulse` skeleton **forever**, with no explanation.

### RC-6 — Diagnostics could not tell a third-party image hiccup from an app failure
Transient Supabase Storage sub-resource failures were being counted as page-level errors in the test harness,
masking real signal.

---

## 2. Files changed and why

**New files**

| File | Why |
|---|---|
| [playwright.config.ts](playwright.config.ts) | Chromium + Firefox + WebKit projects at desktop/tablet/mobile, with traces, screenshots and JSON results so failures carry diagnostics. |
| [e2e/fixtures.ts](e2e/fixtures.ts) | Shared helpers: reveal-normalisation, hidden-content detection, fault recorder (console/page errors/failed requests, with image sub-resource failures classified separately per RC-6). |
| [e2e/journeys.spec.ts](e2e/journeys.spec.ts) | Critical public journeys across every route. |
| [e2e/responsive.spec.ts](e2e/responsive.spec.ts) | Desktop/tablet/mobile: no horizontal overflow, readable measure, nav reachable, images not collapsed, content order. |
| [e2e/article-layout.spec.ts](e2e/article-layout.spec.ts) | Float/flow vs grid fallback, uncropped images, author-before-body order, mobile de-float. |
| [e2e/resilience.spec.ts](e2e/resilience.spec.ts) | Loaders always settle; advert failure does not collapse the page; security headers, canonical host, no mixed content. |
| [e2e/failure-modes.spec.ts](e2e/failure-modes.spec.ts) | Pins RC-1/RC-5: bundle blocked (with and without CSS), and JS disabled. |
| [e2e/admin.spec.ts](e2e/admin.spec.ts) | Unauthenticated guard + login usability across engines; authenticated flows gated on credentials. |
| [src/components/motion/reveal-support.ts](src/components/motion/reveal-support.ts) | `useCanAnimateReveal` via `useSyncExternalStore` — content is only rendered in its hidden state when reveal can actually run (no `IntersectionObserver` ⇒ visible). Adds `data-reveal` / `data-reveal-static` hooks. |
| [src/components/layout/boot-flag.tsx](src/components/layout/boot-flag.tsx) | Success half of the reveal watchdog; clears the timer once React mounts. One-directional, so content never re-hides. |
| [src/components/ui/safe-image.tsx](src/components/ui/safe-image.tsx) | Plain `<img>` that keeps the natural uncropped ratio, adds bounded retry and a real error/placeholder state, and catches the "settled before `onError` attached" race. |
| [src/lib/supabase/fetch-timeout.ts](src/lib/supabase/fetch-timeout.ts) | `withTimeout` (safe on prerendered pages) and `fetchWithTimeout` (admin-only, dynamic clients). |

**Modified files**

| File | Why |
|---|---|
| [package.json](package.json) | Adds `browserslist` (RC-2), `@playwright/test`, `test:e2e`. |
| [src/app/layout.tsx](src/app/layout.tsx) | Inline synchronous watchdog script (arms a 2.5 s timer → `html.no-hydration`, and normalises leftover inline styles so it works even if the stylesheet failed too); mounts `<BootFlag />`; adds the no-JS notice. |
| [src/app/globals.css](src/app/globals.css) | Safety net: `@media (scripting: none)` + `html.no-hydration` + `html.no-intersection-observer` rules reveal `[data-reveal]` and its children; stops the no-JS skeleton pulse and shows the notice; adds `.media-fallback` so a blocked third-party image cannot collapse to zero height. |
| [src/components/motion/reveal.tsx](src/components/motion/reveal.tsx), [image-reveal.tsx](src/components/motion/image-reveal.tsx), [stagger-reveal.tsx](src/components/motion/stagger-reveal.tsx), [template.tsx](src/app/template.tsx) | Use `useCanAnimateReveal` and tag `data-reveal`; render visible (not `opacity: 0`) whenever animation cannot run. |
| [src/components/home/cover-hero-motion.tsx](src/components/home/cover-hero-motion.tsx) | The cover hero's `motion.*` elements carried `opacity: 0` with no `data-reveal`, so the watchdog could not rescue the `h1`; now tagged. |
| [src/components/home/breaking-legal-updates.tsx](src/components/home/breaking-legal-updates.tsx) | `withTimeout` so the ticker's skeleton always settles (RC-3). |
| [src/lib/supabase/server-client.ts](src/lib/supabase/server-client.ts) | `fetchWithTimeout` on the cookie-aware **admin** client only — verified that installing it on the public/cached client silently empties statically prerendered pages at build time. |
| [src/components/editorial/editorial-figure.tsx](src/components/editorial/editorial-figure.tsx), [positioned-images-grid.tsx](src/components/ui/positioned-images-grid.tsx), [ad-placement.tsx](src/components/home/ad-placement.tsx) | Remote artwork now rendered through `SafeImage` (RC-4); test ids for layout assertions. |
| [src/app/articles/[slug]/page.tsx](src/app/articles/[slug]/page.tsx) | `data-testid="article-author"` for content-order assertions. |
| [reports/acceptance-public.sh](reports/acceptance-public.sh) | Made E1/E2 data-driven from the CMS instead of a hardcoded slug, so the suite survives content changes. |
| [.gitignore](.gitignore) | Ignore `/test-results/`, `/playwright-report/`, `reports/playwright-html/`. |

No database schema change. No rewrite. No paid service. No browser security or privacy protection disabled.

---

## 3. Tests executed and actual results

Command: `E2E_BASE_URL=http://localhost:3100 npx playwright test <spec> --workers=2`

| Spec | Chromium | Firefox | WebKit | Result |
|---|---|---|---|---|
| journeys (20 journeys/engine) | 20/20 | 20/20 | 20/20 | **60 passed** |
| resilience | 6/6 | 6/6 | 6/6 | **18 passed** |
| responsive (15 viewport tests/engine) | 15/15 | 15/15 | 15/15 | **45 passed** |
| article-layout + failure-modes + admin | — | — | — | **39 passed, 9 skipped** |
| **Total** | | | | **162 passed · 0 failed · 9 skipped** |

**Other verification**
- `npx tsc --noEmit` → **exit 0** (clean).
- `npx next build` → **exit 0**; static pages still prerendered.
- `npm run lint` → 22 problems (10 errors, 12 warnings) — **all pre-existing and none in files this audit touched** (rich-text `Math.random`, cookie-consent / issues-archive set-state-in-effect, unused `_` vars in admin slices).
- `reports/acceptance-public.sh` → **16/16**.
- `reports/page-targeting.test.ts` → **10/10**.

**Skips (all honest and data-conditional, none hiding a failure)**
- `admin.spec.ts` authenticated CMF journeys — no `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` available.
- `article-layout.spec.ts` float assertions — the only published article currently has no body text, so it renders the grid fallback; the grid assertion skips in the inverse case. Both branches are covered, whichever mode the data produces.

**Note on an earlier apparent failure:** two Firefox `journeys` tests failed with browser *teardown* protocol errors (`_maybeDontRestoreTabs` undefined). Re-running with `--workers=2` (Playwright caps workers **globally**, so three fully-parallel engine projects were starving one machine) gave a clean **20/20**. That was harness resource contention, not an app defect.

---

## 4. Browsers and viewports actually tested

**Engines — real engines, actually executed (Playwright 1.63.0):**
- **Chromium 153.0.8010.12** (covers Chrome and Edge, both Blink)
- **Firefox 155.0** (Gecko — the engine in the client's report)
- **WebKit 26.6** (the Safari engine)

**Viewports:** desktop (Desktop Chrome/Firefox/Safari device profiles), **tablet 820 × 1180**, **mobile 390 × 844** — each checked for horizontal overflow, readable measure, reachable navigation, non-collapsed images and content order.

**Not tested:** a real installed Firefox profile with the client's own extensions/ETP settings, a real macOS/iOS Safari process, and Microsoft Edge as a separate binary. Edge is Blink, so Chromium coverage applies; the Firefox-specific mechanism was instead reproduced deterministically by blocking the bundle.

---

## 5. Unresolved failures / tests that could not be run

1. **The production site was not tested in its fixed state** — the layout and reliability changes are **not deployed**. The client's screenshots show the *old* layout live, so `nglawdigestblog.com` still fails exactly as reported until this build ships.
2. **The client's own Firefox was not reproduced directly.** The failure *mechanism* (bundle never boots ⇒ blank page) was reproduced and fixed; their specific profile/extension combination was not observed.
3. **Authenticated CMS journeys (create / edit / autosave / publish) were never executed** — no admin credentials. Only the unauthenticated guard and login-page rendering were verified across all three engines.
4. **Real Safari, real iOS Safari and Edge-as-a-separate-binary were not run.**
5. Pre-existing lint errors (10) remain, out of scope for this audit.

---

## 6. Recommended production verification steps

1. **Deploy this build to a preview URL and run the suite against it:**
   `E2E_BASE_URL=https://<preview-host> npx playwright test --workers=2`
   The `resilience` spec then checks real transport — HTTPS, certificate, redirects, canonical host, security headers, mixed content.
2. **Confirm the layout actually shipped** — with the client's screenshots as the baseline, verify the author card sits above the article body and there is no empty right-hand column.
3. **Verify the watchdog in the real world:** load the site in Firefox with DevTools → Network set to *Block* `_next/static`, reload, and confirm content still becomes visible within ~2.5 s. That is the deterministic proof the Firefox symptom is gone.
4. **Set `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`** in a safe CI secret and re-run `e2e/admin.spec.ts` so the authenticated publishing/autosave journeys execute.
5. **Run against real Edge and real Safari** (this environment could only run the WebKit engine) before claiming universal compatibility.
6. Optionally wire `npm run test:e2e --workers=2` into CI so this coverage becomes a permanent regression gate.

> Compatibility is claimed **only** for the engines and viewports listed in section 4, with the gaps in section 5 stated explicitly.
