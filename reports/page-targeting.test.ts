/**
 * Test G (logic level): advert page targeting.
 *
 * Runs the REAL production module (src/lib/page-visibility.ts) so this
 * verifies the code that gates every advert on every public page — not a
 * re-implementation. Verifies:
 *   - an advert targeted at two pages is visible on exactly those two
 *   - a deliberate exclusion is honoured
 *   - legacy rows keep their current reach (no advert silently disappears)
 *
 * Run: node --experimental-strip-types reports/page-targeting.test.ts
 */
import assert from "node:assert/strict";
import {
  ADVERT_PAGE_OPTIONS,
  isVisibleOn,
  pagesForRow,
  pagesFromLegacyPlacement,
  pagesFromFormData,
  pageLabel,
  type PageKey,
} from "../src/lib/page-visibility.ts";

let pass = 0;
let fail = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    pass++;
  } catch (error) {
    console.log(`FAIL: ${name}\n      ${(error as Error).message}`);
    fail++;
  }
}

const ALL_KEYS = ADVERT_PAGE_OPTIONS.map((o) => o.key) as PageKey[];

test("G-a advert on exactly two pages is visible on only those two", () => {
  const advert = { show_on_pages: ["homepage", "about"] };
  for (const page of ALL_KEYS) {
    const visible = isVisibleOn(pagesForRow(advert.show_on_pages), page);
    const expected = page === "homepage" || page === "about";
    assert.equal(
      visible,
      expected,
      `page ${page}: expected visible=${expected}, got ${visible}`
    );
  }
});

test("G-b advert targeted at one page is hidden from the other seven", () => {
  const advert = { show_on_pages: ["issues"] };
  const visibleOn = ALL_KEYS.filter((page) =>
    isVisibleOn(pagesForRow(advert.show_on_pages), page)
  );
  assert.deepEqual(visibleOn, ["issues"]);
});

test("G-c explicit homepage exclusion is respected", () => {
  // The homepage default backfills 'homepage'; an admin un-ticking it must
  // actually remove the advert from the homepage.
  const advert = { show_on_pages: ["articles", "issues"] };
  assert.equal(isVisibleOn(pagesForRow(advert.show_on_pages), "homepage"), false);
  assert.equal(isVisibleOn(pagesForRow(advert.show_on_pages), "articles"), true);
});

test("G-d legacy row (no column yet) stays visible everywhere", () => {
  // Pre-migration rows must not lose adverts off pages they are on today.
  assert.equal(pagesForRow(undefined), null);
  assert.equal(isVisibleOn(pagesForRow(undefined), "homepage"), true);
  assert.equal(isVisibleOn(pagesForRow(undefined), "contact"), true);
});

test("G-e legacy placement column maps to today's reach", () => {
  assert.deepEqual(pagesFromLegacyPlacement("homepage"), ["homepage"]);
  assert.deepEqual(pagesFromLegacyPlacement("all"), ALL_KEYS);
  const sidebar = pagesFromLegacyPlacement("sidebar");
  assert.ok(sidebar.includes("homepage") && sidebar.includes("articles"));
});

test("G-f unchecked pages are dropped when the form group is rendered", () => {
  const fd = new FormData();
  fd.set("page_targeting", "enabled");
  fd.append("show_on_pages", "homepage");
  fd.append("show_on_pages", "about");
  assert.deepEqual(pagesFromFormData(fd, ADVERT_PAGE_OPTIONS), ["homepage", "about"]);
});

test("G-g form group not rendered leaves the column untouched", () => {
  const fd = new FormData(); // no page_targeting marker at all
  fd.append("show_on_pages", "homepage");
  assert.equal(pagesFromFormData(fd, ADVERT_PAGE_OPTIONS), null);
});

test("G-h unknown / stale page keys are sanitised out", () => {
  const pages = pagesForRow(["homepage", "not-a-real-page", "about"]);
  assert.deepEqual(pages, ["homepage", "about"]);
});

test("G-i every advert page option has a numbered route identifier", () => {
  for (const option of ADVERT_PAGE_OPTIONS) {
    assert.match(
      option.label,
      /— Page \d+/,
      `label "${option.label}" is missing its page number`
    );
    assert.equal(pageLabel(option.key), option.label);
  }
});

test("G-j no duplicate page keys in the advert option list", () => {
  assert.equal(new Set(ALL_KEYS).size, ALL_KEYS.length);
});

console.log(`\n=== SUMMARY: ${pass} passed, ${fail} failed ===`);
process.exit(fail === 0 ? 0 : 1);