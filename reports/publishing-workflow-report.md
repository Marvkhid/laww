# Article Creation, Autosave and Publishing — Root-Cause Report

NG Law Digest · Next.js 16.3.0 / React 19.2.8 / Supabase
Verified against a production build on `http://localhost:3100`, Chromium + Firefox + WebKit.

---

## 1. Summary

The reported symptom — *"it keeps asking me to publish"*, *"my images disappear"*,
*"I get two articles"* — was **four independent bugs that shared one root cause**, plus
three server-side gaps that the browser tests could not see.

| # | Symptom | Root cause | Fix |
|---|---|---|---|
| 1 | Images vanish after upload | React rewrote an uncontrolled `<input type="hidden">`'s live `.value` from its `defaultValue` on the next render | Value held in React state, rendered controlled |
| 2 | Publish behaves like Save | Same defect on the `save_mode` field — set imperatively, then reset before the form submitted | Same |
| 3 | Two records for one article | Native submit raced an in-flight autosave; the form carried a stale `autosave_id` | Autosave chain settles first; `syncIdField()` writes the id imperatively; server adopts by slug |
| 4 | Legal insights never publish | Form rendered a `published` **checkbox**, the action read a `save_mode` the form never sent | Form wired to the shared stack |
| 5 | **Body silently vanishes** *(found by the new tests)* | The rich-text editor's `body` **and** `body_state` hidden inputs had the same uncontrolled-`defaultValue` defect | Both converted to controlled state |
| 6 | **Unpublish leaves the page live** | `revalidatePath` never called with the article's slug | Slug-aware invalidation across all content types |
| 7 | **"Page not found" served with HTTP 200** | `loading.tsx` boundaries placed *above* dynamic segments | Route groups scope each skeleton to its listing page |

All eleven admin forms share the same `useAutosave` + `autosave_id` + `ImageUploadZone` +
`AutosaveStatus` stack, so fixes 1–3 were made once in the shared layer and every content
type inherited them.

---

## 2. The root cause behind 1, 2 and 5

React treats an `<input>` without a `value` prop as **uncontrolled**: it owns the DOM node's
`defaultValue`, and on every commit writes that back to the node. For a hidden input the
write lands on the *live* `.value` as well — unlike a visible input, there is no "user
edited this" flag to protect a value the code set by hand.

So this pattern is a trap:

```tsx
// BROKEN — the value lives only in the DOM.
<input type="hidden" name="image_1_url" defaultValue={existing} />
…
urlInput.value = uploadedUrl;      // correct, for about 30 ms
// …any unrelated re-render happens…
// React commits, sees defaultValue === "" and resets value back to "".
```

Three separate fields hit it, in three separate components, all with the same symptom —
the value looks right on screen, and is empty by the time the form is read:

| Field | Component | Consequence |
|---|---|---|
| `image_N_url` | `image-upload.tsx` | Uploaded image cleared; presence rule then read it as a deliberate clear and **wiped the stored image** |
| `save_mode` | `autosave-status.tsx` | "Publish" submitted as a plain Save |
| `body` + `body_state` | `tiptap-editor.tsx` | Body reset to `""`, and `body_state` to `""` — so the server saw an untrusted body and kept the stored one, which is `null` for a new record |

The fix is one pattern, applied in all three places — the value is React state, rendered
controlled, and mirrored onto the DOM node so a flush in the same tick still sees it:

```tsx
const [bodyValue, setBodyValue] = useState(initial);
<input type="hidden" name="body" value={bodyValue} readOnly />
```

Bug 5 was the most damaging and the least visible: it fired only when a re-render happened
between typing and saving. Uploading the cover image is exactly such a re-render, which is
why "type a body, add a picture, press Save" lost the body.

**Regression guard:** [e2e/admin-content-types.spec.ts](../e2e/admin-content-types.spec.ts)
now asserts the hidden `body` field still contains the typed text *after* an unrelated
upload, before publishing.

---

## 3. Fix 3 — the duplicate record

Two submission paths could overlap. The autosave chain created a draft row and returned its
id, but a native form submit could fire before that response landed, so the form carried an
empty `autosave_id` and the server took the *create* path again.

- `use-autosave.ts`: `activeRef` / `submittingRef`, `syncIdField()` (an imperative write of
  `input[name="autosave_id"]` on draft-created, recovery mount and `recover()`), and an
  `onSubmit` that waits for the autosave chain to settle before submitting exactly once.
- `articles/actions.ts`: belt-and-braces — the create path adopts an existing row by slug.

---

## 4. Server-side: cache invalidation and soft 404s

These were invisible to the browser tests until two new assertions were added.

### 4.1 Slug-aware `revalidatePath`

`/articles/[slug]`, `/events/[slug]`, `/issues/[slug]` and the listings are statically
prerendered with a **one-year `s-maxage`**. Only admin actions call `revalidatePath`, so an
action that forgot the slug left stale HTML live for a year.

Fixed across articles, events, legal-updates, lawyer-news and issues. Each update/delete now
reads the row *before* mutating it, and renames invalidate **both** the old and the new slug.

### 4.2 Soft 404s — every missing page answered **200**

`notFound()` rendered the correct "Page Unavailable" UI but with a success status:

```
/articles/no-such-article-xyz      200     ← not-found page, HTTP 200
/issues/issue-999                  200
/practice-areas/nope               200
/definitely-not-a-page-xyz         404     ← only a genuinely unmatched route 404'd
```

Cause: `src/app/loading.tsx`, `src/app/articles/loading.tsx`, `contributors/loading.tsx` and
`issues/loading.tsx` sat **above** the `[slug]` segments. A loading boundary makes Next flush
the response shell before the page resolves, so the status is already committed by the time
`notFound()` throws — only the body changes.

Fixed by scoping each skeleton to its own listing page with route groups, which add no URL
segment:

```
src/app/(home)/page.tsx                  ← was src/app/page.tsx
src/app/(home)/loading.tsx               ← was src/app/loading.tsx
src/app/articles/(listing)/page.tsx      ← was src/app/articles/page.tsx
src/app/issues/(listing)/…,  src/app/contributors/(listing)/…
```

All twelve public routes now answer correctly, and unpublishing an article makes its public
URL a genuine **404** — the assertion that proves the whole revalidation chain.

### 4.3 Missing `<h1>` on every public page

No public page had an `h1`; hierarchies started at `h2`. The homepage's only `h1` was the
cover *story* title, which is optional — so an empty CMS produced a page with no heading at
all. `SectionHeading` gained a `level` prop (`h1` where it is the page title), the homepage
got a visually hidden page `h1`, and the cover story became an `h2`.

Exactly one `h1` is now present on all twelve public routes.

---

## 5. Test infrastructure made trustworthy

The suite was itself producing false confidence, and three of its own bugs were fixed:

1. **A dead fixture.** `article-layout` and `journeys` pointed at `/articles/the-headline`,
   a hand-seeded row that no longer existed. They were asserting against the not-found page —
   and, before fix 4.2, that page returned **200**, so a missing fixture looked like a pass.
   [e2e/public-article.ts](../e2e/public-article.ts) now provisions the article, re-uploads
   its images if needed, and — because a database write does not invalidate the ISR cache —
   drives one real admin status toggle to force revalidation. A sentinel string in the body
   prevents a leftover row from masquerading as the fixture.
2. **A stale route pattern.** `resilience.spec.ts` blocked `**/*supabase.co/**`, but artwork
   is served through `/_next/image`, so the browser never requested that host and the block
   intercepted nothing. It now uses a predicate matching both forms and loads the fixture
   article. That was the last known public failure — it is fixed.
3. **A self-defeating harness.** Firefox intermittently lands a radio click on a node
   `AnimatePresence` is about to re-create: the click reports success, React's `onChange`
   never runs. The assertion now retries the click until it sticks.

New coverage: [e2e/not-found.spec.ts](../e2e/not-found.spec.ts) (soft-404 regression, no
credentials needed) and the unpublish → 404 assertion in the publish spec.

---

## 6. Results

**Public suite** — 60 passed, 1 skipped, 0 failed.

The skip is intentional and self-reported: the grid-fallback layout assertions do not apply
to an article that has body text, so they are skipped *with a reason* rather than silently
passed.

**Authenticated admin suite** — 13 tests per engine.

| Engine | Result |
|---|---|
| Chromium | 13/13 |
| Firefox | 13/13 (one run) — a later run hit a single load-induced `waitForURL` timeout |
| WebKit | 13/13 |

The authenticated workflow under test: *New → type body → upload cover → add four inline
images at distinct positions → settings → silent autosave → Save & Publish*, asserting
exactly one database row, `status = published`, all four image URLs and positions persisted,
the body intact, no duplicates on re-publish, and the public page carrying the content.

**Static checks** — `tsc --noEmit` clean; `next build` compiles; ESLint unchanged from `HEAD`
(the same 10 pre-existing `react-hooks` errors, in files untouched here). `eslint.config.mjs`
now ignores Playwright's HTML report bundle, which alone was adding ~3000 findings from
generated vendor code.

---

## 7. Outstanding — needs a decision from you

### 7.1 Anyone who signs up can edit the entire CMS *(security)*

Migration `0003_authenticated_write_policies.sql` grants **full write access to any
`authenticated` role**, and `/auth/v1/settings` reports `disable_signup: false`. Any person
who confirms an email address can create, edit and delete articles, issues and everything
else.

**Recommended: set `disable_signup: true`** and invite editors through the Supabase dashboard.
That is a project-settings change I have not made, because it also closes self-service
account creation.

### 7.2 Public pages are cached for a year

Correct for a law digest, but it means **editing or deleting rows directly in the database
leaves the old HTML live** — only admin actions invalidate. Worth remembering before any
manual data work. If a shorter window is wanted, export `revalidate` from the listing and
detail routes.

### 7.3 `resilience.spec.ts` reported a "no image fails" bypass

Transient Supabase Storage connection drops are filtered as non-faults in the browser-health
fixture, because image rendering is asserted separately on every route with a diagnostic
message. This is deliberate, but it means an image-only regression would surface in the
image tests, not the health tests.

### 7.4 CI should not run all three engines concurrently

This machine starves under three browsers at once; runs degrade from ~20 s to ~60 s per test
and produce spurious `waitForURL` timeouts. The suites are green when run per engine with
`--workers=1`. Consider running engines sequentially in CI.

---

## 8. Files changed

**Shared layer (the fixes)**
- [use-autosave.ts](../src/components/forms/kit/use-autosave.ts) — submit/autosave race
- [autosave-status.tsx](../src/components/forms/kit/autosave-status.tsx) — `save_mode` as state
- [image-upload.tsx](../src/components/forms/kit/image-upload.tsx) — image URL as state
- [tiptap-editor.tsx](src/app/admin/(protected)/articles/tiptap-editor.tsx) — `body`/`body_state` as state
- [form-presence.ts](../src/lib/form-presence.ts) — presence rule

**Server actions (slug-aware revalidation)**
- articles, events, legal-updates, lawyer-news, issues. Highlights needed no change — they
  render only on `/`. Contributors and practice-areas were already correct.

**Routing**
- `src/app/(home)/`, `src/app/{articles,issues,contributors}/(listing)/` — soft-404 fix
- [section-heading.tsx](../src/components/ui/section-heading.tsx) — `level` prop
- [cover-hero-motion.tsx](../src/components/home/cover-hero-motion.tsx) — cover story `h2`

**Tests**
- [public-article.ts](../e2e/public-article.ts) *(new)* — self-provisioning fixture
- [not-found.spec.ts](../e2e/not-found.spec.ts) *(new)* — soft-404 regression
- `admin-publish`, `admin-content-types`, `article-layout`, `journeys`, `resilience`, `fixtures`