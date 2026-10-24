-- NG Law Digest — 0028: collapse duplicate sponsor / advert rows
--
-- The old advert create path could insert the same advert twice: autosave
-- created a row, and the explicit Save inserted a second one when the autosave
-- id had not reached the form yet. Both rows then rendered in
-- /admin/sponsors and on every page the advert targeted.
--
-- Reads now collapse duplicates (dedupeSponsorRows in
-- src/lib/supabase/queries/sponsors.ts, used by both the admin list and the
-- public queries), so this migration is the data cleanup that removes the
-- orphan rows themselves.
--
-- Identity = the full placement tuple, matching sponsorIdentityKey():
--   name (case/space-insensitive) + logo + artwork + website + tier +
--   display order + page number + page targeting.
-- A live row wins over a draft duplicate (`active desc`), otherwise the
-- oldest row is kept, so no advert that the public site is serving can be
-- removed by this statement.

begin;

with ranked as (
  select
    id,
    row_number() over (
      partition by
        lower(btrim(name)),
        coalesce(logo_url, ''),
        coalesce(image_url, ''),
        coalesce(website_url, ''),
        coalesce(tier, ''),
        display_order,
        coalesce(page_number, -1),
        coalesce(show_on_pages::text, coalesce(placement, ''))
      order by active desc, created_at asc, id asc
    ) as rn
  from public.sponsors
)
delete from public.sponsors s
using ranked r
where s.id = r.id
  and r.rn > 1;

commit;

-- Expected afterwards: one row per advert identity.
-- select name, count(*) from public.sponsors
-- group by name, display_order having count(*) > 1;
