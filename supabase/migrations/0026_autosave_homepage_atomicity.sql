-- NG Law Digest — 0026: CMS reliability
-- Autosave bookkeeping, mandatory homepage publishing, atomic article writes

-- ───────────────────────────────────────────────────────────────────────────
-- 1. AUTOSAVE BOOKKEEPING
-- ───────────────────────────────────────────────────────────────────────────

do $$
declare
  t text;
begin
  foreach t in array array[
    'articles',
    'events',
    'call_for_papers',
    'homepage_highlights',
    'lawyer_in_the_news',
    'issues',
    'issues_archive',
    'sponsors',
    'contributors',
    'practice_areas',
    'legal_updates',
    'legal_insights'
  ]
  loop
    execute format(
      'alter table public.%I add column if not exists last_autosaved_at timestamptz',
      t
    );
  end loop;
end $$;

comment on column public.articles.last_autosaved_at is
  'Set by the admin autosave system; never affects publication state.';


-- ───────────────────────────────────────────────────────────────────────────
-- 2. HOMEPAGE PUBLISHING RULE FOR ARTICLES
-- ───────────────────────────────────────────────────────────────────────────

alter table public.articles
  add column if not exists show_on_pages
  text[]
  not null
  default '{articles,issues}';

-- New articles are homepage-eligible by default.
alter table public.articles
  alter column show_on_pages
  set default '{homepage,articles,issues}';

-- Backfill all currently published articles.
-- IMPORTANT: homepage must be supplied as an ARRAY, not plain text.
update public.articles
set show_on_pages = coalesce(show_on_pages, '{}'::text[])
                      || array['homepage']::text[]
where status = 'published'
  and not (
    'homepage' = any(
      coalesce(show_on_pages, '{}'::text[])
    )
  );


-- Events already use homepage + events.
alter table public.events
  add column if not exists show_on_pages
  text[]
  not null
  default '{homepage,events}';


-- ───────────────────────────────────────────────────────────────────────────
-- 3. ARTICLE COLUMN GUARDS
-- ───────────────────────────────────────────────────────────────────────────

alter table public.articles
  add column if not exists image_1_url text;

alter table public.articles
  add column if not exists image_1_alt text;

alter table public.articles
  add column if not exists image_1_position text;

alter table public.articles
  add column if not exists image_2_url text;

alter table public.articles
  add column if not exists image_2_alt text;

alter table public.articles
  add column if not exists image_2_position text;

alter table public.articles
  add column if not exists image_3_url text;

alter table public.articles
  add column if not exists image_3_alt text;

alter table public.articles
  add column if not exists image_3_position text;

alter table public.articles
  add column if not exists image_4_url text;

alter table public.articles
  add column if not exists image_4_alt text;

alter table public.articles
  add column if not exists image_4_position text;

alter table public.articles
  add column if not exists is_cover_story
  boolean
  not null
  default false;

alter table public.articles
  add column if not exists body jsonb;


-- ───────────────────────────────────────────────────────────────────────────
-- 4. DROP HISTORICAL FUNCTION SIGNATURES
-- ───────────────────────────────────────────────────────────────────────────

drop function if exists public.admin_create_article_with_contributors(
  text,
  text,
  text,
  integer,
  text,
  text,
  boolean,
  boolean,
  boolean,
  uuid,
  uuid,
  uuid[],
  integer[]
);

drop function if exists public.admin_update_article_with_contributors(
  uuid,
  text,
  text,
  text,
  integer,
  text,
  text,
  boolean,
  boolean,
  boolean,
  uuid,
  uuid,
  uuid[],
  integer[]
);

drop function if exists public.admin_create_article_with_contributors(
  text,
  text,
  text,
  integer,
  text,
  text,
  boolean,
  boolean,
  boolean,
  uuid,
  uuid,
  jsonb,
  uuid[],
  integer[]
);

drop function if exists public.admin_update_article_with_contributors(
  uuid,
  text,
  text,
  text,
  integer,
  text,
  text,
  boolean,
  boolean,
  boolean,
  uuid,
  uuid,
  jsonb,
  uuid[],
  integer[]
);


-- ───────────────────────────────────────────────────────────────────────────
-- 5. CREATE ARTICLE RPC
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.admin_create_article_with_contributors(
  p_slug text,
  p_title text,
  p_dek text,
  p_page_number integer,
  p_cover_image_url text,
  p_status text,
  p_featured boolean,
  p_is_editorial_insight boolean,
  p_on_cover boolean,
  p_issue_id uuid,
  p_practice_area_id uuid,
  p_body jsonb default null,
  p_contributor_ids uuid[] default '{}',
  p_contributor_orders integer[] default '{}',
  p_image_1_url text default null,
  p_image_1_alt text default null,
  p_image_1_position text default null,
  p_image_2_url text default null,
  p_image_2_alt text default null,
  p_image_2_position text default null,
  p_image_3_url text default null,
  p_image_3_alt text default null,
  p_image_3_position text default null,
  p_image_4_url text default null,
  p_image_4_alt text default null,
  p_image_4_position text default null,
  p_show_on_pages text[] default null,
  p_is_cover_story boolean default false
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_article_id uuid;
  v_i integer;
begin

  if array_length(p_contributor_ids, 1)
     is distinct from
     array_length(p_contributor_orders, 1) then

    raise exception 'contributor id/order array length mismatch';

  end if;


  insert into public.articles (
    slug,
    title,
    dek,
    page_number,
    cover_image_url,
    status,
    featured,
    is_editorial_insight,
    on_cover,
    issue_id,
    practice_area_id,
    body,

    image_1_url,
    image_1_alt,
    image_1_position,

    image_2_url,
    image_2_alt,
    image_2_position,

    image_3_url,
    image_3_alt,
    image_3_position,

    image_4_url,
    image_4_alt,
    image_4_position,

    show_on_pages,
    is_cover_story,
    published_at
  )
  values (
    p_slug,
    p_title,
    p_dek,
    p_page_number,
    p_cover_image_url,
    p_status,
    p_featured,
    p_is_editorial_insight,
    p_on_cover,
    p_issue_id,
    p_practice_area_id,
    p_body,

    p_image_1_url,
    p_image_1_alt,
    p_image_1_position,

    p_image_2_url,
    p_image_2_alt,
    p_image_2_position,

    p_image_3_url,
    p_image_3_alt,
    p_image_3_position,

    p_image_4_url,
    p_image_4_alt,
    p_image_4_position,

    coalesce(
      p_show_on_pages,
      array['homepage', 'articles', 'issues']::text[]
    ),

    p_is_cover_story,

    case
      when p_status = 'published'
      then now()
      else null
    end
  )
  returning id into v_article_id;


  -- Only one article can be the cover story.
  if p_is_cover_story then

    update public.articles
    set is_cover_story = false
    where id <> v_article_id
      and is_cover_story;

  end if;


  -- Insert contributors.
  for v_i in 1 .. coalesce(array_length(p_contributor_ids, 1), 0)
  loop

    insert into public.article_contributors (
      article_id,
      contributor_id,
      author_order
    )
    values (
      v_article_id,
      p_contributor_ids[v_i],
      p_contributor_orders[v_i]
    );

  end loop;


  return v_article_id;

end;
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- 6. UPDATE ARTICLE RPC
-- ───────────────────────────────────────────────────────────────────────────

create or replace function public.admin_update_article_with_contributors(
  p_id uuid,
  p_slug text,
  p_title text,
  p_dek text,
  p_page_number integer,
  p_cover_image_url text,
  p_status text,
  p_featured boolean,
  p_is_editorial_insight boolean,
  p_on_cover boolean,
  p_issue_id uuid,
  p_practice_area_id uuid,
  p_body jsonb default null,
  p_contributor_ids uuid[] default '{}',
  p_contributor_orders integer[] default '{}',
  p_image_1_url text default null,
  p_image_1_alt text default null,
  p_image_1_position text default null,
  p_image_2_url text default null,
  p_image_2_alt text default null,
  p_image_2_position text default null,
  p_image_3_url text default null,
  p_image_3_alt text default null,
  p_image_3_position text default null,
  p_image_4_url text default null,
  p_image_4_alt text default null,
  p_image_4_position text default null,
  p_show_on_pages text[] default null,
  p_is_cover_story boolean default false
)
returns void
language plpgsql
security invoker
as $$
declare
  v_i integer;
begin

  if array_length(p_contributor_ids, 1)
     is distinct from
     array_length(p_contributor_orders, 1) then

    raise exception 'contributor id/order array length mismatch';

  end if;


  update public.articles
  set
    slug = p_slug,
    title = p_title,
    dek = p_dek,
    page_number = p_page_number,
    cover_image_url = p_cover_image_url,
    status = p_status,
    featured = p_featured,
    is_editorial_insight = p_is_editorial_insight,
    on_cover = p_on_cover,
    issue_id = p_issue_id,
    practice_area_id = p_practice_area_id,
    body = p_body,

    image_1_url = p_image_1_url,
    image_1_alt = p_image_1_alt,
    image_1_position = p_image_1_position,

    image_2_url = p_image_2_url,
    image_2_alt = p_image_2_alt,
    image_2_position = p_image_2_position,

    image_3_url = p_image_3_url,
    image_3_alt = p_image_3_alt,
    image_3_position = p_image_3_position,

    image_4_url = p_image_4_url,
    image_4_alt = p_image_4_alt,
    image_4_position = p_image_4_position,

    show_on_pages = coalesce(
      p_show_on_pages,
      show_on_pages
    ),

    is_cover_story = p_is_cover_story,

    published_at =
      case
        when p_status = 'published'
             and published_at is null
          then now()

        when p_status = 'draft'
          then null

        else published_at
      end

  where id = p_id;


  if not found then
    raise exception 'article % not found', p_id;
  end if;


  -- Cover-story exclusivity stays inside the same transaction.
  if p_is_cover_story then

    update public.articles
    set is_cover_story = false
    where id <> p_id
      and is_cover_story;

  end if;


  -- Replace contributors atomically.
  delete from public.article_contributors
  where article_id = p_id;


  for v_i in 1 .. coalesce(array_length(p_contributor_ids, 1), 0)
  loop

    insert into public.article_contributors (
      article_id,
      contributor_id,
      author_order
    )
    values (
      p_id,
      p_contributor_ids[v_i],
      p_contributor_orders[v_i]
    );

  end loop;

end;
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- 7. GRANTS
-- ───────────────────────────────────────────────────────────────────────────

grant execute on function public.admin_create_article_with_contributors(
  text,
  text,
  text,
  integer,
  text,
  text,
  boolean,
  boolean,
  boolean,
  uuid,
  uuid,
  jsonb,
  uuid[],
  integer[],
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text[],
  boolean
) to authenticated;


grant execute on function public.admin_update_article_with_contributors(
  uuid,
  text,
  text,
  text,
  integer,
  text,
  text,
  boolean,
  boolean,
  boolean,
  uuid,
  uuid,
  jsonb,
  uuid[],
  integer[],
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text[],
  boolean
) to authenticated;