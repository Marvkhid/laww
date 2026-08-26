-- Law Digest — Milestone 4, migration 0007
--
-- First table in this schema that a public, unauthenticated visitor needs
-- to INSERT into (every prior public policy has been read-only; every
-- prior write policy has been "authenticated" per 0003). RLS reflects that
-- split directly: anon may insert (and only insert — no anon select, so
-- the subscriber list can't be read back by a visitor), authenticated
-- (== admin, per 0003's note) gets full access for whenever a
-- subscriber-management view is built.
--
-- Scope is deliberately narrow per this milestone: collection only, no
-- campaign-sending fields, no external provider. email + created_at is
-- "the necessary subscription metadata."

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;

create policy "public_insert_newsletter_subscribers"
  on public.newsletter_subscribers for insert
  to anon
  with check (true);

create policy "authenticated_write_newsletter_subscribers"
  on public.newsletter_subscribers for all
  to authenticated
  using (true)
  with check (true);
