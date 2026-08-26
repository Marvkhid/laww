-- Law Digest — Enhance sponsors table for proper advertisement management
-- Adds placement control and banner image support.
-- Existing sponsor data is unaffected — new columns have safe defaults.

-- placement: where the ad appears on the public site
-- 'all' = everywhere, 'homepage' = homepage only, 'article_page' = article pages, 'sidebar' = sidebar on desktop
alter table public.sponsors
  add column placement text not null default 'all';

-- image_url: full banner ad image (separate from logo_url which is the company logo)
-- Used for wider ad banners, while logo_url stays as the small brand mark
alter table public.sponsors
  add column image_url text null;

comment on column public.sponsors.placement is 'Where the ad appears: all, homepage, article_page, sidebar';
comment on column public.sponsors.image_url is 'Full banner ad image URL (separate from logo_url)';
