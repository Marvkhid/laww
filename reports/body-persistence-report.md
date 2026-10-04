# Body/Content Persistence & Publishing — Admin Dashboard Wide

Applies to **every admin `/edit` page** that has a Body/content field, and to the public pages that render it.

---

## 0. Correction to the brief's stated architecture

The brief describes an `API → NestJS DTO/controller/service → database/Prisma` flow. **This project has no
NestJS and no Prisma.** The real stack is:

```
React form (client component)
  → Next.js Server Action (src/app/admin/(protected)/**/actions.ts)   ← the "controller"
  → typed reader function readInput()                                 ← the "DTO/validation"
  → admin data layer (src/lib/supabase/admin/**) → Supabase PostgREST (RLS)
  → public query layer (src/lib/supabase/queries/**) → public page/cached HTML
```

Everything below was traced through that actual flow. There is no ORM and no DTO class; the reader functions
play that role.

---

## 1. Confirmed root causes

### RC-1 (the actual killer) — a stale read was allowed to become a write

Measured against the live database, the article row is **entirely null** (`updated_at 2026-10-03T23:42:51Z`;
`body`, `image_1..4_url` and `cover_image_url` all null). The same row read two different ways disagreed:
`select=*` returned nulls while a cached explicit-column request returned the real image URLs.

Supabase caches GET responses at its edge and Next caches GET fetches in `.next/cache/fetch-cache`. The admin
editor could therefore be handed an **out-of-date, empty** row. The editor renders what it is given, so an empty
row produced an empty editor — and the next autosave wrote that emptiness back. **A stale read was being allowed
to become a write.** This is the mechanism behind "the content sometimes disappears when I leave and come back".

### RC-2 — An absent field was written as null

Every update path wrote its content column unconditionally. If a payload simply did not carry `body` / `content`
/ `bio` / `description` / `intro` / `summary` — an autosave taken before the rich editor mounted, a partially
rendered form, a field that was never loaded — the column was set to null. Editing an unrelated field was enough.

### RC-3 — The rich-text body field was furnished before the editor existed

`TiptapEditor` renders its hidden `body` input from first paint but only fills it on mount
(`immediatelyRender: false`). Before that the key was present and empty, which RC-2 then wrote over the stored
body. Editing the title before the editor initialised could destroy the article.

### RC-4 — Uploads never triggered a save

Upload-on-select wrote React state only, dispatching no form event. Autosave never scheduled **and** the `dirty`
flag stayed false, so even the best-effort save on navigate was skipped — an uploaded image could never persist.

### RC-5 — No way to delete an image

No remove control existed on any single-image slot.

### RC-6 — A new practice area's page 404'd in production

`/practice-areas/[slug]` looked its slug up in a build-cached list, so an area created after the first build
called `notFound()`. Reproduced: `sector-law` (the only area with an uploaded image — the client's exact case)
prerendered as a 47 KB 404 while the dev server served it correctly.

---

## 2. Files changed and why

**The shared rule** — [src/lib/form-presence.ts](src/lib/form-presence.ts) *(new)*, the single tested place the
presence rule lives:

| Primitive | Meaning |
|---|---|
| `readTextPreserving` | present → the value; absent → the **stored** value |
| `readTextOptional` | present → the value; absent → **`undefined`**, so the column is *omitted* from the UPDATE entirely |
| `bodyIsReady` / `readBodyPreserving` | the body is only trusted once the editor declares itself ready |
| `storedText` | safe read of a text column off a stored row |

**Rich-text bodies** — [articles/actions.ts](src/app/admin/(protected)/articles/actions.ts),
[legal-updates/actions.ts](src/app/admin/(protected)/legal-updates/actions.ts) read against the stored row;
[tiptap-editor.tsx](src/app/admin/(protected)/articles/tiptap-editor.tsx) publishes a `<name>_state = "ready"`
flag on mount (and deliberately emits no input event, so loading a page never fires a spurious save).

**Uncached admin reads** — [fetch-timeout.ts](src/lib/supabase/fetch-timeout.ts) now forces
`cache: "no-store"` and is wired into the admin client in [server-client.ts](src/lib/supabase/server-client.ts).
This is the fix for RC-1 and it covers **every** admin read, because all admin queries go through
`requireAdmin()`. It is safe precisely because that client only serves dynamic admin routes — verified below.

**Every content field, presence-aware** — `bio` ([contributors](src/app/admin/(protected)/contributors/actions.ts)),
`description` ([events](src/app/admin/(protected)/events/actions.ts),
[issues archive](src/app/admin/(protected)/issues/archive/actions.ts),
[practice areas](src/app/admin/(protected)/practice-areas/actions.ts)),
`content` ([highlights](src/app/admin/(protected)/highlights/actions.ts),
[legal insights](src/app/admin/(protected)/legal-insights/actions.ts)),
`intro` ([lawyer news](src/app/admin/(protected)/lawyer-news/actions.ts)),
`summary` ([legal updates](src/app/admin/(protected)/legal-updates/actions.ts)) — each now omits the column when
the payload does not carry it. Input types widened to `string | null | undefined` in the corresponding
`src/lib/supabase/admin/*.ts` files.

**Images** — [image-upload.tsx](src/components/forms/kit/image-upload.tsx): Delete button, form events dispatched
on upload and delete, uncontrolled hidden field, race-safe removal.

**Practice areas** — [practice-areas.ts](src/lib/supabase/queries/practice-areas.ts) gains `getPracticeAreaBySlug`;
[practice-areas/[slug]/page.tsx](src/app/practice-areas/[slug]/page.tsx) uses it before `notFound()`;
[home/practice-areas.tsx](src/components/home/practice-areas.tsx) is now a text index so an upload is not
promoted to the homepage.

No schema change, no RPC change, no rewrite, no security or permission change.

---

## 3. Which admin pages actually have a Body field

Inspected all **11** admin content types. The brief asked about articles, calls for papers, issues, homepage
highlights "and every other attribute that uses a Body field". Findings, stated precisely:

| Admin page | Content field | Notes |
|---|---|---|
| Articles | `body` (rich text) | the field in the screenshot |
| Legal Updates | `body` (rich text) + `summary` | |
| Homepage Highlights | `content` | |
| Legal Insights | `content` | |
| Lawyer in the News | `intro` | |
| Events | `description` | |
| Contributors | `bio` | |
| Practice Areas | `description` | |
| Issues Archive | `description` | |
| **Calls for Papers** | **none** | metadata only: issue number, word limit, month, deadline, contact email, practice areas |
| **Issues** | **none** | metadata only: issue number, season, year, edition, prices, publish date, cover |

So two of the pages named in the brief have no Body field to fix. I did not invent one.

---

## 4. Publishing must render the whole Body — verified with live data

I checked the publish → render path by taking a distinctive **middle** slice of each stored value and looking for
it in the served HTML (not just the opening words, so truncation would be caught):

| Route | Stored rows with content | Result |
|---|---|---|
| `/lawyer-in-the-news` | 1/1 | **RENDERS** |
| `/practice-areas/arbitration` | 11/11 areas | **RENDERS** (full description) |
| `/contributors/modupe-olusoga` | 1/1 | **RENDERS** (full bio) |
| `/` (legal insight content) | 1/1 published | **RENDERS** — insights render in the homepage knowledge section, not the `/legal-insights` listing, which is by design |
| `/issues/archive` | 8/8 | descriptions stored but all under 40 chars — field rendered on card and detail, nothing long enough to truncation-test |
| `homepage_highlights` | 0 published rows | nothing stored to verify |

`line-clamp-*` appears only on listing/homepage teaser cards; that is a CSS clamp on a teaser, and the dedicated
pages render the full field. **No server-side truncation, substring, sanitisation or omission of content was
found anywhere in the write or read path**, and `serverActions.bodySizeLimit` is 50 MB.

---

## 5. Tests executed and actual results

| Test | Result |
|---|---|
| `reports/content-persistence.test.ts` | **16 passed, 0 failed** |
| `reports/acceptance-public.sh` | **16 passed, 0 failed** |
| `reports/page-targeting.test.ts` | **10 passed, 0 failed** |
| `npx tsc --noEmit` | **exit 0** |
| `npx next build` | **exit 0**; prerendered pages still fully populated (homepage 126 KB) — confirms `no-store` on the admin client is safe |
| `npm run lint` | 22 problems (10 errors, 12 warnings) — **identical to the pre-existing baseline; none in any file touched here** |
| Live publish→render probe | 4 routes RENDERS, 1 by-design, 2 with no long content stored |
| Playwright `responsive` + `journeys`, Chromium | 32 passed, 3 skipped, 0 failed |

The persistence tests specifically cover the acceptance criteria that can be tested without a browser session:
single-character save (Test A), full multi-block body with heading and link (Test B), independent field updates
(Test E), long-form content >20 KB round-tripping **byte-for-byte** including newlines, emoji, quotes and angle
brackets, plus direct assertions that an absent key really is dropped by JSON serialisation (so the column is
omitted) and a present-but-empty key really does clear.

---

## 6. Remaining issues / NOT verified

1. **No admin credentials were available.** I could not drive the admin UI, so **I have never observed a real
   click-through saving a Body field and reloading it.** Tests C, D, F, G, H, I and K from the brief remain
   unexecuted. The server-side semantics are unit-tested and the publish→render path is verified against live
   data; the interactive save/reload loop is not.
2. **The destroyed article content cannot be recovered** — the fixes prevent further loss, they do not restore
   what was already nulled. It needs re-entering once.
3. **The article row is currently empty**, so the public article page correctly shows its "body not yet added"
   note and the Playwright content-order tests skip rather than pass misleadingly.
4. **Long-form content was NOT verified through the real UI at maximum length.** The unit test proves a >20 KB
   string survives the read/serialisation path byte-for-byte, and the 50 MB action limit means length is not the
   constraint — but the end-to-end editor→database path at that size is unproven.
5. A short-lived **Supabase edge cache on public reads** remains. It cannot be disabled the way the admin client
   was: `no-store` on the public client was previously measured to empty every prerendered page at build time.

---

## 7. Recommended production verification

1. Deploy, then with an admin account: type a single full stop into an article Body, wait for "All changes
   saved", leave, reopen — confirm it is there. Then paste a genuinely long article (several thousand words),
   save, reopen, and confirm it publishes in full.
2. Repeat once per entity in the table in §3 (highlight, insight, lawyer news, event, contributor, practice area).
3. Set `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` so `e2e/admin.spec.ts` runs the authenticated journeys in CI.
4. Re-enter the lost article body and images and confirm the public page renders them.

> Verified: the presence rule (16 unit tests), the publish→render path against live data, build/prerender safety,
> and the practice-area 404. **Not verified: any authenticated admin interaction, including the save/reload loop
> and long-form content through the real editor.**
