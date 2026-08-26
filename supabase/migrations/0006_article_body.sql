-- Law Digest — Milestone 3, migration 0006
--
-- Why this exists: articles.body (jsonb) has existed since 0001 but was
-- never wired into the write path — the migration-0004 RPC functions don't
-- accept it, so the admin form has had no way to persist article body
-- content. This migration only adds that missing parameter; the atomicity
-- rationale, SECURITY INVOKER, and EXECUTE-restricted-to-authenticated
-- posture are unchanged from 0004.
--
-- CREATE OR REPLACE FUNCTION does not let you add a parameter to an
-- existing signature — Postgres would treat it as a new, separate overload
-- and leave the old one in place. The old signatures are dropped first so
-- there's exactly one version of each function afterwards.

drop function if exists public.admin_create_article_with_contributors(
  text, text, text, integer, text, text, boolean, boolean, boolean, uuid, uuid, uuid[], integer[]
);

drop function if exists public.admin_update_article_with_contributors(
  uuid, text, text, text, integer, text, text, boolean, boolean, boolean, uuid, uuid, uuid[], integer[]
);

create function public.admin_create_article_with_contributors(
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
  p_contributor_orders integer[] default '{}'
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
    featured, is_editorial_insight, on_cover, issue_id, practice_area_id, body, published_at
  ) values (
    p_slug, p_title, p_dek, p_page_number, p_cover_image_url, p_status,
    p_featured, p_is_editorial_insight, p_on_cover, p_issue_id, p_practice_area_id, p_body,
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

create function public.admin_update_article_with_contributors(
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
  p_contributor_orders integer[] default '{}'
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
    body = p_body,
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
  text, text, text, integer, text, text, boolean, boolean, boolean, uuid, uuid, jsonb, uuid[], integer[]
) to authenticated;

grant execute on function public.admin_update_article_with_contributors(
  uuid, text, text, text, integer, text, text, boolean, boolean, boolean, uuid, uuid, jsonb, uuid[], integer[]
) to authenticated;
