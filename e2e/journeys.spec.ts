import {
  test,
  expect,
  gotoClean,
  revealAll,
  waitForAppReady,
  waitForNoHiddenContent,
  waitForNoBrokenImages,
  reportFaults,
} from "./fixtures";
import { PUBLIC_ARTICLE_SLUG } from "./public-article";

/**
 * Critical public journeys: homepage, article listing, article page, author
 * information, about, issues, events and search.
 *
 * Every spec asserts the browser stayed healthy (no uncaught exceptions, no
 * console errors, no failed requests, no 4xx/5xx) as well as the content
 * itself, because "the page rendered but the browser was throwing the whole
 * time" is exactly the class of report we received.
 */

/**
 * The article path is not hard-coded: the suite provisions its own published
 * fixture article (see public-article.ts) and this turns that into a route.
 */
const articleJourney = (slug: string) => ({
  path: `/articles/${slug}`,
  name: "article page",
  heading: /.+/,
});

const JOURNEYS: Array<{
  path: string;
  name: string;
  /** A heading that must be present once the page has settled. */
  heading: RegExp;
}> = [
  { path: "/", name: "homepage", heading: /digest/i },
  { path: "/articles", name: "article listing", heading: /latest|article/i },
  { path: "/about", name: "about / author information", heading: /about/i },
  { path: "/issues", name: "issues archive", heading: /issue/i },
  { path: "/events", name: "events", heading: /event/i },
  { path: "/search?q=rule+of+law", name: "search", heading: /search/i },
  { path: "/legal-updates", name: "legal updates", heading: /legal/i },
  { path: "/contributors", name: "editorial board", heading: /board|contributor/i },
  { path: "/contact", name: "contact", heading: /contact/i },
];

/** Every journey, with the article journey resolved from the fixture. */
function journeys() {
  return [...JOURNEYS, articleJourney(PUBLIC_ARTICLE_SLUG)];
}

test.describe("public journeys", () => {
  test.setTimeout(120_000);

  for (const { path, name, heading } of journeys()) {
    test(`${name} loads, renders and leaves the browser healthy`, async ({
      page,
      useFaults,
      publicArticle,
    }) => {
      test.skip(
        !publicArticle.provisioned,
        "Could not provision the published fixture article — no E2E_ADMIN_EMAIL / " +
          "E2E_ADMIN_PASSWORD, or the database rejected the seed."
      );
      const res = await gotoClean(page, path);
      expect(res?.status(), `${path} should be served successfully`).toBe(200);

      await waitForAppReady(page);

      // A real document, not a shell.
      expect((await page.content()).length).toBeGreaterThan(5_000);
      await expect(page).toHaveTitle(/\w/);

      const main = page.locator("main#main-content");
      await expect(main, `${path} has no main landmark`).toBeVisible();

      // The not-found state must never be what a live route serves.
      await expect(main).not.toContainText(/page unavailable/i);

      // A settled page must have a heading and readable copy in main.
      await expect(
        main.locator("h1, h2").first(),
        `${path} rendered no heading`
      ).toBeVisible();
      await expect(main).toHaveText(heading);

      // No loading indicator may survive a settled page.
      await expect(
        page.locator(".route-loader"),
        `route loader never resolved on ${path}`
      ).toHaveCount(0);
      const busy = await page.evaluate(() =>
        [...document.querySelectorAll('[aria-busy="true"]')].filter((e) => {
          const r = e.getBoundingClientRect();
          return r.width > 4 && r.height > 4;
        }).length
      );
      expect(busy, `aria-busy left set on ${path}`).toBe(0);

      expect(reportFaults(useFaults), `browser faults on ${path}`).toBe(
        "no faults recorded"
      );
    });
  }

  for (const { path, name } of journeys()) {
    test(`${name}: nothing left invisible, no image fails`, async ({
      page,
      publicArticle,
    }) => {
      test.skip(
        !publicArticle.provisioned,
        "Could not provision the published fixture article — no E2E_ADMIN_EMAIL / " +
          "E2E_ADMIN_PASSWORD, or the database rejected the seed."
      );
      await gotoClean(page, path);
      await revealAll(page);

      const hidden = await waitForNoHiddenContent(page);
      expect(
        hidden,
        `content stuck at opacity 0 / hidden on ${path}:\n${hidden.join("\n")}`
      ).toEqual([]);

      const broken = await waitForNoBrokenImages(page);
      expect(broken, `broken images on ${path}:\n${broken.join("\n")}`).toEqual(
        []
      );
    });
  }
});
