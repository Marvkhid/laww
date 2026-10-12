# Deployment readiness — direct-to-Storage uploads

Status: **prepared, not deployed.** Work sits uncommitted on `main` at `7fc6b76`.
Nothing has been pushed, committed, or deployed.

## 1. What is being deployed

Fixes the production `413 FUNCTION_PAYLOAD_TOO_LARGE` the client hit on the edit
screens. Root cause: image bytes travelled through a Vercel Function, whose
request-body wall is 4 500 000 bytes and is not raisable by Next.js config.

| Change | Effect |
|---|---|
| `src/app/admin/(protected)/upload-sign-actions.ts` (new) | Mints a single-purpose signed upload URL. Receives metadata only (`name`, `type`, `size`) — never bytes. |
| `src/app/admin/(protected)/admin-uploaders.ts` (new) | Binds the signer to each section; all 11 admin forms pass this instead of a File-taking Server Action. |
| `src/lib/upload-client.ts` (new) | Browser validates → asks for a signed URL → `PUT`s the bytes straight to Supabase Storage → `HEAD` read-back verify. |
| `src/lib/supabase/admin/storage.ts` (**deleted**) | The old path: `File` as a Server Action argument, i.e. the 413. |
| 36 modified files | Ten admin action modules read the hidden `existing_*` URL instead of file bytes; the upload kit fills that hidden field on selection. |
| `src/lib/request-limits.ts` (new) + `next.config.ts` | `ACTION_BODY_LIMIT` 2 MB (was `"50mb"`), asserted at config load so an unsafe limit fails `next build`. |
| `e2e/body-limits.spec.ts`, `e2e/admin-upload.spec.ts` (new) | 43 engine-independent tests: limits policy, no server module reads bytes or a `*_file` part, file inputs only inside the kit, only the signer mints upload URLs. |

Diff: 37 files changed, 879 insertions(+), 799 deletions(-), plus 11 new files.

## 2. Gates re-run on this tree (all green)

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx next build` | exit 0 — this also executes `assertRequestLimits()` |
| `npx playwright test --project=node` | **43 passed**, exit 0 (needs no running server) |
| `npm run lint` | 22 problems (10 errors / 12 warnings) — identical to the pre-change baseline |
| Fix presence re-verified | no `instanceof File` outside `autosave.ts` (which *skips* files); no `formData.get("*file")`; `storage.ts` deleted; `next.config.ts` uses the shared constant |
| Diff hygiene | no debug logs, mutation probes, or temp files |

## 3. Production configuration needed

**None new.**

- The signer authenticates with the **admin session** (`requireAdmin`), not a
  service-role key — `src` contains no `SERVICE_ROLE` reference at all.
- Bucket `article-images` and policy `authenticated_write_article_images`
  already exist (migration `0008_article_images_storage.sql`), and uploads work
  in production today for files under the wall, so migrations are applied.
- Required env vars are the two `NEXT_PUBLIC_SUPABASE_*` values production
  already serves admin auth with.
- No schema change, so no migration step in the deploy.

## 4. Deploy mechanism — needs confirmation

The repository contains no `.vercel/` link, no `vercel.json`, and no
`.github/workflows/`. Production is therefore almost certainly a Vercel project
connected to GitHub `Marvkhid/laww` that deploys on push to `main`, but that is
an inference, not repo evidence. Confirm before proceeding.

Rollback: production can be reverted to the previous deployment, and the code
change is a single commit to revert.

## 5. Residual risks after deploy (not blockers)

1. **Storage CORS on the real origin.** The `PUT` is cross-origin to
   `*.supabase.co`. Supabase Storage allows all origins by default and an
   earlier preflight probe passed, but this can only be truly confirmed from
   `https://www.nglawdigestblog.com`. Failure mode would be a CORS error — not
   a 413.
2. **No authenticated end-to-end run.** The 11 action edits are verified
   statically, by build and by the guard suite, but no signed-in save has
   exercised per-section image persistence.
3. **Deliberate rejections remain** for images over 5 MB and PDFs over 30 MB —
   now with a readable message. The client previously saw "50mb" advertised, so
   this is a visible behaviour change.

## 6. Post-deploy acceptance check (client's account, real site)

1. Upload a photo between 4.5 MB and 5 MB on an article → succeeds, no 413.
2. Upload 4 inline images → all four URLs persist after Save and reload.
3. Save while an upload is still running → Save waits, then reports success.
4. Upload a 12 MB PDF to an issue/archive edition → succeeds.
5. Repeat on one section of each kind (news, insights, events, sponsors,
   contributors, practice areas, highlights, legal updates).
6. Confirm the Network tab shows one small POST (the signer) and one `PUT` to
   `supabase.co` — never the image in a request to the site's own origin.
