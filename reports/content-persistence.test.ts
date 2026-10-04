/**
 * Content-persistence regression tests.
 *
 * These cover the root causes of the reported data loss — an autosave taken
 * before the rich-text editor mounted destroying the article body, and an
 * unrelated edit clearing the inline images. They exercise the real
 * production module (src/lib/form-presence.ts) with real FormData objects.
 *
 * Run:  node --experimental-strip-types reports/content-persistence.test.ts
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  bodyIsReady,
  fieldPresent,
  readBodyPreserving,
  readTextOptional,
  readTextPreserving,
  storedText,
} from "../src/lib/form-presence.ts";

/** Mirrors the article/legal-update emptiness rule. */
function parseDoc(raw: string): { type: string; content?: unknown[] } | null {
  if (!raw) return null;
  let parsed: { type: string; content?: unknown[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (parsed?.type !== "doc") return null;
  const content = parsed.content ?? [];
  const empty =
    content.length === 0 ||
    content.every(
      (node) =>
        (node as { type?: string; content?: unknown[] }).type === "paragraph" &&
        !((node as { content?: unknown[] }).content ?? []).length
    );
  return empty ? null : parsed;
}

const paragraph = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});
const EMPTY_DOC = JSON.stringify({ type: "doc", content: [{ type: "paragraph" }] });

function form(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.append(k, v);
  return fd;
}

// ── Test A: single-character autosave ────────────────────────────────────

test("A: a single full stop added to the body survives the round trip", () => {
  const stored = paragraph("The rule of law matters");
  const edited = paragraph("The rule of law matters."); // one full stop added

  const fd = form({ body: JSON.stringify(edited), body_state: "ready" });
  const result = readBodyPreserving(fd, stored, parseDoc);

  assert.deepEqual(result, edited, "the edited body must be what gets written");
  assert.equal(
    (result as { content: { content: { text: string }[] }[] }).content[0].content[0].text,
    "The rule of law matters.",
    "the full stop must still be there"
  );
});

// ── Test B: full body persistence ────────────────────────────────────────

test("B: a multi-block body with a heading and link persists intact", () => {
  const doc = {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Held" }] },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "See " },
          {
            type: "text",
            text: "the judgment",
            marks: [{ type: "link", attrs: { href: "https://example.org" } }],
          },
          { type: "text", text: " for the reasoning." },
        ],
      },
    ],
  };
  const fd = form({ body: JSON.stringify(doc), body_state: "ready" });
  const result = readBodyPreserving(fd, null, parseDoc);
  assert.deepEqual(result, doc, "formatting, heading and link must survive");
});

// ── The bug that caused the reported article-body loss ───────────────────

test("RC-A: a payload taken BEFORE the editor mounts must not null the stored body", () => {
  const stored = paragraph("Content the editor wrote earlier");

  // Exactly what an early autosave looks like: the body hidden field exists
  // but is still empty, and body_state has not been written yet.
  const fd = form({ body: "", title: "The Headline" });
  assert.equal(bodyIsReady(fd), false, "editor has not declared itself ready");
  assert.deepEqual(
    readBodyPreserving(fd, stored, parseDoc),
    stored,
    "the stored body must be preserved, not replaced with null"
  );
});

test("RC-A2: a payload with a stale empty body but no ready flag also preserves", () => {
  const stored = paragraph("Real content");
  const fd = form({ body: EMPTY_DOC });
  assert.deepEqual(readBodyPreserving(fd, stored, parseDoc), stored);
});

test("RC-A3: with the ready flag, deliberately emptying the editor DOES clear it", () => {
  const stored = paragraph("Real content");
  const fd = form({ body: EMPTY_DOC, body_state: "ready" });
  assert.equal(
    readBodyPreserving(fd, stored, parseDoc),
    null,
    "an explicit clear by the user must persist as null"
  );
});

test("RC-A4: with the ready flag and no stored body, a new body is written", () => {
  const fd = form({ body: JSON.stringify(paragraph("First words")), body_state: "ready" });
  assert.deepEqual(readBodyPreserving(fd, null, parseDoc), paragraph("First words"));
});

// ── Test E: independent field updates ────────────────────────────────────

test("E: an absent image key preserves the stored image", () => {
  const stored = "https://cdn.example/a.png";
  // Payload for an unrelated edit — no image key at all.
  const fd = form({ title: "New title" });
  assert.equal(fieldPresent(fd, "existing_image_1_url"), false);
  assert.equal(
    readTextPreserving(fd, "existing_image_1_url", stored),
    stored,
    "image 1 must survive an unrelated title edit"
  );
});

test("E2: deleting an image (present but empty) does clear it", () => {
  const stored = "https://cdn.example/a.png";
  const fd = form({ existing_image_1_url: "" });
  assert.equal(fieldPresent(fd, "existing_image_1_url"), true);
  assert.equal(
    readTextPreserving(fd, "existing_image_1_url", stored),
    null,
    "a present-but-empty value is a deliberate clear"
  );
});

test("E3: replacing an image writes the new value", () => {
  const fd = form({ existing_image_1_url: "https://cdn.example/b.png" });
  assert.equal(
    readTextPreserving(fd, "existing_image_1_url", "https://cdn.example/a.png"),
    "https://cdn.example/b.png"
  );
});

test("E4: editing the body must not disturb alt text or position", () => {
  // A body-only payload: no image keys at all.
  const fd = form({ body: JSON.stringify(paragraph("text")), body_state: "ready" });
  assert.equal(readTextPreserving(fd, "image_2_alt", "A courthouse"), "A courthouse");
  assert.equal(readTextPreserving(fd, "image_2_position", "bottom-left"), "bottom-left");
  assert.equal(readTextPreserving(fd, "cover_image_url", "https://cdn.example/c.png"), "https://cdn.example/c.png");
});

// ── readTextOptional: an absent key must OMIT the column, not write null ──
//
// This is the primitive applied to every admin content field (bio, intro,
// description, content, summary). An `undefined` value is dropped when the
// update payload is serialised, so PostgREST leaves the column untouched.

test("optional: an absent content key yields undefined (column omitted)", () => {
  const fd = form({ title: "Only the title changed" });
  assert.equal(readTextOptional(fd, "bio"), undefined);
  assert.equal(readTextOptional(fd, "description"), undefined);
  assert.equal(readTextOptional(fd, "intro"), undefined);
  assert.equal(readTextOptional(fd, "content"), undefined);
});

test("optional: a present-but-empty key yields null (deliberate clear)", () => {
  const fd = form({ bio: "" });
  assert.equal(readTextOptional(fd, "bio"), null);
});

test("optional: a present key yields its text", () => {
  const fd = form({ bio: "Long-form biography…" });
  assert.equal(readTextOptional(fd, "bio"), "Long-form biography…");
});

test("optional: undefined really is dropped by JSON serialisation", () => {
  // This is the mechanism that protects the column, asserted directly.
  const payload = {
    name: "Sector Law",
    description: readTextOptional(form({ name: "Sector Law" }), "description"),
  };
  const json = JSON.parse(JSON.stringify(payload));
  assert.equal("description" in json, false, "absent field must not appear in the request body");

  const cleared = {
    name: "Sector Law",
    description: readTextOptional(form({ description: "" }), "description"),
  };
  assert.equal("description" in JSON.parse(JSON.stringify(cleared)), true);
  assert.equal(JSON.parse(JSON.stringify(cleared)).description, null);
});

test("long-form content survives a round trip byte-for-byte", () => {
  // ~24 KB of varied content: newlines, emoji, quotes, markdown-ish syntax.
  const long = Array.from({ length: 600 }, (_, i) =>
    `Paragraph ${i + 1}: “quoted” — bold **text** & <tags> \\n line ${i}.`
  ).join("\n\n");
  assert.ok(long.length > 20_000, "test content should be genuinely long");

  const fd = form({ content: long });
  const readBack = readTextOptional(fd, "content");
  assert.equal(readBack, long, "content must survive verbatim, untruncated");
  assert.equal((readBack as string).length, long.length);
});

// ── storedText safety ────────────────────────────────────────────────────

test("storedText returns null for a missing row or a non-string column", () => {
  assert.equal(storedText(null, "image_1_url"), null);
  assert.equal(storedText({ image_1_url: null }, "image_1_url"), null);
  assert.equal(storedText({ image_1_url: "x" }, "image_1_url"), "x");
  // A jsonb body column must never be coerced into an image URL.
  assert.equal(storedText({ image_1_url: { type: "doc" } }, "image_1_url"), null);
});
