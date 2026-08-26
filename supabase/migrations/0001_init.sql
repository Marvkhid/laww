-- Law Digest — Milestone 2, migration 0001
-- Core schema: tables, constraints, indexes, updated_at triggers.
-- Designed directly from src/lib/types.ts and src/lib/content/issue-39.ts —
-- every table/column maps to something already in the M1 application.

create extension if not exists "pgcrypto";

-- Shared trigger: keep updated_at current on every row update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- issues — one row per magazine issue (IssueMeta)
-- ─────────────────────────────────────────────────────────────────────────
create table public.issues (
  id uuid primary key default gen_random_uuid(),
  issue_number integer not null,
  season text not null,
  year integer not null,
  edition text not null,
  cover_image_url text,
  price_ngn text,
  price_uk text,
  price_us text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint issues_issue_number_key unique (issue_number)
);

create trigger set_updated_at before update on public.issues
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- practice_areas — the real Issue 40 CFP taxonomy (PracticeArea)
-- ─────────────────────────────────────────────────────────────────────────
create table public.practice_areas (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint practice_areas_slug_key unique (slug)
);

create trigger set_updated_at before update on public.practice_areas
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- contributors — unified people table: article authors AND editorial board
-- (Contributor + EditorialBoardMember are merged here, distinguished by
-- is_editorial_board, rather than kept as two overlapping tables)
-- ─────────────────────────────────────────────────────────────────────────
create table public.contributors (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  name text not null,
  credentials text,
  role text not null,
  bio text,
  photo_url text,
  is_editorial_board boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contributors_slug_key unique (slug)
);

create trigger set_updated_at before update on public.contributors
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- articles (Article)
-- on_cover     = appears in the real page-numbered "In This Issue" cover strip
-- featured     = appears in Featured Stories
-- is_editorial_insight = appears in Editorial Insights
-- body is jsonb, reserved for future Tiptap content (M3) — null until then
-- ─────────────────────────────────────────────────────────────────────────
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid references public.issues (id) on delete set null,
  practice_area_id uuid references public.practice_areas (id) on delete set null,
  slug text not null,
  title text not null,
  dek text,
  page_number integer,
  body jsonb,
  cover_image_url text,
  status text not null default 'draft',
  featured boolean not null default false,
  is_editorial_insight boolean not null default false,
  on_cover boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint articles_slug_key unique (slug),
  constraint articles_status_check check (status in ('draft', 'published'))
);

create index articles_issue_id_idx on public.articles (issue_id);
create index articles_practice_area_id_idx on public.articles (practice_area_id);
create index articles_status_idx on public.articles (status);

create trigger set_updated_at before update on public.articles
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- article_contributors — many-to-many join.
-- Real requirement, not speculative: the witness-preparation piece has two
-- named authors (Wakeley-Jones and Onafowokan), so a single author_id column
-- on articles would already be wrong for existing content.
-- ─────────────────────────────────────────────────────────────────────────
create table public.article_contributors (
  article_id uuid not null references public.articles (id) on delete cascade,
  contributor_id uuid not null references public.contributors (id) on delete cascade,
  author_order integer not null default 1,
  primary key (article_id, contributor_id)
);

create index article_contributors_contributor_id_idx
  on public.article_contributors (contributor_id);

-- ─────────────────────────────────────────────────────────────────────────
-- legal_updates (LegalUpdate) — Breaking Legal Updates hybrid model
-- ─────────────────────────────────────────────────────────────────────────
create table public.legal_updates (
  id uuid primary key default gen_random_uuid(),
  headline text not null,
  summary text,
  source_name text not null,
  source_url text not null,
  practice_area_id uuid references public.practice_areas (id) on delete set null,
  origin text not null default 'manual',
  status text not null default 'pending_review',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legal_updates_origin_check check (origin in ('auto_rss', 'manual')),
  constraint legal_updates_status_check
    check (status in ('pending_review', 'published', 'rejected'))
);

create index legal_updates_status_idx on public.legal_updates (status);
create index legal_updates_published_at_idx on public.legal_updates (published_at desc);

create trigger set_updated_at before update on public.legal_updates
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- sponsors — structural only; zero rows seeded (no real sponsors exist yet)
-- ─────────────────────────────────────────────────────────────────────────
create table public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  website_url text,
  tier text,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.sponsors
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- call_for_papers (CallForPapers) + its practice-area topics.
-- Topics reuse practice_areas rather than duplicating the name list, so the
-- taxonomy can't drift out of sync between the two features.
-- ─────────────────────────────────────────────────────────────────────────
create table public.call_for_papers (
  id uuid primary key default gen_random_uuid(),
  issue_number integer not null,
  issue_month text not null,
  deadline date not null,
  word_limit integer not null,
  contact_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint call_for_papers_issue_number_key unique (issue_number)
);

create trigger set_updated_at before update on public.call_for_papers
  for each row execute function public.set_updated_at();

create table public.call_for_papers_practice_areas (
  call_for_papers_id uuid not null references public.call_for_papers (id) on delete cascade,
  practice_area_id uuid not null references public.practice_areas (id) on delete cascade,
  primary key (call_for_papers_id, practice_area_id)
);
