import type { UntypedSupabaseClient } from "@/lib/supabase/client";
import type { ArticleRow, ArticleContributorRow, ContributorRow, PracticeAreaRow } from "@/lib/supabase/types";
import type { Article, Author } from "@/lib/types";
import { ARTICLE_PAGE_OPTIONS, isVisibleOn, pagesForRow, type PageKey } from "@/lib/page-visibility";

// NOTE on authorship: the database properly supports multiple authors per
// article via article_contributors (the real co-authored piece needed this).
// The existing Article type (lib/types.ts) still models a single `author`,
// and the current UI components (ArticleCard, Byline, etc.) only render one.
// Rather than rewrite those M1 components as part of a data-layer milestone,
// these queries surface the first author by author_order for now and keep
// the full ordered list available via getArticleAuthors() below for when the
// UI is ready to show multiple bylines. Nothing about the real data is lost
// — it's a mapping-layer simplification, not a schema limitation.

async function attachAuthors(
  supabase: UntypedSupabaseClient,
  articleIds: string[]
): Promise<Map<string, Author[]>> {
  const result = new Map<string, Author[]>();
  if (articleIds.length === 0) return result;

  const { data: linkData } = await supabase
    .from("article_contributors")
    .select("article_id, contributor_id, author_order")
    .in("article_id", articleIds)
    .order("author_order", { ascending: true });

  const links = (linkData ?? []) as ArticleContributorRow[];
  if (links.length === 0) return result;

  const contributorIds = [...new Set(links.map((link) => link.contributor_id))];
  const { data: peopleData } = await supabase
    .from("contributors")
    .select("id, name, credentials, photo_url")
    .in("id", contributorIds);

  const people = (peopleData ?? []) as Pick<ContributorRow, "id" | "name" | "credentials" | "photo_url">[];
  const peopleById = new Map(people.map((person) => [person.id, person]));

  for (const link of links) {
    const person = peopleById.get(link.contributor_id);
    if (!person) continue;
    const authors = result.get(link.article_id) ?? [];
    authors.push({
      name: person.name,
      credentials: person.credentials ?? undefined,
      photoUrl: person.photo_url,
    });
    result.set(link.article_id, authors);
  }

  return result;
}

async function attachPracticeAreaNames(
  supabase: UntypedSupabaseClient,
  practiceAreaIds: (string | null)[]
): Promise<Map<string, string>> {
  const ids = [...new Set(practiceAreaIds.filter((id): id is string => id !== null))];
  if (ids.length === 0) return new Map();

  const { data } = await supabase.from("practice_areas").select("id, name").in("id", ids);
  const rows = (data ?? []) as Pick<PracticeAreaRow, "id" | "name">[];

  return new Map(rows.map((row) => [row.id, row.name]));
}

function mapRow(row: ArticleRow, author: Author, practiceAreaName: string | undefined): Article {
  // Ensure every article has a valid slug — fall back to title-based slug if empty.
  // This prevents 404s when clicking articles that were created before the
  // auto-slug system or somehow ended up with an empty slug in the database.
  const slug = row.slug || row.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120) || row.id;

  // Collect inline images — only include ones that have a URL
  const images: Article["images"] = [];
  const imageSlots = [
    { url: row.image_1_url, alt: row.image_1_alt, position: row.image_1_position },
    { url: row.image_2_url, alt: row.image_2_alt, position: row.image_2_position },
    { url: row.image_3_url, alt: row.image_3_alt, position: row.image_3_position },
    { url: row.image_4_url, alt: row.image_4_alt, position: row.image_4_position },
  ];
  for (const slot of imageSlots) {
    if (slot.url) {
      images.push({ url: slot.url, alt: slot.alt ?? row.title, position: slot.position });
    }
  }

  return {
    id: row.id,
    slug,
    title: row.title,
    author,
    page: row.page_number ?? 0,
    practiceArea: practiceAreaName,
    practiceAreaId: row.practice_area_id,
    dek: row.dek ?? undefined,
    imageAlt: row.title,
    body: row.body,
    coverImageUrl: row.cover_image_url,
    images: images.length > 0 ? images : undefined,
  };
}

async function mapRows(supabase: UntypedSupabaseClient, rows: ArticleRow[]): Promise<Article[]> {
  if (rows.length === 0) return [];

  const [authorsByArticle, practiceAreaNamesById] = await Promise.all([
    attachAuthors(
      supabase,
      rows.map((row) => row.id)
    ),
    attachPracticeAreaNames(
      supabase,
      rows.map((row) => row.practice_area_id)
    ),
  ]);

  return rows.map((row) => {
    const authors = authorsByArticle.get(row.id) ?? [];
    const practiceAreaName = row.practice_area_id
      ? practiceAreaNamesById.get(row.practice_area_id)
      : undefined;
    return mapRow(row, authors[0] ?? { name: "Law Digest" }, practiceAreaName);
  });
}

// Page visibility for a stored article row. Rows saved before migration 0025
// carry no show_on_pages value and are treated as visible everywhere — the
// pre-migration behaviour — so the listings never blank out.
function articleVisibleOn(row: ArticleRow, page: PageKey): boolean {
  return isVisibleOn(
    pagesForRow(row.show_on_pages, ARTICLE_PAGE_OPTIONS),
    page
  );
}

export interface ArticleQueryOptions {
  /** Restrict to articles the admin allowed on this page (see page-visibility). */
  page?: PageKey;
}

// Homepage publication rule (enforced from the database side; see migration
// 0026_autosave_homepage_atomicity.sql). A published article is
// homepage-eligible unless the admin explicitly unticked "Homepage" under
// Display On. This keeps publishing from silently producing content that
// never appears on the front page, while still honouring a deliberate
// exclusion.
export function isHomepageEligible(row: ArticleRow): boolean {
  // Backfilled/persisted state always wins: an explicit un-tick is stored,
  // and that choice is respected because it is explicit state.
  const pages = pagesForRow(row.show_on_pages, ARTICLE_PAGE_OPTIONS);
  if (pages !== null) {
    return pages.includes("homepage");
  }
  // Fallback for rows that predate migration 0025: treat them as
  // homepage-eligible so nothing is dropped from the homepage unexpectedly.
  return row.status === "published";
}

export async function getArticles(
  supabase: UntypedSupabaseClient,
  options?: ArticleQueryOptions
): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .order("page_number", { ascending: true, nullsFirst: false });

  if (error || !data) return [];
  let rows = data as ArticleRow[];
  if (options?.page) {
    const page = options.page;
    rows = rows.filter((row) => articleVisibleOn(row, page));
  }
  return mapRows(supabase, rows);
}

// Every homepage section below reads the same show_on_pages gate: the admin
// ticks "Show on Homepage" (or a homepage placement, which implies it) and
// the section renders the row — one source of truth for admin and frontend.
async function getHomepageArticlesWhere(
  supabase: UntypedSupabaseClient,
  placementFilter: (row: ArticleRow) => boolean
): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .order("page_number", { ascending: true, nullsFirst: false });

  if (error || !data) return [];
  const rows = (data as ArticleRow[]).filter(
    (row) => articleVisibleOn(row, "homepage") && placementFilter(row)
  );
  return mapRows(supabase, rows);
}

export async function getInThisIssue(supabase: UntypedSupabaseClient): Promise<Article[]> {
  return getHomepageArticlesWhere(supabase, (row) => row.on_cover === true);
}

export async function getFeaturedStories(supabase: UntypedSupabaseClient): Promise<Article[]> {
  return getHomepageArticlesWhere(supabase, (row) => row.featured === true);
}

export async function getEditorialInsights(supabase: UntypedSupabaseClient): Promise<Article[]> {
  return getHomepageArticlesWhere(supabase, (row) => row.is_editorial_insight === true);
}

/**
 * Homepage "Latest Stories": published articles eligible for the homepage.
 *
 * Revise: a published article is homepage-eligible by default (see the
 * isHomepageEligible helper and migration 0026, which flips the column
 * default to '{homepage,articles,issues}' and backfills published rows).
 * The admin can still deliberately exclude a story by unticking "Homepage"
 * under Display On — that stored, explicit choice is respected.
 *
 * The placement sections (cover story / featured / in this issue / editorial
 * insights) surface only their own flag; "Latest Stories" renders the
 * remaining eligible published rows so the homepage shows each opted-in
 * story exactly once and is not flooded with the whole archive.
 */
export async function getHomepageArticles(
  supabase: UntypedSupabaseClient,
  limit = 8
): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .order("page_number", { ascending: true, nullsFirst: false });

  if (error || !data) return [];

  const rows = (data as ArticleRow[]).filter((row) => {
    // All published articles are eligible for the homepage unless they have
    // an explicit stored exclusion. No separate opt-in checkbox required.
    if (!isHomepageEligible(row)) return false;
    // Filter out the dedicated placement sections so a story shows exactly
    // once on the homepage.
    return (
      !row.featured &&
      !row.on_cover &&
      !row.is_editorial_insight &&
      !row.is_cover_story
    );
  });

  const articles = await mapRows(supabase, rows);
  return articles.slice(-limit).reverse();
}

export async function getCoverStory(
  supabase: UntypedSupabaseClient
): Promise<Article | null> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .eq("is_cover_story", true)
    .order("page_number", { ascending: true })
    .limit(5);

  if (error || !data) return null;
  const row = (data as ArticleRow[]).find((candidate) =>
    articleVisibleOn(candidate, "homepage")
  );
  if (!row) return null;
  const mapped = await mapRows(supabase, [row]);
  return mapped[0] ?? null;
}

export async function getArticleBySlug(
  supabase: UntypedSupabaseClient,
  slug: string
): Promise<Article | null> {
  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  const mapped = await mapRows(supabase, [data as ArticleRow]);
  return mapped[0] ?? null;
}

// Previous and next articles (by page number) for article navigation.
export async function getAdjacentArticles(
  supabase: UntypedSupabaseClient,
  currentPage: number
): Promise<{ prev: Article | null; next: Article | null }> {
  const [prevResult, nextResult] = await Promise.all([
    supabase
      .from("articles")
      .select("*")
      .eq("status", "published")
      .lt("page_number", currentPage)
      .order("page_number", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("articles")
      .select("*")
      .eq("status", "published")
      .gt("page_number", currentPage)
      .order("page_number", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const prevRow = prevResult.data as ArticleRow | null;
  const nextRow = nextResult.data as ArticleRow | null;

  const [prevMapped, nextMapped] = await Promise.all([
    prevRow ? mapRows(supabase, [prevRow]) : Promise.resolve([]),
    nextRow ? mapRows(supabase, [nextRow]) : Promise.resolve([]),
  ]);

  return { prev: prevMapped[0] ?? null, next: nextMapped[0] ?? null };
}

// Related articles by practice area, excluding the current article.
export async function getRelatedArticles(
  supabase: UntypedSupabaseClient,
  articleId: string,
  practiceAreaId: string | null,
  limit = 3
): Promise<Article[]> {
  if (!practiceAreaId) return [];

  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .eq("practice_area_id", practiceAreaId)
    .neq("id", articleId)
    .order("page_number", { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return mapRows(supabase, data as ArticleRow[]);
}

// Full ordered author list for an article — for when the UI is ready to show
// more than one byline (see note at the top of this file).
export async function getArticleAuthors(
  supabase: UntypedSupabaseClient,
  articleId: string
): Promise<Author[]> {
  const map = await attachAuthors(supabase, [articleId]);
  return map.get(articleId) ?? [];
}

// Articles a given contributor is credited on — powers the "articles in
// this issue" list on the contributor detail page.
export async function getArticlesByContributorSlug(
  supabase: UntypedSupabaseClient,
  contributorSlug: string
): Promise<Article[]> {
  const { data: contributor } = await supabase
    .from("contributors")
    .select("id")
    .eq("slug", contributorSlug)
    .maybeSingle();

  if (!contributor) return [];
  const contributorId = (contributor as { id: string }).id;

  const { data: linkData } = await supabase
    .from("article_contributors")
    .select("article_id")
    .eq("contributor_id", contributorId);

  const articleIds = ((linkData ?? []) as { article_id: string }[]).map(
    (link) => link.article_id
  );
  if (articleIds.length === 0) return [];

  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("status", "published")
    .in("id", articleIds)
    .order("page_number", { ascending: true, nullsFirst: false });

  if (error || !data) return [];
  return mapRows(supabase, data as ArticleRow[]);
}
