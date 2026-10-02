
-- ── Sponsors / Advert ────────────────────────────────────────────────────

ALTER TABLE public.sponsors
  ADD COLUMN IF NOT EXISTS show_on_pages
  TEXT[] NOT NULL DEFAULT ARRAY['homepage']::TEXT[];

COMMENT ON COLUMN public.sponsors.show_on_pages IS
  'Page keys where this advert is allowed to render (homepage, about, articles, issues, events, legal-updates, contributors, contact)';

-- Preserve existing advert placement behaviour.
UPDATE public.sponsors
SET show_on_pages = CASE placement
  WHEN 'all' THEN ARRAY[
    'homepage', 'about', 'articles', 'issues',
    'events', 'legal-updates', 'contributors', 'contact'
  ]::TEXT[]
  WHEN 'homepage' THEN ARRAY['homepage']::TEXT[]
  WHEN 'article_page' THEN ARRAY['articles']::TEXT[]
  WHEN 'sidebar' THEN ARRAY['articles', 'homepage']::TEXT[]
  ELSE ARRAY['homepage']::TEXT[]
END;


-- ── Events ───────────────────────────────────────────────────────────────

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS show_on_pages
  TEXT[] NOT NULL DEFAULT ARRAY['homepage', 'events']::TEXT[];

COMMENT ON COLUMN public.events.show_on_pages IS
  'Page keys where this event is allowed to render (homepage, events)';


-- ── Articles ─────────────────────────────────────────────────────────────

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS show_on_pages
  TEXT[] NOT NULL DEFAULT ARRAY['articles', 'issues']::TEXT[];

COMMENT ON COLUMN public.articles.show_on_pages IS
  'Page keys where this article is allowed to render (homepage, articles, issues)';

-- Preserve homepage visibility for articles already using a featured
-- or cover placement.
UPDATE public.articles
SET show_on_pages = array_append(show_on_pages, 'homepage')
WHERE (
  featured
  OR on_cover
  OR is_editorial_insight
  OR is_cover_story
)
AND NOT ('homepage' = ANY(show_on_pages));


-- ── PDF upload ceiling ───────────────────────────────────────────────────

-- Strict 30 MiB storage limit.
UPDATE storage.buckets
SET file_size_limit = 31457280
WHERE id = 'article-images';