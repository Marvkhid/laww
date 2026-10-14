/**
 * Article slug allocation (Node, engine-independent — see the `node` project).
 *
 * These tests exist because the failure they describe reached the client as
 * "That slug is already in use by another article" while the database was in
 * fact refusing a *cover-story* write, and because a taken URL used to dead-end
 * the editor: autosave retried the same refused write forever and the explicit
 * Save failed with the same message, so the only way out was to invent a new
 * title by hand.
 *
 * The rules under test come from two places, and both are exercised here:
 *
 *  · `lib/slug-allocation` — candidate naming, when a retry is allowed, and
 *    which constraint a 23505 actually names. The Postgres error strings used
 *    below are the real ones, captured from a real database.
 *  · the policy the article write API applies on top of it — an unchanged slug
 *    is never renamed, a changed one that is taken gets a readable suffix, and
 *    a failure that is not a slug clash is reported as itself.
 *
 * The fake table enforces uniqueness *at write time*, exactly as the unique
 * index does, rather than by pre-checking: that is the property the retry loop
 * is designed around (two requests can both see a slug free; only the database
 * can decide who gets it).
 */

import { test, expect } from "@playwright/test";
import {
  allocateSlugAndSave,
  classifyUniqueViolation,
  conflictCategoryFromDetail,
  describeDbError,
  normalizeSlug,
  slugCandidates,
  MAX_SLUG_ATTEMPTS,
  MAX_SLUG_LENGTH,
  type AttemptOutcome,
} from "../src/lib/slug-allocation";

// ── The real Postgres errors this policy reacts to ───────────────────────────
//
// Captured from Postgres 16 with the project's own schema loaded: the 0009
// partial index and the 0001 unique constraint. PostgREST passes `code`,
// `message` and `details` through unchanged.

const SLUG_CONFLICT = {
  code: "23505",
  message: 'duplicate key value violates unique constraint "articles_slug_key"',
  details: "Key (slug)=(legal-update) already exists.",
};

const COVER_STORY_CONFLICT = {
  code: "23505",
  message:
    'duplicate key value violates unique constraint "one_cover_story_at_a_time"',
  details: "Key (is_cover_story)=(t) already exists.",
};

const SLUG_REFUSAL = {
  ok: false as const,
  kind: "slug" as const,
  message: "That slug is already in use by another article.",
  detail: "db=23505 constraint=articles_slug_key",
};

/**
 * A stand-in for the articles table: slugs are unique, and a write claims one
 * atomically (which is what a unique index does).
 */
function fakeTable(initial: string[] = []) {
  const owner = new Map<string, string>();
  for (const slug of initial) owner.set(slug, `seed-${slug}`);
  const writes: string[] = [];
  let next = 1;

  /** Let both racers reach the table before either claims a row. */
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  return {
    owner,
    writes,
    async insert(slug: string): Promise<AttemptOutcome<string>> {
      await settle();
      if (owner.has(slug)) return SLUG_REFUSAL;
      const id = `row-${next++}`;
      owner.set(slug, id);
      writes.push(slug);
      return { ok: true, value: id };
    },
    async update(id: string, slug: string): Promise<AttemptOutcome<void>> {
      await settle();
      const holder = owner.get(slug);
      if (holder && holder !== id) return SLUG_REFUSAL;
      if (holder !== id) owner.set(slug, id);
      writes.push(slug);
      return { ok: true, value: undefined };
    },
  };
}

// ── Classification: whose 23505 is it? ───────────────────────────────────────

test.describe("unique violations are classified by constraint", () => {
  test("a duplicate URL reports itself as a slug clash", () => {
    expect(classifyUniqueViolation(SLUG_CONFLICT)).toBe("slug");
  });

  test("a cover-story clash is NOT reported as a slug clash", () => {
    // The whole point: this is the error the admin was told was a slug
    // problem, and investigated as one.
    expect(classifyUniqueViolation(COVER_STORY_CONFLICT)).toBe("cover_story");
    expect(conflictCategoryFromDetail(describeDbError(COVER_STORY_CONFLICT))).toBe(
      "cover_story"
    );
  });

  test("a duplicate (article, contributor) pair is its own kind", () => {
    const error = {
      code: "23505",
      message: 'duplicate key value violates unique constraint "article_contributors_pkey"',
      details: "Key (article_id, contributor_id)=(a, b) already exists.",
    };
    expect(classifyUniqueViolation(error)).toBe("contributors");
  });

  test("errors that are not unique violations are left alone", () => {
    expect(classifyUniqueViolation({ code: "42501", message: "permission denied" })).toBe(
      "other"
    );
    expect(classifyUniqueViolation({ code: "P0001", message: "article 1 not found" })).toBe(
      "other"
    );
    expect(classifyUniqueViolation(null)).toBe("other");
  });

  test("the detail string round-trips into the log category", () => {
    expect(describeDbError(SLUG_CONFLICT)).toBe("db=23505 constraint=articles_slug_key");
    expect(conflictCategoryFromDetail("db=23505 constraint=articles_slug_key")).toBe("slug");
    expect(conflictCategoryFromDetail(null)).toBeNull();
    // Never carries content: only the SQLSTATE and a constraint name.
    expect(describeDbError({ ...SLUG_CONFLICT, details: "Key (slug)=(secret-title) exists." }))
      .toBe("db=23505 constraint=articles_slug_key");
  });
});

// ── Normalisation and candidates ─────────────────────────────────────────────

test.describe("slug normalisation", () => {
  test("a legal slug is passed through untouched", () => {
    // Rewriting these would silently rename a live URL.
    expect(normalizeSlug("marvelllll")).toBe("marvelllll");
    expect(normalizeSlug("the-headline")).toBe("the-headline");
    expect(normalizeSlug("  legal-update-2  ")).toBe("legal-update-2");
  });

  test("anything else becomes URL-safe", () => {
    expect(normalizeSlug("The Headline!")).toBe("the-headline");
    expect(normalizeSlug("Done Deals — Across Africa")).toBe("done-deals-across-africa");
    expect(normalizeSlug("O'Reilly & Sons")).toBe("oreilly-sons");
  });

  test("input with nothing to keep is refused rather than stored empty", () => {
    expect(normalizeSlug("   ")).toBe("");
    expect(normalizeSlug("!!!")).toBe("");
    expect(normalizeSlug("…")).toBe("");
  });

  test("the 120-character cap holds, with no trailing hyphen", () => {
    const long = "a".repeat(200);
    const slug = normalizeSlug(long);
    expect(slug.length).toBe(MAX_SLUG_LENGTH);
    expect(slug.endsWith("-")).toBe(false);
  });
});

test.describe("slug candidates", () => {
  test("readable suffixes, in order", () => {
    expect(slugCandidates("legal-update", 3)).toEqual([
      "legal-update",
      "legal-update-2",
      "legal-update-3",
    ]);
  });

  test("a long base is trimmed to leave room for the suffix", () => {
    const candidates = slugCandidates("b".repeat(120), 3);
    expect(candidates[0]).toHaveLength(120);
    for (const candidate of candidates) {
      expect(candidate.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
      expect(candidate).toMatch(/^[a-z0-9-]+$/);
    }
    expect(candidates[1].endsWith("-2")).toBe(true);
    expect(new Set(candidates).size).toBe(3);
  });

  test("nothing to allocate from yields no candidates", () => {
    expect(slugCandidates("!!!")).toEqual([]);
  });
});

// ── The write policy ─────────────────────────────────────────────────────────

test.describe("creating an article", () => {
  test("1. an available slug is used as-is", async () => {
    const table = fakeTable();
    const result = await allocateSlugAndSave({
      requested: "legal-update",
      attempt: (slug) => table.insert(slug),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.slug).toBe("legal-update");
    expect(result.renamed).toBe(false);
    expect(table.writes).toEqual(["legal-update"]);
  });

  test("2. a second article with the same title gets a readable suffix", async () => {
    const table = fakeTable(["legal-update"]);
    const result = await allocateSlugAndSave({
      requested: "legal-update",
      attempt: (slug) => table.insert(slug),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.slug).toBe("legal-update-2");
    expect(result.renamed).toBe(true);
    expect([...table.owner.keys()]).toEqual(["legal-update", "legal-update-2"]);
  });

  test("3. two articles created from the same title never share a URL", async () => {
    const table = fakeTable();
    const first = await allocateSlugAndSave({
      requested: "legal-update",
      attempt: (slug) => table.insert(slug),
    });
    const second = await allocateSlugAndSave({
      requested: "legal-update",
      attempt: (slug) => table.insert(slug),
    });
    expect(first.ok && first.slug).toBe("legal-update");
    expect(second.ok && second.slug).toBe("legal-update-2");
    expect(table.owner.size).toBe(2);
  });

  test("4. concurrent writes to one slug: the loser is renamed, not lost", async () => {
    const table = fakeTable();
    const results = await Promise.all([
      allocateSlugAndSave({ requested: "legal-update", attempt: (s) => table.insert(s) }),
      allocateSlugAndSave({ requested: "legal-update", attempt: (s) => table.insert(s) }),
    ]);

    expect(results.every((r) => r.ok)).toBe(true);
    const slugs = results.map((r) => (r.ok ? r.slug : null)).sort();
    expect(slugs).toEqual(["legal-update", "legal-update-2"]);
    // Two distinct rows — no duplicate article, no overwrite.
    expect(new Set(table.owner.values()).size).toBe(2);
  });

  test("5. a refusal that is not a slug clash is reported, not retried", async () => {
    let attempts = 0;
    const result = await allocateSlugAndSave({
      requested: "legal-update",
      attempt: async () => {
        attempts += 1;
        return {
          ok: false as const,
          kind: "cover_story" as const,
          message: "Another article is already the Cover Story.",
          detail: "db=23505 constraint=one_cover_story_at_a_time",
        };
      },
    });
    expect(attempts).toBe(1);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe("cover_story");
    expect(result.message).toContain("Cover Story");
    // The failure is not presented as a success anywhere.
    expect(result.exhausted).toBe(false);
  });

  test("6. exhausting the candidates fails loudly and names them", async () => {
    const taken = ["legal-update", "legal-update-2", "legal-update-3", "legal-update-4", "legal-update-5", "legal-update-6"];
    const table = fakeTable(taken);
    let attempts = 0;
    const result = await allocateSlugAndSave({
      requested: "legal-update",
      attempt: (slug) => {
        attempts += 1;
        return table.insert(slug);
      },
    });

    expect(attempts).toBe(MAX_SLUG_ATTEMPTS); // bounded, not endless
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.exhausted).toBe(true);
    expect(result.kind).toBe("slug");
    expect(result.message).toContain("legal-update-2");
    expect(result.detail).toBe("db=23505 constraint=articles_slug_key");
  });
});

test.describe("editing an article", () => {
  test("7. an unchanged slug is never renamed by an edit", async () => {
    // The normal edit: the editor shows existing slugs read-only, so the
    // submitted slug is the stored one. It must get exactly one attempt.
    const table = fakeTable(["legal-update"]);
    const id = table.owner.get("legal-update")!;
    let attempts = 0;
    const result = await allocateSlugAndSave<void>({
      requested: "legal-update",
      currentSlug: "legal-update",
      attempt: (slug) => {
        attempts += 1;
        return table.update(id, slug);
      },
    });

    expect(attempts).toBe(1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.slug).toBe("legal-update");
    expect(result.renamed).toBe(false);
  });

  test("8. changing a slug to one another article owns gets the next suffix", async () => {
    const table = fakeTable(["legal-update", "done-deals"]);
    const id = table.owner.get("done-deals")!;
    const result = await allocateSlugAndSave<void>({
      requested: "legal-update", // intentional rename, but taken
      currentSlug: "done-deals",
      attempt: (slug) => table.update(id, slug),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.slug).toBe("legal-update-2");
    expect(table.owner.get("legal-update-2")).toBe(id);
    // The other article keeps its URL.
    expect(table.owner.get("legal-update")).not.toBe(id);
  });

  test("9. repeated autosaves of one draft update that row and nothing else", async () => {
    const table = fakeTable();
    const created = await allocateSlugAndSave({
      requested: "legal-update",
      attempt: (slug) => table.insert(slug),
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const id = created.value;

    for (let snapshot = 0; snapshot < 5; snapshot++) {
      const saved = await allocateSlugAndSave<void>({
        requested: "legal-update",
        currentSlug: "legal-update",
        attempt: (slug) => table.update(id, slug),
      });
      expect(saved.ok).toBe(true);
    }

    // Five autosaves, still one row — the duplicate-draft defect stays fixed.
    expect(table.owner.size).toBe(1);
    expect(table.owner.get("legal-update")).toBe(id);
  });

  test("10. a submission with no usable title or slug is refused clearly", async () => {
    let attempts = 0;
    const result = await allocateSlugAndSave({
      requested: "!!!",
      attempt: async () => {
        attempts += 1;
        return { ok: true as const, value: "row-1" };
      },
    });
    expect(attempts).toBe(0); // nothing was written
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.kind).toBe("invalid");
    expect(result.message).toMatch(/letter or number/);
  });
});
