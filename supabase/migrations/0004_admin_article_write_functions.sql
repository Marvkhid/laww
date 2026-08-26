-- Law Digest — Milestone 3, migration 0004
--
-- Why this exists: creating/editing an article touches two tables (articles,
-- and its article_contributors rows). Doing that as separate client-side
-- calls — update the article, then delete old links, then insert new ones —
-- has no atomicity: if any step after the first fails, the article is left
-- half-updated with its contributor links silently gone. PostgREST/
-- supabase-js has no client-side multi-statement transaction; the only real
-- fix is a Postgres function, where every statement in the body shares one
-- implicit transaction and an exception anywhere rolls back the whole thing.
--
-- SECURITY INVOKER (the default, kept explicit here) — these functions run
-- with the CALLER's privileges, so they're still fully governed by the
-- existing RLS policies from 0002/0003. They don't bypass anything; an
-- unauthenticated caller's writes still get rejected by RLS exactly as
-- before, same as a plain insert/update would be. EXECUTE is also
-- restricted to `authenticated` as an explicit second layer.

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
  p_contributor_ids uuid[],
  p_contributor_orders integer[]
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_article_id uuid;
  v_i integer;
begin
  if array_length(p_contributor_ids, 1) is distinct from array_length(p_contributor_orders, 1) then
    raise exception 'contributor id/order array length mismatch';
  end if;

  insert into public.articles (
    slug, title, dek, page_number, cover_image_url, status,
    featured, is_editorial_insight, on_cover, issue_id, practice_area_id, published_at
  ) values (
    p_slug, p_title, p_dek, p_page_number, p_cover_image_url, p_status,
    p_featured, p_is_editorial_insight, p_on_cover, p_issue_id, p_practice_area_id,
    case when p_status = 'published' then now() else null end
  )
  returning id into v_article_id;

  for v_i in 1 .. coalesce(array_length(p_contributor_ids, 1), 0) loop
    insert into public.article_contributors (article_id, contributor_id, author_order)
    values (v_article_id, p_contributor_ids[v_i], p_contributor_orders[v_i]);
  end loop;

  return v_article_id;
end;
$$;

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
  p_contributor_ids uuid[],
  p_contributor_orders integer[]
)
returns void
language plpgsql
security invoker
as $$
declare
  v_i integer;
begin
  if array_length(p_contributor_ids, 1) is distinct from array_length(p_contributor_orders, 1) then
    raise exception 'contributor id/order array length mismatch';
  end if;

  update public.articles set
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
    published_at = case
      when p_status = 'published' and published_at is null then now()
      when p_status = 'draft' then null
      else published_at
    end
  where id = p_id;

  if not found then
    raise exception 'article % not found', p_id;
  end if;

  delete from public.article_contributors where article_id = p_id;

  for v_i in 1 .. coalesce(array_length(p_contributor_ids, 1), 0) loop
    insert into public.article_contributors (article_id, contributor_id, author_order)
    values (p_id, p_contributor_ids[v_i], p_contributor_orders[v_i]);
  end loop;
end;
$$;

grant execute on function public.admin_create_article_with_contributors(
  text, text, text, integer, text, text, boolean, boolean, boolean, uuid, uuid, uuid[], integer[]
) to authenticated;

grant execute on function public.admin_update_article_with_contributors(
  uuid, text, text, text, integer, text, text, boolean, boolean, boolean, uuid, uuid, uuid[], integer[]
) to authenticated;
