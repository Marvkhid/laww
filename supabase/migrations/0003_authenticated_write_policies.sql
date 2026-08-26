-- Law Digest — Milestone 3, migration 0003
-- Extends RLS (does not touch 0001/0002) to allow authenticated writes.
--
-- There is no public sign-up flow anywhere in this app, and none is planned
-- — the only way to become an authenticated user is if an admin account is
-- created directly in the Supabase Dashboard (Authentication → Users). So
-- "authenticated" and "admin" are the same population here; these policies
-- check auth.role() = 'authenticated' rather than a separate is_admin flag/
-- table. Revisit if the app ever needs more than one authenticated role.
--
-- Public SELECT policies from 0002_rls_policies.sql are untouched — the
-- public site keeps reading exactly as it did before M3.

create policy "authenticated_write_issues"
  on public.issues for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_write_practice_areas"
  on public.practice_areas for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_write_contributors"
  on public.contributors for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_write_articles"
  on public.articles for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_write_article_contributors"
  on public.article_contributors for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_write_legal_updates"
  on public.legal_updates for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_write_sponsors"
  on public.sponsors for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_write_call_for_papers"
  on public.call_for_papers for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_write_call_for_papers_practice_areas"
  on public.call_for_papers_practice_areas for all
  to authenticated
  using (true)
  with check (true);
