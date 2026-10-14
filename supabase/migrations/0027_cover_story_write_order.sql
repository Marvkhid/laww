-- NG Law Digest — 0027: cover-story write order
--
-- THE BUG THIS FIXES
-- ------------------
-- Migration 0009 created a partial unique index:
--
--   create unique index one_cover_story_at_a_time
--     on public.articles (is_cover_story)
--     where is_cover_story = true;
--
-- Migration 0010 wrote both article RPCs to respect it: unset the previous
-- cover story FIRST, then set the new one.
--
-- Migration 0026 re-created both functions and inverted that order — it sets
-- the new cover story first (in the INSERT / the single UPDATE) and only then
-- clears the previous one. A unique index is enforced per statement, so that
-- first statement raises `unique_violation` (SQLSTATE 23505) before the
-- cleanup can run, whenever another article is already the cover story.
--
-- Reproduced against a real Postgres (both statements, in this order, with a
-- row already holding the flag):
--
--   insert ... (is_cover_story) values (..., true)
--     -> ERROR 23505 constraint=one_cover_story_at_a_time
--          Key (is_cover_story)=(t) already exists.
--   update public.articles set ... is_cover_story = true where id = <row>
--     -> ERROR 23505 constraint=one_cover_story_at_a_time
--
-- That is what the admin hit on /admin/articles/new with "Cover Story"
-- ticked: every autosave and the final Save failed for as long as the flag was
-- ticked, because a published article (`tested-by-dunsin`) already held it.
--
-- The admin was then told "That slug is already in use by another article.":
-- the application mapped ANY 23505 to a slug clash. That misreporting is fixed
-- in src/lib/slug-allocation.ts (constraint-aware classification); this
-- migration fixes the database behaviour underneath it, and the plain
-- UPDATE ... WHERE is_cover_story form also removes the need for a separate
-- cleanup statement.
--
-- Both signatures are identical to 0026, so `create or replace` updates the
-- deployed functions in place and the existing grants survive; they are
-- re-stated at the end anyway.

-- ───────────────────────────────────────────────────────────────────────────
-- CREATE ARTICLE
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


  -- Only one article can be the cover story, and the unique partial index
  -- from 0009 enforces that on EVERY write — so the previous one has to be
  -- cleared before this row claims the flag, never after.
  if p_is_cover_story then

    update public.articles
    set is_cover_story = false
    where is_cover_story;

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
-- UPDATE ARTICLE
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


  if not exists (select 1 from public.articles where id = p_id) then
    raise exception 'article % not found', p_id;
  end if;


  -- Unset the previous cover story FIRST: setting p_is_cover_story on this
  -- row while another row still holds the flag violates
  -- one_cover_story_at_a_time and aborts the whole autosave.
  if p_is_cover_story then

    update public.articles
    set is_cover_story = false
    where id <> p_id
      and is_cover_story;

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
-- GRANTS (unchanged signatures — restated so this migration is self-contained)
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
