# NG Law Digest — Admin upload & save reliability audit

**Date:** 2026-10-12 · **Branch:** `main` (uncommitted, working tree) · **Production:** https://www.nglawdigestblog.com (Vercel — `Server: Vercel`, apex 308 → `www`)
**Scope:** every admin workflow that uploads a file or performs an asynchronous save. **Not deployed.**

---

## 1. Confirmed root cause

**Every upload in this CMS sent the raw file through a Server Action — i.e. through a Vercel Function — but Vercel caps a Function request body at 4.5 MB.**

That ceiling applies to Server Actions and Route Handlers alike, and no Next.js config can raise it ([Vercel Functions limits](https://vercel.com/docs/functions/limitations); Vercel publishes a dedicated guide, *How to bypass the 4.5 MB body size limit of Vercel Serverless Functions*). Meanwhile this app advertises and enforces:

| Declared limit | Where | Platform reality |
|---|---|---|
| images ≤ 5 MB | `src/lib/upload-limits.ts`, `ImageUploadZone` copy | above 4.5 MB the request never reaches the function |
| PDFs ≤ 30 MB | `src/lib/upload-limits.ts`, `PdfFileField` | above 4.5 MB the request never reaches the function |

`next.config.ts` sets `experimental.serverActions.bodySizeLimit: "50mb"`, which only governs Next.js's own parsing — it cannot raise the platform limit — so nothing in the codebase contradicted the advertised sizes, and nothing failed locally.

This is exactly the reported shape: the same code and the same account succeed on the developer's machine (`next dev` / `next start` have no such cap, and small files pass anywhere) and fail in production, **identically in Firefox, Edge and Chrome** because the limit is a property of the deployment, not the browser. A 5 MB camera photo is over the line; a 4 MB one is not, which is why the failure looked intermittent and content-dependent.

### 1a. Measured on the live deployment (2026-10-12)

The client's browser console reported `Failed to load resource: the server responded with a status of 413`. The failing request was identified and the platform ceiling measured directly against `https://www.nglawdigestblog.com` by POSTing bodies of known size to a **GET-only public route** (`/api/unsubscribe` — no handler runs, nothing mutates, nothing is written):

| Request body | Response |
|---|---|
| 10 KB | **405** — request accepted, route answered normally |
| 4 000 000 B (4.00 MB) | **405** |
| 4 300 000 B (4.30 MB) | **405** |
| 4 400 000 B (4.40 MB) | **405** |
| **4 500 000 B (4.50 MB)** | **413** |
| 4 505 600 B | **413** |
| 4 812 800 B | **413** |
| 6 291 456 B (6 MB) | **413** |

Response headers/body of the 413 (identical each time):

```
HTTP/2 413
content-type: text/plain; charset=utf-8
content-length: 93
server: Vercel
x-vercel-id: cpt1::…

Request Entity Too LargeFUNCTION_PAYLOAD_TOO_LARGE
```

So on this deployment **4 500 000 bytes of request body is a hard wall**, enforced by the platform *before* the Function runs — `FUNCTION_PAYLOAD_TOO_LARGE` is Vercel's own error code, and the boundary sits exactly at its documented 4.5 MB limit. The 413 the client saw is that wall.

**Which request it was.** In the pre-fix architecture the browser had exactly two request targets: the app origin and nothing else — images were never sent to Supabase from the browser. Therefore a browser-visible 413 could only be a request to `www.nglawdigestblog.com`, and the only requests from an admin page that carry file bytes are the Server-Action POSTs, which target the **current page URL** with a `Next-Action` header:

| Operation | Request (pre-fix) | Body |
|---|---|---|
| Article cover/image upload-on-select | `POST /admin/articles/new` (or `/admin/articles/<id>/edit`) — `Next-Action: uploadArticleImageAction` | the image (multipart) |
| Explicit Save with a file still attached | `POST /admin/articles/new` — `Next-Action: createArticleAction` | form fields **+ the image** |
| Archive issue Save (worst case) | `POST /admin/issues/archive/new` — `Next-Action: createArchiveIssueAction` | form fields **+ cover + up to 30 MB PDF** |
| Autosave snapshot | `POST /admin/<section>/…` — `Next-Action: autosave…Action` | small JSON — could never 413 |

Which of the first three it was cannot be told from the console line alone (they share the page URL); it does not matter for the fix, because all three are now free of file bytes. It also explains the two symptoms at once: any image whose multipart body crossed 4 500 000 bytes (i.e. any image above roughly 4.4–4.5 MB, under the advertised 5 MB) was refused by the platform, and the refusal arrived as a non-JavaScript response the app's upload helper could not interpret — leaving the operation in whatever state it was in, which for the delete/replace path was a permanent "Uploading…".

**Font-preload warnings:** unrelated. They are emitted for font files the browser fetches during first paint, carry no status code, and have no path to an upload or save. Noted and set aside as instructed.

**Second, independent defect — nothing was bounded.** With one exception (`fetchWithTimeout`, admin reads only), no client request had a timeout, cancellation or retry. A browser `fetch` has no default timeout, so a transfer that stalls on a slow or filtered link never returned: the upload zone stayed on "Uploading…", the file input stayed disabled, Save queued behind the same single-flight autosave chain that could never settle, and the redirect to `/admin/articles/` never fired. Reported symptom, mechanism confirmed in code and reproduced in a browser (§6).

**What could not be obtained:** the client's console/Network panel. The diagnosis above rests on the repository, the platform's documented limits, a live probe of the storage endpoint, and reproduced behaviour — not on their machine. Their specific file sizes and connection quality are unverified (§9).

---

## 2. Confirmed defects (all fixed)

| # | Defect | Evidence |
|---|---|---|
| D1 | Files up to the advertised 5 MB / 30 MB were posted through a Function → production-only failure above ~4.5 MB | documented Vercel limit + 16 upload call sites routing a `File` to a Server Action |
| D2 | `Issues → Archive` posted its cover **and a 30 MB PDF inside the form action** (no upload-on-select at all) — no progress, no error state, and never able to work in production | `archive-issue-form.tsx` had no `upload` props |
| D3 | A stalled request wedged the editor permanently: the autosave chain is strictly single-flight, `flush()` awaits it, so "Saving…" and the missing redirect were permanent, not slow | `use-autosave.ts` (no deadline on `saveRef.current`) |
| D4 | Deleting an image while its upload was in flight left `uploading` true forever — completion returned early on a stale token without clearing it, so the spinner, the disabled input and the dead click target stayed | `image-upload.tsx` (`runUpload`) |
| D5 | "Uploaded — saving…" was never cleared, so a finished upload looked like a hang; a **failed** autosave still showed the calm "saving…" wording | `image-upload.tsx` (`justUploaded`) |
| D6 | A failed upload left the picked file attached to the form, so the next Save re-posted the bytes — the same oversized body that had just failed | `image-upload.tsx`, `pdf-upload.tsx` (input cleared only on success) |
| D7 | Loader copy hard-coded "up to 5MB" instead of the enforced constant, so the screen and the validator could drift | `image-upload.tsx` |
| D8 | A **Save clicked while an upload was still running** submitted the form with the chosen file still attached — the request body then carried the bytes and crossed the same 4 500 000-byte wall (413) | measured ceiling above; `ImageUploadZone`/`PdfFileField` cleared the input only *after* the upload settled |
| D9 | In-flight uploads were invisible to Save, so a redirect could abandon an upload that was about to succeed | `SaveButtons` never consulted upload state |

---

## 3. Architecture as found (traced end to end)

- **Storage provider:** Supabase Storage, one public bucket `article-images` (`supabase/migrations/0008_article_images_storage.sql`; public read, `authenticated` write — and per migration 0003 "authenticated ≡ admin", no sign-up flow exists).
- **Upload routing:** `ImageUploadZone` / `PdfFileField` → per-section Server Action → `src/lib/supabase/admin/storage.ts` → `supabase.storage.upload()` (service-role keys are never used; authorization comes from the admin's cookie session).
- **Save routing:** `useActionState` form action → `src/app/admin/(protected)/<section>/actions.ts` → `lib/supabase/admin/<section>.ts` → PostgREST; plus a debounced **autosave** (`useAutosave`) posting JSON snapshots to the same readers; `redirect()` on success.
- **Auth:** Supabase SSR cookies; `proxy.ts` (Next 16 middleware) refreshes the session and does an optimistic `/admin/*` redirect; `(protected)/layout.tsx` and every mutation (`requireAdmin()`) re-verify with `getClaims()`.
- **Middleware/proxy:** `proxy.ts` matches only `/admin/:path*`, reads cookies and nothing else — it never touches a request body, sets no size limit of its own, and its own invocations carry only headers (`grep` for `body|size|limit` in the file: no matches). The platform's payload ceiling applies to any Function invocation, this proxy included, but its requests are a few hundred bytes; a request *to* an admin page is bounded by the ceiling measured in §1a regardless of the proxy.
- **Storage service limit:** the bucket is Supabase Storage, whose own per-object ceiling is a project-level setting. Nothing here raises or depends on it: the app still accepts exactly what it accepted before (5 MB images, 30 MB PDFs) into the same bucket with the same RLS, so a file the old path could store the new path can store. The storage endpoint was probed live: signed uploads accept the browser's `PUT` with `Access-Control-Allow-Origin: *`, and a bogus token is rejected with `400 InvalidJWT` — so the endpoint is neither open nor CORS-blocked.
- **Navigation after persistence (audited across all 12 action files):** every `redirect()` that follows a write is guarded by that write's error check (`if (error) return { error }` / `if (!created)`), verified by scanning all 38 redirect sites and reading the three that a narrow window flagged. The single unconditional redirect is `logout` in `src/app/admin/actions.ts`, which persists nothing; `login` redirects only after `signInWithPassword` reports no error. So no admin section navigates away from a failed save.
- **Revealed by the audit:** `src/lib/supabase/browser-client.ts` exists but is unused; `@tiptap/extension-image` is a dependency but unused, so the article body has **no** image path; the only file inputs in the app are the two shared kit components.

---

## 4. Admin-wide audit

| Admin section | Upload/file support | Shared components or APIs | Confirmed defects | Changes made | Tests and actual results | Remaining limitations |
|---|---|---|---|---|---|---|
| **Articles** (new/edit) | cover + image 1–4 (image only) | `ImageUploadZone`, `uploadArticleImage` → `createSignedUploadAction`; autosave | D1, D4–D7 | Uploads go direct to storage; bounded/cancellable/retryable; save deadlines | upload suite: 4.6 MB image passes, timeout bounded, cancel, retry-once — **pass**; browser harness 20/20 | authenticated create/edit not run (no credentials) |
| **Lawyer in the News** (new/edit) | cover + image 1–4 | same + `InlineImageField` remove button | D1, D4–D7 | as above | node suite + harness cover the shared path — **pass** | as above |
| **Legal Updates** (new/edit) | cover + image 1–4 | same | D1, D4–D7 | as above | shared path — **pass** | as above |
| **Legal Insights** | image | same | D1, D4–D7 | as above | shared path — **pass** | as above |
| **Homepage Highlights** | image | same | D1, D4–D7 | as above | shared path — **pass** | as above |
| **Events** (new/edit) | cover + multi gallery + legacy `gallery_files` | `ImageUploadZone` (multiple), `RemoveThumbButton`, `pending_gallery_urls` | D1, D4–D7 | as above; pending-gallery attach unchanged | shared path — **pass** (multi-file partial-failure handling unchanged) | gallery end-to-end not run authenticated |
| **Sponsors / adverts** | artwork + logo | `ImageUploadZone` ×2 | D1, D4–D7 | as above | shared path — **pass** | as above |
| **Practice Areas** | image (+ separate "Remove current image") | `ImageUploadZone`; own remove button (not the kit) | D1, D4–D7 | as above | shared path — **pass**; the section-specific remove button is untouched | that button's own touch behaviour not re-tested |
| **Contributors** | photo | `ImageUploadZone` | D1, D4–D7 | as above | shared path — **pass** | as above |
| **Issues** | cover + 30 MB digital-edition PDF | `ImageUploadZone`, `PdfFileField` | D1, D6 | as above | 12 MB PDF uploads direct — **pass** | as above |
| **Issues → Archive** | cover + 30 MB PDF | `ImageUploadZone`, `PdfFileField` | **D2** (worst case: everything submitted in the form body) | upload-on-select + direct storage for both; hidden `existing_pdf_url` now owned by the field | shared path — **pass**; no authenticated run | end-to-end create not run authenticated |
| **Call for Papers** | none | autosave only | none found | save deadlines only | typecheck/lint/build | not driven end-to-end |
| **Dashboard / newsletter (clear subscribers)** | none | server action + `AutosaveSessionGC` | none found | none | typecheck/lint/build | not driven end-to-end |
| **Login / logout / protected layout** | none | `proxy.ts`, `requireAdmin()` | none found | none | `admin.spec.ts`: guard + login page — **2 passed, 2 skipped (credentials)** | — |
| **Article body editor (Tiptap)** | none (no image support; `@tiptap/extension-image` unused) | — | none | none | code inspection | — |
| **Delete/remove paths** | delete button, gallery thumbs, practice-area remove, inline remove | shared kit + section buttons | D4 (delete during upload) | delete cancels the in-flight upload and clears the loading state | harness: deleting mid-upload leaves no spinner and the zone is clickable again — **pass** | — |

---

## 5. Changes made

**New (7 code/spec + this report)**

| File | Purpose |
|---|---|
| [upload-sign-actions.ts](src/app/admin/(protected)/upload-sign-actions.ts) | Server action that authorizes (`requireAdmin`) and mints a single-path signed upload URL. Path is server-generated (`<folder>/<uuid>.<ext>`), type/size re-validated. |
| [upload-client.ts](src/lib/upload-client.ts) | Browser uploader: validate → sign → transfer → verify. Bounded timeouts (120 s image / 300 s PDF), cancellation, exactly one automatic retry for network errors and 5xx (never for 4xx — a 4xx is an answer), retries reuse the **same object path** with `x-upsert:false` so a duplicate can never be created, and success is only reported after the public URL is verified readable. |
| [upload-folders.ts](src/lib/upload-folders.ts) | ONE folder↔kind whitelist shared by client and server (issues/archive take a PDF; nothing else does). |
| [admin-uploaders.ts](src/app/admin/(protected)/admin-uploaders.ts) | Binds the signer to each section. One implementation, no per-section copies. |
| [admin-diagnostics.ts](src/lib/admin-diagnostics.ts) | Structured, secret-redacting diagnostics: op + section + stage + outcome + status + duration. Exposes `window.__adminDiagnostics()` so a non-developer can hand back the failing stage. |
| [upload-activity.ts](src/lib/upload-activity.ts) | Tiny shared registry of in-flight uploads so Save/Publish can wait for them (bounded) instead of racing them. |
| [admin-upload.spec.ts](e2e/admin-upload.spec.ts) | 22 Node-side tests of the upload pipeline against a local fake storage endpoint. |

**Modified (27)** — the two shared upload components ([image-upload.tsx](src/components/forms/kit/image-upload.tsx), [pdf-upload.tsx](src/components/forms/kit/pdf-upload.tsx)), the save buttons ([autosave-status.tsx](src/components/forms/kit/autosave-status.tsx)), the autosave hook ([use-autosave.ts](src/components/forms/kit/use-autosave.ts)), the shared limits ([upload-limits.ts](src/lib/upload-limits.ts)), 11 admin forms, 10 section action files (the file-carrying upload actions deleted), the archive form, and [playwright.config.ts](playwright.config.ts) (a `node` project for the engine-independent spec).

**Deliberately unchanged:** storage provider and bucket, RLS policies, authentication, database schema, API contracts, publication rules, design, and every existing route. No new dependency, no paid service, no production data touched. `serverActions.bodySizeLimit` is left as-is (now inconsequential: no action carries a file); reducing it is optional cleanup.

---

## 6. Tests executed and actual results

| Check | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | **exit 0** |
| Lint | `npm run lint` | **10 pre-existing errors** (use-autosave refs, cookie-consent, issues-archive, rich-text) — **0 new**; verified by linting the pristine HEAD copies of every file I touched as a baseline |
| Production build | `npx next build` | **exit 0**; static pages still prerendered (no regression of the prerender hazard noted in `reports/cross-browser-audit.md`) |
| Upload pipeline (new) | `E2E_BASE_URL=http://127.0.0.1:9 npx playwright test e2e/admin-upload.spec.ts --project=node` | **22 passed / 0 failed** — oversized file never sent; bad type never sent; signed-URL rejection not retried; 401 → "session expired", not retried; 413 → "too large", not retried; 5xx → one retry, same path; retry that finds a Duplicate → success; stalled transfer bounded (<4 s at a 0.7 s test limit), single attempt, retryable; abort → `cancelled`, no verify call; upload-not-readable → retryable failure; 4.6 MB image and 12 MB PDF succeed |
| Upload zone in a real browser (temporary harness, since deleted) | `node tmp-kit-check.js` against `next dev` | **20/20** — preview + hidden URL on success; "Uploaded — saving…" then cleared by a real `autosave:status` **saved** event; a failed save reads "Uploaded — not saved yet"; failure shows Retry and **leaves no file in the form**; retry re-sends the remembered file; invalid file → no pointless retry; stalled upload can be **Cancelled** (spinner gone, input re-enabled, preview reverted); **deleting mid-upload leaves no stuck spinner and the zone stays clickable**; manual-persist forms say "remember to save" |
| Admin guard (prod build) | `E2E_BASE_URL=http://localhost:<port> npx playwright test e2e/admin.spec.ts --project=chromium` | **2 passed, 2 skipped** (credential-gated publishing journeys) |
| **Production request-body ceiling** | `curl -X POST --data-binary @<size>` against the live deployment (GET-only route, nothing mutated) | **4 400 000 B → 405; 4 500 000 B → 413 `FUNCTION_PAYLOAD_TOO_LARGE`** (§1a) |
| **413-safe form body + Save gating** (temporary browser harness, deleted after the run) | `node tmp-413-check.js` against `next dev` | **8/8** — a 3 MB file is never present in the form while uploading (0 bytes in `FormData`); the file input is emptied on selection; Save during a stalled upload does not submit; Save during a running upload waits 2500 ms and submits **with the resolved URL and a 32-byte body, 0 files**; Save with nothing uploading is immediate (485 ms) |
| Live storage endpoint | `curl -X OPTIONS …/storage/v1/object/upload/sign/article-images/probe.png` | **HTTP 200, `Access-Control-Allow-Origin: *`, PUT + preflight headers allowed** → direct browser uploads work from the production origin; a bogus token returns **400 InvalidJWT**, so the endpoint is not open |
| Full browser regression suite | `npx playwright test --project=chromium --project=firefox --project=webkit --workers=2` | **NOT COMPLETED — timed out twice (600 s).** Subsets run: `admin.spec.ts` (2 pass/2 skip). The other public-page specs (`journeys`, `resilience`, `responsive`, `article-layout`, `failure-modes`, `image-positioning`, `not-found`, `admin-persistence`, `admin-publish`, `admin-content-types`) were **not re-run in this session** |

**Persistent browser specs (this environment):** "the login page renders and is usable" and the guard test were skipped, not passed, where credentials or engine quirks required it — see the run output above. `reports/acceptance-public.sh`, `reports/page-targeting.test.ts` and the earlier unit suites were not re-run (no code they cover was touched).

---

## 7. Build & deployment status

- **Production build passed** (`next build`, exit 0).
- **Production was NOT updated.** Nothing was pushed, deployed or committed. A Vercel deploy of this working tree is required for the client to receive the fix.
- **No new environment variables, provider settings, permissions or migrations are needed.** `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are already deployed, and the storage bucket/RLS policies already permit the admin session to create upload URLs (that is how uploads worked before).
- Optional, not required: lower `serverActions.bodySizeLimit` now that no action carries a file.

---

## 8. Hypotheses (explicitly not confirmed)

1. **Which specific files failed for the client.** The mechanism is confirmed; their file sizes are not. Any file above ~4.5 MB failed in production and any below it succeeded — consistent with "some uploads work, some don't" and with the developer's own successful tests.
2. **What makes the client's laptop slow enough to stall a transfer** (their connection, an antivirus/proxy inspecting TLS, or simply multi-MB phone photos over a weak uplink). The fix does not depend on this: transfers are now bounded, cancellable, retryable and never reported as successes they aren't.
3. **Scenario B (edit → stuck)** is explained by the same single-flight wedge: one unsettled autosave request blocks every later save and its redirect. Confirmed in code; not observed on their machine.

---

## 8a. Production test matrix still to run (needs deployment + one admin session)

I cannot execute these: this workspace has no Vercel credentials or CLI, and the admin area needs credentials that are not available here (they are not in `.env.local`, and the only account in the project is the one the client uses). Run them after deploying, and note the result of each:

| # | Test | Input | Expected |
|---|---|---|---|
| 1 | Article cover, **below** the old wall | ~2 MB image | uploads, preview persists after reload |
| 2 | Article cover, **above** the old wall | **4.8–5 MB** image | uploads (previously 413) |
| 3 | All four inline images | 4 × ~2 MB | all four resolve and survive Save |
| 4 | Article Save + redirect | title + cover | lands on `/admin/articles/` with the article listed |
| 5 | Edit without touching images | existing article | images unchanged |
| 6 | Archive issue, **above** the old wall | cover 4.8 MB + **12 MB PDF** | both upload; Save redirects to `/admin/issues/archive` |
| 7 | Save clicked mid-upload | pick 4.8 MB then press Save immediately | waits, then saves **with** the image; no 413 in the console |
| 8 | Slow/failed link | DevTools → Network throttling (or offline mid-upload) | bounded timeout, visible error, **Retry**; no permanent "Uploading…" |
| 9 | Every other upload section | Lawyer in the News, Legal Updates, Events (+gallery), Highlights, Sponsors, Practice Areas, Contributors, Insights | upload + save + redirect as before |
| 10 | Network tab check | any of the above | the only large request is the `PUT` to `…supabase.co/storage/v1/object/upload/sign/…`; every `nglawdigestblog.com` request stays a few KB |

If anything still fails, `__adminDiagnostics()` in the console names the operation, section, stage and HTTP status of each attempt.

## 9. Remaining verification that requires the client's environment

1. Deploy, then have the client upload a **5 MB** image and a **PDF above 4.5 MB** — both should now succeed (they could not before).
2. Have them create an article end-to-end and confirm the redirect to `/admin/articles/`.
3. If anything still fails, ask them to open the browser console and type `__adminDiagnostics()`; the output names the operation, section, stage, HTTP status and duration, which distinguishes an upload failure from a save failure from a navigation failure without developer tools. This replaces the diagnostics that were unavailable during this investigation.
4. Optional: run the suite against the deployed build (`E2E_BASE_URL=https://www.nglawdigestblog.com npx playwright test --workers=2`) and set `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` so the authenticated journeys stop skipping — that is the only way to close the create/edit/publish loop automatically.
