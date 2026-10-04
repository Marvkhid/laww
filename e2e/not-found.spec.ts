import { test, expect } from "./fixtures";

/**
 * Unavailable pages must answer with a real HTTP 404.
 *
 * The site renders the correct "Page Unavailable" UI for a missing article,
 * issue, contributor or practice area — but it was answering with **200**.
 * The cause was route-level `loading.tsx` boundaries placed above the
 * dynamic segments (`src/app/loading.tsx`, `src/app/articles/loading.tsx`,
 * and the same for contributors and issues): a loading boundary makes Next
 * flush the response shell before the page resolves, so the `notFound()`
 * status was lost and only the body changed. That is a soft 404 — it tells
 * crawlers the page exists, and it made "unpublish this article" impossible
 * to verify from the outside.
 *
 * This spec is deliberately route-level (plain `request` assertions, no
 * browser) so it stays fast and runs without admin credentials.
 */

const MISSING: Array<{ path: string; name: string }> = [
  { path: "/articles/no-such-article-9f3a", name: "article" },
  { path: "/issues/issue-9999", name: "issue" },
  { path: "/contributors/no-such-person-9f3a", name: "contributor" },
  { path: "/practice-areas/no-such-area-9f3a", name: "practice area" },
  { path: "/events/no-such-event-9f3a", name: "event" },
  { path: "/lawyer-in-the-news/no-such-item-9f3a", name: "lawyer in the news" },
  { path: "/definitely-not-a-page-9f3a", name: "unknown route" },
];

test.describe("unavailable pages", () => {
  test.setTimeout(60_000);

  for (const { path, name } of MISSING) {
    test(`a missing ${name} responds 404, not a soft 404`, async ({ request }) => {
      const res = await request.get(path, {
        headers: { "cache-control": "no-cache" },
      });
      expect(
        res.status(),
        `${path} answered ${res.status()} — the "Page Unavailable" page was ` +
          `served with a success status (soft 404)`
      ).toBe(404);
      expect(
        (await res.text()).toLowerCase(),
        `${path} did not render the not-found page`
      ).toContain("page unavailable");
    });
  }

  test("real listing and homepage routes still answer 200", async ({ request }) => {
    for (const path of ["/", "/articles", "/issues", "/contributors"]) {
      const res = await request.get(path);
      expect(res.status(), `${path} stopped answering 200`).toBe(200);
    }
  });
});