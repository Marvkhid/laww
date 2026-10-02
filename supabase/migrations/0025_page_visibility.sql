-- NG Law Digest — page visibility targeting (0025) + PDF storage ceiling
--
-- ONE model for "where does this content appear?" — every publishable admin
-- entity that can appear on more than one page gets a show_on_pages text[]
-- of page keys. The admin dashboard writes it, the public queries read it,
-- so the admin's answer and the homepage's answer come from the same source
-- of truth.
--
-- Page keys match the public routes:
--   homepage      /
--   about         /about
--   articles      /articles
--   issues        /issues
--   events        /events
--   legal-updates /legal-updates
--   contributors  /contributors (Editorial Board)
--   contact       /contact
--
-- Application code is written to degrade gracefully until this migration is
-- applied (rows without the column are treated as visible everywhere, i.e.
-- today's behaviour), so applying it late never blanks the public site.

-- ── Adverts (sponsors) ────────────────────────────────────────────────────
-- New adverts default to the homepage only — an advert is never silently
-- sprayed across every page.
alter table public.sponsors
  add column if not exists show_on_pages text[] not null default '{homepage}';

comment on column public.sponsors.show_on_pages is
  'Page keys where this advert is allowed to render (homepage, about, articles, issues, events, legal-updates, contributors, contact)';

-- Carry the legacy single-value `placement` column over to the new model so
-- no advert changes position when this migration lands.
update public.sponsors
   set show_on_pages = case placement
         when 'all'          then array['homepage','about','articles','issues','events','legal-updates','contributors','contact']
         when 'homepage'     then array['homepage']
         when 'article_page' then array['articles']
         when 'sidebar'      then array['articles','homepage']
         else array['homepage']
       end;

-- ── Events ────────────────────────────────────────────────────────────────
-- Published events appear on the homepage AND the Events page unless the
-- admin deliberately removes one of them (0013 created events without this).
alter table public.events
  add column if not exists show_on_pages text[] not null default '{homepage,events}';

comment on column public.events.show_on_pages is
  'Page keys where this event is allowed to render (homepage, events)';

-- ── Articles ──────────────────────────────────────────────────────────────
-- Every article stays on the Articles and Issues listings (today's
-- behaviour); the homepage is opt-in via "Show on Homepage".
alter table public.articles
  add column if not exists show_on_pages text[] not null default '{articles,issues}';

comment on column public.articles.show_on_pages is
  'Page keys where this article is allowed to render (homepage, articles, issues)';

-- Articles already opted into a homepage placement keep showing there after
-- the column lands — the four placement flags remain the *section* selector,
-- show_on_pages only gates *whether* the homepage may show it at all.
update public.articles
   set show_on_pages = show_on_pages || 'homepage'
 where featured
    or on_cover
    or is_editorial_insight
    or is_cover_story;

-- ── PDF upload ceiling ────────────────────────────────────────────────────
-- The application enforces a hard 30 MB limit on PDFs with a clear
-- admin-facing error (src/lib/supabase/admin/storage.ts). The storage
-- bucket sits just above that as a backstop so an oversized file can never
-- reach the bucket even if a client bypasses the app validation.
update storage.buckets
   set file_size_limit = 33554432 -- 32 MB
 where id = 'article-images';
