/**
 * Page visibility — the single model for "where does this content appear?".
 *
 * Every admin-managed entity that can show up on more than one public page
 * stores a `show_on_pages text[]` of page keys (migration 0025). The admin
 * form writes it, the public queries filter on it — one source of truth, so
 * the dashboard and the frontend can never disagree.
 *
 * Graceful degradation: rows fetched before the migration lands simply have
 * no `show_on_pages` value, and `pagesForRow()` returns null, which
 * `isVisibleOn()` treats as "visible everywhere" — exactly today's
 * behaviour. Nothing on the public site blanks out while the migration
 * is pending.
 */

export type PageKey =
  | "homepage"
  | "about"
  | "articles"
  | "issues"
  | "events"
  | "legal-updates"
  | "contributors"
  | "contact";

export interface PageOption {
  key: PageKey;
  label: string;
}

/** Every public page an advert can be placed on (navbar routes + home). */
export const ADVERT_PAGE_OPTIONS: PageOption[] = [
  { key: "homepage", label: "Home" },
  { key: "about", label: "About" },
  { key: "articles", label: "Articles" },
  { key: "issues", label: "Issues" },
  { key: "events", label: "Events" },
  { key: "legal-updates", label: "Legal Updates" },
  { key: "contributors", label: "Editorial Board" },
  { key: "contact", label: "Contact" },
];

/** Where an article can be listed — homepage placement is separate. */
export const ARTICLE_PAGE_OPTIONS: PageOption[] = [
  { key: "homepage", label: "Homepage" },
  { key: "articles", label: "Articles" },
  { key: "issues", label: "Issues" },
];

/** Where an event can be listed. */
export const EVENT_PAGE_OPTIONS: PageOption[] = [
  { key: "homepage", label: "Homepage" },
  { key: "events", label: "Events" },
];

const ALL_PAGE_KEYS = new Set<string>(
  ADVERT_PAGE_OPTIONS.map((option) => option.key)
);

/**
 * Read + sanitise a row's show_on_pages value.
 * Returns null when the column does not exist on the row yet (migration
 * not applied) — callers treat null as "visible on every page".
 */
export function pagesForRow(
  raw: unknown,
  allowed: readonly PageOption[] = ADVERT_PAGE_OPTIONS
): string[] | null {
  if (!Array.isArray(raw)) return null;
  const allowedKeys = new Set<string>(allowed.map((option) => option.key));
  const pages = raw
    .filter((value): value is string => typeof value === "string")
    .filter((value) => allowedKeys.has(value));
  return [...new Set(pages)];
}

/** null (no column yet) means visible everywhere — the pre-migration behaviour. */
export function isVisibleOn(
  pages: string[] | null | undefined,
  page: PageKey
): boolean {
  if (pages === null || pages === undefined) return true;
  return pages.includes(page);
}

/**
 * Read the checkbox group posted by the admin form.
 * Returns null when the visibility field group was not rendered (page
 * targeting not available yet) so callers can leave the column untouched.
 */
export function pagesFromFormData(
  formData: FormData,
  allowed: readonly PageOption[]
): string[] | null {
  if (formData.get("page_targeting") !== "enabled") return null;
  const allowedKeys = new Set<string>(allowed.map((option) => option.key));
  const submitted = formData
    .getAll("show_on_pages")
    .map((value) => String(value))
    .filter((value) => allowedKeys.has(value));
  return [...new Set(submitted)];
}

/**
 * Legacy `placement` column (single value: all / homepage / article_page /
 * sidebar) mapped onto page keys — used until migration 0025 has run, so an
 * advert keeps exactly the reach it has today.
 */
export function pagesFromLegacyPlacement(placement: string | null | undefined): string[] {
  switch (placement) {
    case "homepage":
      return ["homepage"];
    case "article_page":
      return ["articles"];
    case "sidebar":
      return ["articles", "homepage"];
    case "all":
    default:
      return ADVERT_PAGE_OPTIONS.map((option) => option.key);
  }
}

/** True when a page key is one of the known public pages. */
export function isKnownPage(value: string): value is PageKey {
  return ALL_PAGE_KEYS.has(value);
}

/** Human label for a page key (admin list views). */
export function pageLabel(key: string): string {
  return ADVERT_PAGE_OPTIONS.find((option) => option.key === key)?.label ?? key;
}

export function pageLabels(pages: string[] | null | undefined): string {
  if (!pages || pages.length === 0) return "—";
  return pages.map(pageLabel).join(", ");
}
