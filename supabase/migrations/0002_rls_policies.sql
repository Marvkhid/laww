-- Law Digest — Milestone 2, migration 0002
-- Row Level Security. Every table gets RLS enabled. Public (anon) gets
-- read-only access to appropriate rows. No insert/update/delete policy
-- exists for anon or authenticated anywhere in M2 — with no admin auth yet,
-- there is no legitimate public write path. The Supabase Dashboard SQL
-- Editor (used for this migration and the seed) runs with elevated
-- privileges that bypass RLS, which is how the initial data gets in.

alter table public.issues enable row level security;
alter table public.practice_areas enable row level security;
alter table public.contributors enable row level security;
alter table public.articles enable row level security;
alter table public.article_contributors enable row level security;
alter table public.legal_updates enable row level security;
alter table public.sponsors enable row level security;
alter table public.call_for_papers enable row level security;
alter table public.call_for_papers_practice_areas enable row level security;

-- Reference/editorial data with no draft concept in the current app:
-- fully public-readable.
create policy "public_read_issues"
  on public.issues for select
  using (true);

create policy "public_read_practice_areas"
  on public.practice_areas for select
  using (true);

create policy "public_read_contributors"
  on public.contributors for select
  using (true);

create policy "public_read_call_for_papers"
  on public.call_for_papers for select
  using (true);

create policy "public_read_call_for_papers_practice_areas"
  on public.call_for_papers_practice_areas for select
  using (true);

-- Junction table: no status column of its own. A visitor could see which
-- (article_id, contributor_id) pairs exist even for a draft article without
-- this being locked down further, but the draft article's actual title/dek/
-- body stays protected by the articles policy below — only the relationship,
-- not the content, is exposed. Acceptable for M2; revisit if that changes.
create policy "public_read_article_contributors"
  on public.article_contributors for select
  using (true);

-- Content with a real moderation/publish state: only published/active rows
-- are visible to the public API.
create policy "public_read_published_articles"
  on public.articles for select
  using (status = 'published');

create policy "public_read_published_legal_updates"
  on public.legal_updates for select
  using (status = 'published');

create policy "public_read_active_sponsors"
  on public.sponsors for select
  using (active = true);
