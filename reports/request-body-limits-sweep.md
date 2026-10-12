# Request-body sweep — every route and handler, and the caps that now apply

Follow-up to the 413 investigation in [admin-upload-save-audit.md](admin-upload-save-audit.md).
Scope: find every surface on this site that can receive a request body (or an
input that grows without bound), and cap each one **below** the hosting
platform's payload wall so the 413 class of failure cannot recur anywhere else.

---

## 1. The wall being capped against (measured on the live deployment)

POSTs of known-size bodies to a GET-only public route (`/api/unsubscribe` — no
handler runs, nothing is written):

| Request body | Response |
|---|---|
| 10 KB · 4.00 MB · 4.30 MB · 4.40 MB | **405** — accepted, route answered |
| **4,500,000 B** · 4.51 MB · 4.81 MB · 6.29 MB | **413** |

```
HTTP/2 413
content-type: text/plain; charset=utf-8
server: Vercel

Request Entity Too LargeFUNCTION_PAYLOAD_TOO_LARGE
```

**Ceiling: 4,500,000 bytes of request body, enforced before the Function runs.**
`serverActions.bodySizeLimit` in `next.config.ts` cannot raise it — that value
governs only Next.js's own parsing.

---

## 2. Inventory — every surface that can receive a request

| Surface | Methods | Reads a body? | Input that grows with user input | Cap now in force |
|---|---|---|---|---|
| `/api/unsubscribe` (route handler) | GET | **No** (no body reader in the file) | `token` query param only | token ≤ 512 chars → 400 before any DB work; non-GET → 405 |
| `/api/cron/newsletter-followup` | GET | **No** | none (auth header + DB rows) | non-GET → 405; no body ever read |
| `robots.txt`, `sitemap.xml`, `opengraph-image` | GET | No (generated) | none | n/a |
| `src/proxy.ts` (middleware/proxy) | all matched (`/admin/:path*`) | **No** — reads cookies only, never a body | none | n/a — it adds no independent limit |
| Server Actions — 11 admin sections (create/update/autosave/publish/delete) | POST → Server Action | **Yes** (`formData`) | rich-text body, textareas, hidden fields | framework **2 MB**; editor refuses **> 1.5 MB** client-side with an actionable message |
| `sendContactMessage` (public) | POST → Server Action | Yes | name, email, subject, category, message | per-field caps below + framework 2 MB |
| `subscribeToNewsletterAction` (public) | POST → Server Action | Yes | email | ≤ 254 chars + framework 2 MB |
| `login` (public) | POST → Server Action | Yes | email, password | email ≤ 254, password ≤ 200 + framework 2 MB |
| `createSignedUploadAction` (admin) | POST → Server Action | Yes (JSON object) | `name`, `contentType` strings | name ≤ 260, type ≤ 120 + framework 2 MB |
| ~~Legacy server-side upload helpers~~ | — | **removed** | — | 12 helpers deleted; see §6 |
| Browser → Supabase Storage signed PUT | PUT | Yes | the file itself (5 MB image / 30 MB PDF limits) | **off-platform**: goes to `*.supabase.co`, never through a Function — unchanged by this work |

No `pages/api` directory and no Supabase edge functions exist in the project, so
the table above is exhaustive.

---

## 3. Caps applied

New single source of truth: **`src/lib/request-limits.ts`**

| Constant | Value | Why this value |
|---|---|---|
| `PLATFORM_BODY_WALL_BYTES` | 4,500,000 | measured, documented in the file |
| `ACTION_BODY_LIMIT` | `"2mb"` | ~10× the largest legitimate payload; far enough below the wall that the app always answers first |
| `CLIENT_PAYLOAD_LIMIT_BYTES` | 1,500,000 | the editor refuses before the framework has to |
| `PUBLIC_FIELD_LIMITS` | name 100 · email 254 (RFC 5321) · subject 200 · category 60 · message 5,000 | bounds every free-text field on the public forms |

| File | Change |
|---|---|
| [next.config.ts](../next.config.ts) | `bodySizeLimit` **50mb → 2mb** (imports `ACTION_BODY_LIMIT`), with the measurement and reasoning inline |
| [use-autosave.ts](../src/components/forms/kit/use-autosave.ts) | autosave snapshot, explicit Save/Publish and the unload path all refuse a payload over 1.5 MB: recovery snapshot is written first, a visible message explains what to do, and **no request is sent** (no retry storm) |
| [contact/actions.ts](../src/app/contact/actions.ts) | per-field caps, checked before validation and before SMTP |
| [contact-form.tsx](../src/components/forms/contact-form.tsx) | `maxLength` mirrors + helper text; form reset suppressed so a **failed** send no longer wipes what was typed |
| [newsletter-actions.ts](../src/components/forms/newsletter-actions.ts) | email cap checked **before** the regex, so no pattern ever runs on a multi-MB string |
| [newsletter-form.tsx](../src/components/forms/newsletter-form.tsx) | `maxLength={254}` |
| [app/admin/actions.ts](../src/app/admin/actions.ts) | login field caps, documented as never blocking a real credential |
| [login-form.tsx](../src/app/admin/login/login-form.tsx) | `maxLength` mirrors the server cap |
| [upload-sign-actions.ts](../src/app/admin/(protected)/upload-sign-actions.ts) | caps the two caller-supplied strings in its JSON payload |
| [api/unsubscribe/route.ts](../src/app/api/unsubscribe/route.ts) | token length cap (only input on a GET route) before the Supabase client is created |

Every cap produces a **visible, specific message** — e.g. “Your message is too
long — 5,000 characters is the maximum.”, “This entry is too large to save
(2.5 MB — the limit is 1.5 MB per save). … Your work is still here and nothing
has been lost.” Both were observed in the browser (below), not just asserted.

---

## 4. Evidence (all local, `next dev` on a spare port; no production data touched)

**Routes — bodies are never read** (`curl -X POST`, 120 B and 3 MiB bodies):

```
/api/unsubscribe                 405      (small and 3 MiB alike)
/api/cron/newsletter-followup    405      (small and 3 MiB alike)
GET /api/unsubscribe (no token)                       400
GET /api/unsubscribe (600-char junk token)            400   ← rejected before any DB work
GET /api/unsubscribe (513-char token)                 400
GET /api/unsubscribe (56-char token, address that cannot exist)  200 + "You've been unsubscribed"
                                                       ↑ the cap does not block a real link
```

The last line used `nonexistent-body-cap-check@example.invalid`, so the scoped
`DELETE` matched **zero rows** — a real link was exercised end to end without
touching any subscriber data. A 56-character token is what a 44-character
address produces, and the cap is 512, so ordinary links have ~9× headroom.

**Framework cap actually applies** (temporary harness page with a real Server
Action; deleted after the run):

| Body | Result |
|---|---|
| 1,000 chars | action ran — `[sizecap-probe] ran chars=1000` |
| 1,800,000 chars | action ran — `chars=1800000` |
| 3,145,728 chars (3 MiB) | **rejected**: `Error: Body exceeded 2mb limit. … statusCode: 413`; the action never ran; the browser console showed `Failed to load resource: the server responded with a status of 500` |

That last line is the same client-visible shape as the production 413 — the
difference is only which layer answers first.

**Client guard in the editor** (harness bound to the real `useAutosave`):

| Scenario | Result |
|---|---|
| 2.5 MB of text, autosave fires | **0 requests sent**, status `error`, message “This entry is too large to save (2.5 MB — the limit is 1.5 MB per save)…” |
| Flush + Save clicked with 2.5 MB | still 0 autosave calls, 0 submits, no navigation, message still shown |
| Text reduced to 500 chars | autosave resumed (`status=saved`) and Save went through (`submits=1`) — the cap is a cap, not a wedge |

**Real public forms, real pages** (browser):

| Page | Input | Observed |
|---|---|---|
| `/contact` | 6,000-char message | `Your message is too long — 5,000 characters is the maximum.` (no email sent) |
| `/contact` | 70-char category (valid otherwise) | `The category is too long — 60 characters is the maximum.` — and every field value was **still present** afterwards |
| `/` (newsletter) | 302-char valid address | `That email address is too long.` (no DB write, no email) |
| `/admin/login` | 274-char email | `That email address is too long.` (no Supabase auth call) |

**Regression:** `admin-upload.spec.ts` (node project) **22/22 passed** with the
modified autosave hook and limits module in place. `npx tsc --noEmit` → 0.
`next build` → 0 on the final tree. `npm run lint` → 10 errors, unchanged from
the pre-existing baseline, none in any file touched here.

---

## 5. Findings reported, deliberately not changed

1. **The cron route fails open when `CRON_SECRET` is unset.** Its guard is
   `if (CRON_SECRET && authHeader !== ...)`, so a deployment *without* that
   variable lets anyone trigger the follow-up send. It reads no body, so it is
   out of scope for this sweep — but it is worth confirming the variable exists
   in Vercel (locally it is absent). Changing it to fail closed without that
   confirmation could silently stop the follow-up emails.
2. **Login has no rate limiting.** Out of scope here; the caps above only bound
   body size.
3. **The platform wall still applies to anything posted from the browser.** A
   raw oversized POST from a malicious client is refused by Vercel before the
   app sees it — nothing in the app can change that. What the app now guarantees
   is that *its own* traffic can never reach it, and that a legitimate user hits
   a readable limit instead.

---

## 6. Regression guard — so this class cannot come back

Two halves, one invariant set. Both are wired into commands that already run:

| Half | Where | Runs on |
|---|---|---|
| Numeric policy | `assertRequestLimits()` called from `next.config.ts` | **every `next build`**, which is what Vercel executes on each deploy |
| Structural rules | [e2e/body-limits.spec.ts](../e2e/body-limits.spec.ts), `node` project | `npm run test:e2e` |

**Rules the guard enforces**

1. `client limit < action limit < host wall`, and the action limit may not
exceed the project ceiling `MAX_ACTION_BODY_BYTES` (2 MB). The config label
(`"2mb"`) and the numeric constant must agree, so the two cannot drift.
2. `next.config.ts` must take `bodySizeLimit` from the shared constant, must
contain **no size literal**, and must call the assertion.
3. **No `"use server"` module may read file bytes** (`arrayBuffer()`,
`instanceof File/Blob`, `FileReader`) **or read a `*_file` / `*_files` part at
all** — the rule that maps directly onto the request the host rejects.
Refusing the file *inside* an action cannot help, because the bytes are already
at the function by then; the only fix is not to have the path.
4. File inputs may exist **only** inside the upload kit, and the kit must clear
the input on selection.
5. Every public form and its action must reference `PUBLIC_FIELD_LIMITS`, so a
free-text field cannot grow without bound.
6. **Only the upload path may mention `File`/`Blob` in code** — the kit, the
upload client, the limits module, the section uploaders, and `autosave.ts`
(which *excludes* files from snapshots). This closes the client-side hole:
rule 4 pins file *inputs* to the kit, and rule 6 stops a form from building a
`File` in JavaScript and appending it to the submitted payload. Comments are
stripped first, because several modules explain these rules in prose.

**The structural change that made rule 3 true.** The legacy server-side upload
path was still present in all 11 admin action modules — `if (file instanceof
File && file.size > 0) → arrayBuffer() → storage.upload(...)` — dead in the UI
(the kit clears the input on selection) but alive in code, and exactly the 413
shape. It has been removed from all 11 modules and
`src/lib/supabase/admin/storage.ts` (12 helpers) is deleted. Each action now
reads the hidden `existing_*` field the upload zone fills, which is the same
value it already used whenever no file was present — so behaviour is unchanged
for every path the UI can produce.

**Proof the guard itself works** (mutations, each reverted afterwards):

| Mutation | Result |
|---|---|
| `ACTION_BODY_LIMIT` raised to `"50mb"` (label + number together) | `next build` **fails at config load**, naming both violations — the project ceiling and the host wall — and the file to fix |
| An action re-reads `formData.get("image_file")` | spec fails: *“Reading a \*_file key means the action expects file bytes in its body…”* |
| A `<input type="file" name="…">` outside the kit | spec fails: *“A file input outside the kit has no upload-on-select path…”* |
| `new File(["x"], "probe.png")` added to a form module | spec fails: *“Only the upload path may handle File/Blob values…”* |
| All reverted | build 0, node suite **43/43** (21 guard + 22 upload) |

The suite also caught a wrong assumption in the guard's own test: `"4mb"` is
4 194 304 bytes — *below* the 4 500 000-byte wall — so only the 2 MB project
ceiling rejects it. Both rules are now covered separately.

## 7. Limits of this verification

- Nothing was deployed: there is no Vercel CLI or credential in this workspace.
  The deployment still runs the pre-fix code until these files are shipped.
- No authenticated upload/save was made on the live site (no admin credentials),
  so the production-side confirmation of the admin caps remains with the
  account holder — §8a of the audit report is the checklist for it.
- The 2 MB figure is Next.js's ceiling for Server Actions; the host's 4.5 MB
  wall sits above it and is unchanged.
