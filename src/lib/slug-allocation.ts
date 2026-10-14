/**
 * Article URL slugs — normalisation, conflict classification and allocation.
 *
 * Why this is a module of its own: a slug is written from four different
 * paths (autosave creating a draft, autosave updating one, the explicit
 * Save/Publish action, and the recovery path that adopts an orphaned or
 * deleted draft). All of them must allocate a unique URL by the same rules,
 * and none of them may hand the admin a dead end when the URL they typed is
 * taken.
 *
 * A pre-flight "is this slug free?" SELECT cannot do that job on its own:
 * two requests can both see the same slug free and both then try to claim
 * it. The database's unique constraint is the only arbiter, so the write is
 * attempted and the *loser* of a race retries with the next readable
 * candidate — that is `allocateSlugAndSave` below.
 *
 * It is pure: the caller supplies the write attempt as a callback, so the
 * whole policy (candidate naming, retry bounds, what is and is not retried)
 * is unit-testable without a database — see e2e/slug-allocation.spec.ts.
 */

import { slugify } from "@/lib/slugify";

/** Mirrors the cap in `slugify` so every candidate stays a legal slug. */
export const MAX_SLUG_LENGTH = 120;

/** How many readable candidates one save may try before giving up. */
export const MAX_SLUG_ATTEMPTS = 6;

/** A slug that needs no rewriting: lowercase alphanumerics joined by hyphens. */
const VALID_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** PostgreSQL unique_violation. */
const UNIQUE_VIOLATION = "23505";

/**
 * Why a write was rejected.
 *
 * The important part is that these are *distinguishable*. Every admin write
 * module in this project used to treat any 23505 as "that slug is already in
 * use", so a unique violation raised by a completely different constraint was
 * reported to the admin as a slug clash — which is exactly how the cover-story
 * failure at /admin/articles/new came to be investigated as a slug problem.
 */
export type ConflictKind =
  | "slug"
  | "cover_story"
  | "contributors"
  | "invalid"
  | "other";

/** The shape of a PostgREST/Postgres error (only the fields we classify on). */
export type DbError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

/**
 * Make a submitted string safe to use as a slug *without* rewriting slugs that
 * are already valid.
 *
 * That distinction matters: `slugify` would turn a historical or hand-set slug
 * (say `my_slug`) into a different URL, silently renaming a published page.
 * A value that is already a legal slug is therefore returned untouched, and
 * only genuinely illegal input is put through `slugify`.
 */
export function normalizeSlug(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (raw.length <= MAX_SLUG_LENGTH && VALID_SLUG.test(raw)) return raw;
  return slugify(raw)
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/, "");
}

/**
 * The candidate URLs for one article, in the order they will be tried:
 * `legal-update`, `legal-update-2`, `legal-update-3`, …
 *
 * Readable suffixes, not random ones: the admin can still recognise and share
 * the link. Long bases are trimmed to leave room for the suffix rather than
 * being rejected by the 120-character cap.
 */
export function slugCandidates(
  base: string,
  max = MAX_SLUG_ATTEMPTS
): string[] {
  const clean = normalizeSlug(base);
  if (!clean || max < 1) return [];
  const out = [clean];
  for (let n = 2; out.length < max; n++) {
    const suffix = `-${n}`;
    const room = MAX_SLUG_LENGTH - suffix.length;
    const head = clean.slice(0, room).replace(/-+$/, "");
    out.push(`${head}${suffix}`);
  }
  return out;
}

/**
 * Which constraint did this 23505 come from?
 *
 * Postgres names the violated constraint in `message` and the offending value
 * in `details` (`Key (slug)=(x) already exists.`); PostgREST passes both
 * through. Verified against a real Postgres: the cover-story partial index
 * reports `one_cover_story_at_a_time`, a duplicate URL reports
 * `articles_slug_key`.
 *
 * An unrecognised unique violation on a write that carries a slug is still
 * treated as a slug clash, which keeps the previous retry behaviour for any
 * constraint we do not know about yet (a retry with `-2` is harmless; a wrong
 * message is not, so the raw code is logged alongside it).
 */
export function classifyUniqueViolation(
  error: DbError | null | undefined
): ConflictKind {
  if (!error || error.code !== UNIQUE_VIOLATION) return "other";
  const text = `${error.message ?? ""} ${error.details ?? ""}`;
  if (/one_cover_story_at_a_time/i.test(text) || /\(is_cover_story\)/i.test(text))
    return "cover_story";
  if (/article_contributors/i.test(text)) return "contributors";
  if (/articles_slug_key/i.test(text) || /\(slug\)/i.test(text)) return "slug";
  return "slug";
}

/**
 * A short, safe description of a database error for the diagnostics log:
 * `db=23505 constraint=articles_slug_key`. Never contains content or
 * credentials — only the SQLSTATE and a constraint name.
 */
export function describeDbError(error: DbError | null | undefined): string | null {
  if (!error) return null;
  const named = /"([a-z0-9_]+)"/i.exec(error.message ?? "");
  const column = /Key \(([a-z0-9_, ]+)\)=/.exec(error.details ?? "");
  const subject = named?.[1] ?? (column ? `(${column[1]})` : null);
  const code = error.code ?? "unknown";
  return subject ? `db=${code} constraint=${subject}` : `db=${code}`;
}

/** What one write attempt did. */
export type AttemptOutcome<T> =
  | { ok: true; value: T }
  | { ok: false; kind: ConflictKind; message: string; detail: string | null };

/**
 * The reverse of `describeDbError`: which constraint does this detail string
 * name? The client hook uses it to label a failure in the diagnostics log
 * (category=slug_conflict / cover_story_conflict) without having to re-derive
 * the database error from a plain-English message.
 */
export function conflictCategoryFromDetail(
  detail: string | null | undefined
): ConflictKind | null {
  if (!detail) return null;
  if (/one_cover_story_at_a_time/.test(detail)) return "cover_story";
  if (/article_contributors/.test(detail)) return "contributors";
  if (/articles_slug_key/.test(detail)) return "slug";
  return null;
}

/** One write attempt for one candidate slug. */
export type SaveAttempt<T> = (slug: string) => Promise<AttemptOutcome<T>>;

export type AllocationResult<T> =
  | { ok: true; value: T; slug: string; renamed: boolean }
  | {
      ok: false;
      kind: ConflictKind;
      message: string;
      detail: string | null;
      exhausted: boolean;
    };

/**
 * Try `attempt` with the requested slug, and on a *slug* clash retry with the
 * next readable candidate until one is stored or the candidates run out.
 *
 * Rules the callers rely on:
 *  - An edit that submits the slug the row already holds is never renamed:
 *    changing a live URL has to be intentional, so that case gets exactly one
 *    attempt (the row's own slug can only clash with itself, which a unique
 *    index does not reject).
 *  - Any refusal that is *not* a slug clash returns immediately — retrying a
 *    cover-story or validation failure six times would just be a slow way to
 *    show the same error.
 *  - Exhaustion is reported as such, with the candidates named, so the admin
 *    is told what actually happened instead of being blamed for a duplicate
 *    title they cannot see.
 */
export async function allocateSlugAndSave<T>({
  requested,
  currentSlug = null,
  attempt,
  maxAttempts = MAX_SLUG_ATTEMPTS,
}: {
  requested: string;
  currentSlug?: string | null;
  attempt: SaveAttempt<T>;
  maxAttempts?: number;
}): Promise<AllocationResult<T>> {
  const base = normalizeSlug(requested);
  if (!base) {
    return {
      ok: false,
      kind: "invalid",
      message:
        "This article needs a title (or a slug) containing at least one letter or number before it can be saved.",
      detail: null,
      exhausted: false,
    };
  }

  const unchanged = currentSlug !== null && normalizeSlug(currentSlug) === base;
  const candidates = unchanged ? [base] : slugCandidates(base, maxAttempts);

  let lastDetail: string | null = null;
  for (const slug of candidates) {
    const result = await attempt(slug);
    if (result.ok) {
      return { ok: true, value: result.value, slug, renamed: slug !== base };
    }
    if (result.kind !== "slug") {
      return {
        ok: false,
        kind: result.kind,
        message: result.message,
        detail: result.detail,
        exhausted: false,
      };
    }
    lastDetail = result.detail;
  }

  return {
    ok: false,
    kind: "slug",
    message: `Every URL we tried (${candidates.join(", ")}) is already in use by another article. Give this one a different title, or change its slug.`,
    detail: lastDetail,
    exhausted: true,
  };
}
