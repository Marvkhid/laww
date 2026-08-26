-- Law Digest — Milestone 3, migration 0005
--
-- Same rationale as 0004: creating/editing a call_for_papers row and its
-- call_for_papers_practice_areas links are two tables, one logical admin
-- save. Separate client-side calls have no atomicity — a failure between
-- them would leave the CFP row saved with an inconsistent topic list.
-- These functions wrap both in one real Postgres transaction instead.
--
-- SECURITY INVOKER (explicit, matches 0004): runs with the caller's own
-- privileges, so it's fully governed by the existing 0002/0003 RLS
-- policies — verified present on both tables before writing this. No new
-- policy is added; these functions grant no privilege the caller didn't
-- already have via ordinary insert/update/delete.

create or replace function public.admin_create_call_for_papers_with_topics(
  p_issue_number integer,
  p_issue_month text,
  p_deadline date,
  p_word_limit integer,
  p_contact_email text,
  p_practice_area_ids uuid[]
)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_id uuid;
  v_i integer;
begin
  insert into public.call_for_papers (issue_number, issue_month, deadline, word_limit, contact_email)
  values (p_issue_number, p_issue_month, p_deadline, p_word_limit, p_contact_email)
  returning id into v_id;

  for v_i in 1 .. coalesce(array_length(p_practice_area_ids, 1), 0) loop
    insert into public.call_for_papers_practice_areas (call_for_papers_id, practice_area_id)
    values (v_id, p_practice_area_ids[v_i]);
  end loop;

  return v_id;
end;
$$;

create or replace function public.admin_update_call_for_papers_with_topics(
  p_id uuid,
  p_issue_number integer,
  p_issue_month text,
  p_deadline date,
  p_word_limit integer,
  p_contact_email text,
  p_practice_area_ids uuid[]
)
returns void
language plpgsql
security invoker
as $$
declare
  v_i integer;
begin
  update public.call_for_papers set
    issue_number = p_issue_number,
    issue_month = p_issue_month,
    deadline = p_deadline,
    word_limit = p_word_limit,
    contact_email = p_contact_email
  where id = p_id;

  if not found then
    raise exception 'call_for_papers % not found', p_id;
  end if;

  delete from public.call_for_papers_practice_areas where call_for_papers_id = p_id;

  for v_i in 1 .. coalesce(array_length(p_practice_area_ids, 1), 0) loop
    insert into public.call_for_papers_practice_areas (call_for_papers_id, practice_area_id)
    values (p_id, p_practice_area_ids[v_i]);
  end loop;
end;
$$;

grant execute on function public.admin_create_call_for_papers_with_topics(
  integer, text, date, integer, text, uuid[]
) to authenticated;

grant execute on function public.admin_update_call_for_papers_with_topics(
  uuid, integer, text, date, integer, text, uuid[]
) to authenticated;
