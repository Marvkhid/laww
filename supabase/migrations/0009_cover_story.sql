-- Law Digest — Cover Story management
-- Adds is_cover_story flag to articles. A unique partial index enforces
-- exactly one cover story at a time (only published articles can be the
-- cover story). Application logic also unsets the previous one before
-- setting a new one, for a clean UX flow.

alter table public.articles
  add column is_cover_story boolean not null default false;

-- Enforce at most one published cover story via a unique partial index.
-- If two published articles both have is_cover_story = true, the INSERT/UPDATE
-- will fail with a unique_violation — defense in depth alongside the
-- application-level unset-first logic.
create unique index one_cover_story_at_a_time
  on public.articles (is_cover_story)
  where is_cover_story = true;
