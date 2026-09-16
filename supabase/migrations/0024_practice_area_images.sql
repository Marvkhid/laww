-- Practice areas: admin-managed images + ordering for the homepage
-- "Coverage areas" section. Images live in the existing public
-- 'article-images' bucket (0008), path-prefixed practice-areas/.
-- display_order follows the sponsors/homepage_highlights pattern
-- (0012/0017): lower numbers first; ties fall back to name ordering
-- in the query layer.

ALTER TABLE public.practice_areas
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS image_alt text,
  ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
