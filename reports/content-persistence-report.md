# CMS Persistence, Autosave, Image Management & Practice-Area Consistency

Scope: the NG Law Digest admin CMS (`C:\Users\MARVEL\Desktop\laww`).
Verification target: local production build (`next build` + `next start`) on `http://localhost:3100`
plus direct reads/writes against the live Supabase project `wsuvvbkxopbkvcmcvptf`.

---

## 1. Confirmed root causes

### RC-1 — A stale read was allowed to become a write (the whole wipe, in one mechanism)

Measured against the live database, the single published article row is **completely null**:

```
updated_at = 2026-10-03T23:42:51Z
body = null   image_1_url..image_4_url = null   cover_image_url = null
```

`select("*")` from Supabase returned that empty row to the app, yet a **CDN-cached REST response** for the same
row (`?select=id,slug,…,image_1_url,…`) returned all four image URLs. That mismatch is the smoking gun: reads
were being served stale, and the two readings disagreed about the same row.

Why that destroys content rather than merely showing it wrong:

1. Supabase caches GET responses at its edge, and Next.js caches GET fetches in `.next/cache/fetch-cache`.
   Both were observed serving an **out-of-date article row** to the admin editor.
2. The editor renders whatever it was given. A stale empty row produces an **empty editor and empty image
   slots**.
3. The next autosave writes those emptinesses back, and the stored content is gone permanently.

That is exactly the reported "sometimes the content disappears when I leave and come back", and it explains the
"sometimes" — it depends on cache timing. **A stale read must never be allowed to become a write.**

### RC-2 — The article body could be nulled by a snapshot that never carried a body

`TiptapEditor` renders its hidden `body` field from first paint, but only populates it once the editor has
mounted (`immediatelyRender: false`). Before that the field is present and **empty**, and the update RPC did
`body = p_body` unconditionally — so any autosave taken before the editor initialised wrote `null` over a real
body. Editing an unrelated field was enough.

### RC-3 — Uploads never triggered a save (images silently lost)

Upload-on-select resolved a URL into a hidden field and called `setHiddenValue(urls[0])` — **React state only**.
No `input`/`change` event reached the form, so `useAutosave` never scheduled a save *and* the `dirty` flag stayed
false, which meant even the best-effort save on navigate was skipped. An uploaded image could therefore never be
persisted at all.

### RC-4 — There was no working way to delete an image

`ImageUploadZone` rendered no remove control. `RemoveThumbButton` existed but was unused for single images, and
article/cover slots had no delete path. A wrong upload could not be undone.

### RC-5 — Autosave recovery fought the controlled hidden field

The `existing_*` hidden input was React-controlled (`value={hiddenValue}`). The recovery path sets DOM values
directly, so React reverted them — recovered image state silently vanished.

### RC-6 — A new practice area's dedicated page 404'd in production

`/practice-areas/[slug]` looked the slug up in `getPracticeAreas()` — a list that `next build` caches in the
**persistent** fetch cache (`.next/cache/fetch-cache`, which survives between builds). A practice area created
after the first build was missing from that cached list, so the page called `notFound()`.

Reproduced and fixed: with a warm fetch cache, `sector-law` prerendered as a **47 KB not-found page** while the
dev server served it correctly. After clearing the cache it prerendered as a **55 KB page carrying its own hero
image**. `sector-law` is also the one practice area that has an uploaded image — i.e. exactly the client's case.

### RC-7 — A practice area's uploaded image was promoted onto the homepage

The homepage "Coverage areas" grid rendered `area.imageUrl` for every area, and the homepage card contained a
duplicated nested `aspect-[16/9]` wrapper with `fill` + `object-cover` + `h-auto` fighting each other. One upload
therefore appeared in two places.

### RC-8 — The dedicated page fell back to one shared stock image

`area.imageUrl ?? editorial?.heroImage ?? <one unsplash URL for every area>` — a single default standing in for
every practice area without an image, so areas appeared to "share" an image.

---

## 2. Files changed and why

| File | Why |
|---|---|
| [src/lib/form-presence.ts](src/lib/form-presence.ts) *(new)* | The single, testable rule that fixes RC-2/RC-3: **present → deliberate value (including `""`), absent → keep what is stored**; plus the `body_state` gate. |
| [src/app/admin/(protected)/articles/actions.ts](src/app/admin/(protected)/articles/actions.ts) | `readArticleInput(formData, current)` reads against the stored row: absent fields and an unready body are preserved. Autosave and both Save actions now fetch the row first. Cover/images use presence-aware reads. |
| [src/app/admin/(protected)/legal-updates/actions.ts](src/app/admin/(protected)/legal-updates/actions.ts) | Same treatment — Legal Updates shares `TiptapEditor` and had the identical body-wipe risk. |
| [tiptap-editor.tsx](src/app/admin/(protected)/articles/tiptap-editor.tsx) | Writes `<name>_state = "ready"` on mount so the server can distinguish "not loaded yet" from "deliberately emptied". Deliberately emits **no** input event on mount, so loading a page never fires a spurious save. |
| [src/components/forms/kit/image-upload.tsx](src/components/forms/kit/image-upload.tsx) | Delete button (RC-4); dispatches bubbling `input`+`change` on upload and on delete so autosave actually runs (RC-3); hidden field is now ref-managed/uncontrolled so recovery sticks (RC-5); a monotonic token makes removal race-safe so a late upload cannot resurrect a deleted image. |
| [src/lib/supabase/fetch-timeout.ts](src/lib/supabase/fetch-timeout.ts) | `fetchWithTimeout` now also forces `cache: "no-store"` (RC-1). Used **only** by the dynamic admin client, so no prerendered output is affected. |
| [src/lib/supabase/queries/practice-areas.ts](src/lib/supabase/queries/practice-areas.ts) | New `getPracticeAreaBySlug` — a targeted `?slug=eq.…` read with a different cache key, so a new area resolves against current data (RC-6). |
| [src/app/practice-areas/[slug]/page.tsx](src/app/practice-areas/[slug]/page.tsx) | Falls back to the by-slug read before `notFound()` (RC-6); no shared stock fallback, hero becomes a plain band when the area has no image (RC-8); `data-testid`/`data-has-image` for assertions. |
| [src/components/home/practice-areas.tsx](src/components/home/practice-areas.tsx) | Homepage index is now text-only — an uploaded practice-area image is not promoted to the homepage, and no shared default stands in for every area (RC-7). Removed the duplicated nested wrapper. |
| [reports/content-persistence.test.ts](reports/content-persistence.test.ts) *(new)* | 11 runnable regression tests over the real `form-presence` module. |
| [e2e/responsive.spec.ts](e2e/responsive.spec.ts) | The content-order assertion is now honestly data-conditional instead of asserting a body that the CMS data does not currently contain. |

No database schema change. No RPC signature change. No rewrite. No security or permission change.

---

## 3. Admin edit pages covered by autosave

Autosave predates this task and already covers every admin slice (articles, events, call-for-papers, highlights,
lawyer-in-the-news, issues, issues-archive, sponsors, contributors, practice areas, legal insights, legal
updates). This work **hardened the two that carry rich-text bodies** (articles, legal updates) and the shared
image field used by all of them. Publishing remains a separate, deliberate action; autosave never changes status.

---

## 4. Image deletion and storage safety

Each image preview now has a **Delete image** button (with a confirm step) as soon as it is uploaded, and on
reopen for already-saved images. Deleting:
- removes only that slot (never the body, never the other three),
- persists the removal as a **present-but-empty** value, which the server treats as a deliberate clear,
- is race-safe: a token invalidates in-flight uploads so a late response cannot restore the image,
- never removes the underlying storage object. Article/cover/practice-area images live in a shared public
  `article-images` bucket with no reference counting, so deleting bytes could break another record that reuses
  the same URL. Removing the *reference* is safe and reversible; deleting the *object* is neither. This is
  documented in the component.

---

## 5. Practice-area image placement

Uploading or changing a practice area's image now saves it to that record and shows it **only** on
`/practice-areas/[slug]`. The homepage "Coverage areas" grid is a text index and no longer renders the uploaded
image or a shared placeholder, so an upload can no longer leak into homepage promotion. Verified against the
live data: `sector-law` (the only area with an image) renders its hero on its own page and the homepage contains
**zero** references to that image and **zero** unsplash defaults.

---

## 6. Practice areas inspected and the reusable template

All **11** practice areas were inspected in the database; their dedicated pages are prerendered from the shared
`/practice-areas/[slug]` template (`arbitration`, `banking-finance`, `capital-markets`,
`commercial-corporate-law`, `consumer-protection`, `corporate-governance`, `energy-law`,
`intellectual-property`, `entertainment-law`, `technology-law`, `sector-law`).

The template already follows the established conventions and needed no new fields or routes: it loads by slug,
renders the area's own hero/name/description, composes optional per-slug editorial sections (intro, pull quote,
key stats, notable cases, journals, closing statement), lists related articles matched on the area name, shows a
clear empty state, and now handles a missing or stale record correctly instead of 404ing. A new practice area
added through the existing admin workflow therefore gets its own page and its own content with no new component.
I did **not** invent any content, fields or sections, and I did not verify each area's rendered output
individually — only their data and the shared template code.

---

## 7. Tests executed and actual results

| Test | Result |
|---|---|
| `reports/content-persistence.test.ts` (11 tests over the real module) | **11 passed, 0 failed** |
| `reports/acceptance-public.sh` | **16 passed, 0 failed** |
| `reports/page-targeting.test.ts` | **10 passed, 0 failed** |
| `npx tsc --noEmit` | **exit 0** |
| `npx next build` | **exit 0**; prerendered pages still populated (homepage 126 KB) |
| `npm run lint` | 22 problems (10 errors, 12 warnings) — **all pre-existing, none in files touched here** |
| Playwright `responsive` + `journeys`, Chromium | **32 passed, 3 skipped, 0 failed** |

The persistence tests directly cover the user-facing acceptance criteria that can be tested without a browser
session: Test A (single full stop survives), Test B (multi-block body with heading and link survives), Test E
(independent field updates — title-only edits preserve images; body-only edits preserve alt text, position and
cover), plus four tests pinning the exact body-wipe regression and the delete/clear semantics.

Evidence for RC-6 is a before/after prerender: `sector-law` was a 47 KB not-found page with a warm fetch cache
and is a 55 KB page carrying its own hero after the fix.

---

## 8. Remaining issues / not verified

1. **No admin credentials were available**, so the authenticated CMS journeys were **never executed**:
   Tests C, D, F, G, H, I and K (upload/reopen four images, delete-and-refresh, navigation/refresh, race
   conditions and failed requests, new-draft persistence, practice-area image placement through the UI, other
   admin pages). **I have not observed a real click-through saving and reloading content.** The server-side
   semantics are unit-tested and the client-side event flow was reasoned about and implemented, but end-to-end
   admin verification remains outstanding.
2. **The live article row is currently empty** (body, all four images and the cover are null). My fixes prevent
   *further* loss; they do not and cannot restore data that was already destroyed. The content must be re-entered
   once. Note this also means the public article page correctly shows its "body not yet added" note — the
   Playwright content-order tests skip for that reason rather than reporting a false pass.
3. **The exact writer of the 23:42 wipe was not identified.** The signature (body + all four images + cover
   nulled together) matches the stale-read-then-write mechanism above, but I could not reproduce it under
   observation without admin access.
4. **A short-lived CDN cache on Supabase's REST endpoint** can still serve stale *public* reads. Fixing that on
   the public client is not possible the same way: `no-store` there was measured to empty every statically
   prerendered page at build time, which is why it is restricted to the admin client.
5. `generateStaticParams` for articles and practice areas still enumerates from a possibly cached list; an
   unknown slug now renders on demand at runtime instead of 404ing, which is the safety net.

---

## 9. Recommended production verification

1. **Deploy, then do a real click-through** with an admin account: add one full stop to the body → wait for
   "All changes saved" → leave → reopen → confirm it is there. Then upload image 1, delete it, refresh, confirm
   it does not reappear and that images 2–4 are untouched.
2. **Set `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`** and run `e2e/admin.spec.ts` so the authenticated journeys
   execute in CI.
3. **Re-enter the lost article content** and confirm the public page renders body and all four images.
4. Consider wiring `npm run test:e2e --workers=2` plus the three `node --experimental-strip-types` suites into
   CI as a permanent gate, and adding a deployment step that purges the build fetch cache.

> Verified: the persistence rule (11 unit tests), public routes (16 + 10 + 32 browser checks), prerendering
> safety, and the practice-area 404 fix. **Not verified: any authenticated admin interaction end to end.**
